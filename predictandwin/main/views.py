from django.shortcuts import render, redirect, get_list_or_404, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, logout
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
import random
from django.utils import timezone
from datetime import timedelta
from django.http import Http404, JsonResponse
from django.views.decorators.http import require_GET
from django.db import transaction, IntegrityError

from .models import User, OTP, Match, Prediction
from .forms import (
    SignupForm,
    OTPForm,
    LoginForm
)
from .tasks import send_otp_email


# How long a user must wait before requesting another OTP for the same email.
OTP_RESEND_COOLDOWN_SECONDS = 60


@require_GET
def check_username(request):
    username = request.GET.get("username", "").strip()
    available = False
    if username and len(username) >= 3:
        available = not User.objects.filter(username__iexact=username).exists()
    return JsonResponse({"available": available})


@require_GET
def check_email(request):
    email = request.GET.get("email", "").strip()
    available = False
    if email:
        available = not User.objects.filter(email__iexact=email).exists()
    return JsonResponse({"available": available})


def landingPage(request):
    context = {}
    return render(request, "main/landing.html", context)


def signupPage(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    signup_form = SignupForm()
    otp_form = OTPForm()

    if request.method == "POST":
        # SEND OTP
        if "send_otp" in request.POST:
            signup_form = SignupForm(request.POST)
            if signup_form.is_valid():
                email = signup_form.cleaned_data["email"]

                if User.objects.filter(email=email).exists():
                    messages.error(request, "Email already exists")
                    return redirect("signup")

                # --- Rate limit OTP requests per email (DB-backed) ---
                # Instead of a Redis throttle key, we just look at the most
                # recent OTP row for this email and check its age. This is
                # covered by the same atomic block as the delete/create
                # below, so a burst of concurrent requests still only lets
                # one through per cooldown window.
                otp_code = str(random.randint(100000, 999999))

                with transaction.atomic():
                    recent_otp = (
                        OTP.objects.select_for_update()
                        .filter(email=email)
                        .order_by("-created_at")
                        .first()
                    )

                    if recent_otp and (
                        timezone.now() - recent_otp.created_at
                        < timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS)
                    ):
                        messages.error(
                            request,
                            "Please wait a minute before requesting another OTP."
                        )
                        return redirect("signup")

                    OTP.objects.filter(email=email).delete()
                    OTP.objects.create(email=email, code=otp_code)

                request.session["signup_data"] = {
                    "username": signup_form.cleaned_data["username"],
                    "full_name": signup_form.cleaned_data["full_name"],
                    "email": email,
                    "password": signup_form.cleaned_data["password"],
                }

                # Send synchronously now that there's no queue/worker.
                # If this starts feeling slow, the right fix is to move it
                # to a background thread or a task runner later, not to
                # bring caching back for it.
                send_otp_email(email, otp_code)

                return render(
                    request,
                    "main/auth/signup.html",
                    {
                        "signup_form": signup_form,
                        "otp_form": otp_form,
                        "show_otp_modal": True,
                    }
                )

        # VERIFY OTP
        elif "verify_otp" in request.POST:
            otp_form = OTPForm(request.POST)
            if otp_form.is_valid():
                entered_otp = otp_form.cleaned_data["otp"]
                signup_data = request.session.get("signup_data")

                if not signup_data:
                    messages.error(request, "Signup session expired. Please start again.")
                    return redirect("signup")

                email = signup_data["email"]

                try:
                    with transaction.atomic():
                        # Lock the OTP row so two concurrent verify requests
                        # can't both succeed against the same code.
                        otp = (
                            OTP.objects.select_for_update()
                            .filter(email=email, code=entered_otp)
                            .first()
                        )

                        if not otp:
                            messages.error(request, "Invalid OTP")
                            return render(
                                request,
                                "main/auth/signup.html",
                                {
                                    "signup_form": SignupForm(),
                                    "otp_form": otp_form,
                                    "show_otp_modal": True,
                                }
                            )

                        if otp.is_expired():
                            otp.delete()
                            messages.error(request, "OTP expired. Please resend OTP.")
                            return redirect("signup")

                        # Delete OTP up front (inside the same transaction) so
                        # a second concurrent request sees "no OTP" instead of
                        # racing to create a duplicate user.
                        otp.delete()

                        user = User.objects.create_user(
                            username=signup_data["username"],
                            full_name=signup_data["full_name"],
                            email=signup_data["email"],
                            password=signup_data["password"],
                        )
                        user.email_verified = True
                        user.save()

                except IntegrityError:
                    # Username/email got taken by a concurrent signup between
                    # form validation and insert — DB unique constraint is the
                    # real source of truth here, this is just a clean failure path.
                    messages.error(
                        request,
                        "That username or email was just taken. Please try again."
                    )
                    return redirect("signup")

                request.session.pop("signup_data", None)
                login(request, user)
                messages.success(request, "Account created successfully!")
                return redirect("dashboard")

    return render(
        request,
        "main/auth/signup.html",
        {
            "signup_form": signup_form,
            "otp_form": otp_form,
        }
    )


def loginPage(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    form = LoginForm()
    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            user = form.cleaned_data["user"]
            login(request, user)
            return redirect("dashboard")
    return render(
        request,
        "main/auth/login.html",
        {"form": form}
    )


@login_required(login_url='login')
def logoutPage(request):
    logout(request)
    return redirect('landingPage')


@login_required(login_url='login')
def dashboardPage(request):
    upcoming_matches = Match.objects.filter(
        kickoff__gt=timezone.now()
    ).order_by('kickoff')
    past_matches = Match.objects.filter(
        kickoff__lt=timezone.now()
    ).order_by('-kickoff')

    context = {
        'upcoming_matches': upcoming_matches,
        'past_matches': past_matches,
        'active_page': "dashboard",
    }

    return render(request, 'main/dashboard.html', context)


@login_required(login_url='login')
def matchPage(request, pk):
    match = get_object_or_404(Match, pk=pk)

    if timezone.now() >= match.prediction_deadline or match.is_locked:
        messages.error(request, "Prediction for this match is closed.")
        return redirect("dashboard")

    existing_prediction = Prediction.objects.filter(
        user=request.user,
        match=match
    ).first()

    already_predicted = existing_prediction is not None

    if request.method == "POST":
        if already_predicted:
            messages.error(request, "You already predicted this match.")
            return redirect("match", pk=match.id)

        winner = request.POST.get("winner")
        full_time_country1 = request.POST.get("full_time_country1")
        full_time_country2 = request.POST.get("full_time_country2")
        half_time_country1 = request.POST.get("half_time_country1")
        half_time_country2 = request.POST.get("half_time_country2")
        goals_country1 = request.POST.get("goals_country1")
        goals_country2 = request.POST.get("goals_country2")
        both_teams_to_score = request.POST.get("both_teams_to_score")
        first_team_to_score = request.POST.get("first_team_to_score")
        winning_method = request.POST.get("winning_method")
        man_of_the_match = request.POST.get("man_of_the_match")

        has_prediction = any([
            winner, full_time_country1, full_time_country2,
            half_time_country1, half_time_country2,
            goals_country1, goals_country2,
            both_teams_to_score, first_team_to_score,
            winning_method, man_of_the_match,
        ])

        if not has_prediction:
            messages.error(request, "Please make at least one prediction.")
            return redirect("match", pk=match.id)

        # IMPORTANT: this requires a unique_together = ('user', 'match')
        # constraint on the Prediction model (migration needed — see note
        # below the file). The check above is just a fast-path UX check;
        # the DB constraint is what actually prevents duplicates under
        # concurrent requests (double-click, two tabs, etc).
        try:
            with transaction.atomic():
                Prediction.objects.create(
                    user=request.user,
                    match=match,
                    predicted_winner=winner if winner else "",
                    full_time_country1=full_time_country1 if full_time_country1 else None,
                    full_time_country2=full_time_country2 if full_time_country2 else None,
                    half_time_country1=half_time_country1 if half_time_country1 else None,
                    half_time_country2=half_time_country2 if half_time_country2 else None,
                    goals_country1=goals_country1 if goals_country1 else None,
                    goals_country2=goals_country2 if goals_country2 else None,
                    both_teams_scored=(
                        True if both_teams_to_score == "yes"
                        else False if both_teams_to_score == "no"
                        else None
                    ),
                    first_team_to_score=first_team_to_score if first_team_to_score else "",
                    winning_method=winning_method if winning_method else "",
                    man_of_the_match=man_of_the_match if man_of_the_match else "",
                )
        except IntegrityError:
            messages.error(request, "You already predicted this match.")
            return redirect("match", pk=match.id)

        messages.success(request, "Prediction submitted successfully.")
        return redirect("match", pk=match.id)

    existing_prediction_data = None
    if existing_prediction:
        existing_prediction_data = {
            "winner": existing_prediction.predicted_winner or None,
            "full_time_country1": existing_prediction.full_time_country1,
            "full_time_country2": existing_prediction.full_time_country2,
            "half_time_country1": existing_prediction.half_time_country1,
            "half_time_country2": existing_prediction.half_time_country2,
            "goals_country1": existing_prediction.goals_country1,
            "goals_country2": existing_prediction.goals_country2,
            "both_teams_to_score": (
                "yes" if existing_prediction.both_teams_scored is True
                else "no" if existing_prediction.both_teams_scored is False
                else None
            ),
            "first_team_to_score": existing_prediction.first_team_to_score or None,
            "winning_method": existing_prediction.winning_method or None,
            "man_of_the_match": existing_prediction.man_of_the_match or None,
        }

    context = {
        "match": match,
        "already_predicted": already_predicted,
        "existing_prediction": existing_prediction,
        "existing_prediction_data": existing_prediction_data,
    }

    return render(request, "main/predict.html", context)


@login_required(login_url='login')
def leaderboardPage(request):
    users = User.objects.order_by('-points', 'wrong_prediction', 'username')

    leaderboard = []
    current_rank = 0
    previous_key = None

    for user in users:
        key = (user.points, user.wrong_prediction)
        if key != previous_key:
            current_rank += 1
            previous_key = key

        leaderboard.append({
            "rank": current_rank,
            "username": user.username,
            "full_name": user.full_name,
            "points": user.points,
            "wrong_prediction": user.wrong_prediction,
            "is_current_user": user.id == request.user.id,
        })

    context = {
        "leaderboard": leaderboard,
        "podium": leaderboard[:3],
        'active_page': "leaderboard",
    }
    return render(request, 'main/leaderboard.html', context)


def match_result(request, match_id):
    match = get_object_or_404(
        Match.objects.select_related(
            "country1",
            "country2",
            "result",
            "result__first_team_to_score",
        ),
        pk=match_id,
    )
    result = getattr(match, "result", None)

    if result is None or not result.result_published:
        raise Http404("Result not available yet.")

    context = {
        "match": match,
        "result": result,
    }
    return render(request, "main/result.html", context)