from django.shortcuts import render, redirect, get_list_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, logout
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
import random

from .models import User, OTP
from .forms import (
    SignupForm,
    OTPForm,
    LoginForm
)


def landingPage(request):
    context = {}
    return render(request, "main/landing.html", context)

def signupPage(request):
    if request.user.is_authenticated:
        return redirect("dashboard")
    
    signup_form = SignupForm()
    otp_form = OTPForm()

    # SEND OTP
    if request.method == "POST":
        if "send_otp" in request.POST:
            signup_form = SignupForm(request.POST)
            if signup_form.is_valid():
                email = signup_form.cleaned_data["email"]
                # Check existing email
                if User.objects.filter(email=email).exists():
                    messages.error(
                        request,
                        "Email already exists"
                    )
                    return redirect("signup")
                # Delete old OTPs for this email
                OTP.objects.filter(
                    email=email
                ).delete()
                otp_code = str(
                    random.randint(100000, 999999)
                )
                # Create new OTP
                OTP.objects.create(
                    email=email,
                    code=otp_code
                )
                # Save signup data in session
                request.session["signup_data"] = {
                    "username": signup_form.cleaned_data["username"],
                    "full_name": signup_form.cleaned_data["full_name"],
                    "email": email,
                    "password": signup_form.cleaned_data["password"],
                }
                # Send email
                send_mail(
                    subject="Email Verification",
                    message=(
                        f"Your OTP is {otp_code}. "
                        f"It expires in 5 minutes."
                    ),
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[email],
                    fail_silently=False,
                )
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
                signup_data = request.session.get(
                    "signup_data"
                )
                email = signup_data["email"]
                otp = OTP.objects.filter(
                    email=email,
                    code=entered_otp
                ).first()
                if not otp:
                    messages.error(
                        request,
                        "Invalid OTP"
                    )
                    return render(
                        request,
                        "main/auth/signup.html",
                        {
                            "signup_form": SignupForm(),
                            "otp_form": otp_form,
                            "show_otp_modal": True,
                        }
                    )
                # Check expiration
                if otp.is_expired():
                    otp.delete()
                    messages.error(
                        request,
                        "OTP expired. Please resend OTP."
                    )
                    return redirect("signup")
                # Create user
                user = User.objects.create_user(
                    username=signup_data["username"],
                    full_name=signup_data["full_name"],
                    email=signup_data["email"],
                    password=signup_data["password"],
                )
                user.email_verified = True
                user.save()
                # Delete OTP after successful verification
                otp.delete()
                # Clear session
                request.session.pop(
                    "signup_data",
                    None
                )
                login(request, user)
                messages.success(
                    request,
                    "Account created successfully!"
                )
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
        {
            "form": form
        }
    )

@login_required(login_url='login')
def logoutPage(request):
    logout(request)
    return redirect('landingPage')

@login_required(login_url='login')
def dashboardPage(request):
    context = {}
    return render(request, 'main/dashboard.html', context)