import uuid
from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager
)

from django.db import models
from django.utils import timezone
from datetime import timedelta
from api.models import Country


# Custom User Manager
class CustomUserManager(BaseUserManager):
    def create_user(
        self,
        username,
        full_name,
        email,
        password=None,
        **extra_fields
    ):
        if not email:
            raise ValueError(
                "Email is required."
            )
        email = self.normalize_email(email)
        user = self.model(
            username=username,
            full_name=full_name,
            email=email,
            **extra_fields
        )
        user.set_password(password)
        user.full_clean()
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        username,
        full_name,
        email,
        password=None,
        **extra_fields
    ):

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(
                "Superuser must have is_staff=True"
            )

        if extra_fields.get("is_superuser") is not True:
            raise ValueError(
                "Superuser must have is_superuser=True"
            )

        return self.create_user(
            username=username,
            full_name=full_name,
            email=email,
            password=password,
            **extra_fields
        )

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    username = models.CharField(
        max_length=50,
        unique=True
    )
    full_name = models.CharField(
        max_length=150
    )
    email = models.EmailField(
        unique=True
    )
    email_verified = models.BooleanField(
        default=False
    )
    points = models.DecimalField(max_digits=10, decimal_places=1, default=0)
    points_of_rd16 = models.DecimalField(max_digits=10, decimal_places=1, default=0)
    wrong_prediction = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(
        default=True
    )
    is_staff = models.BooleanField(
        default=False
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    objects = CustomUserManager()
    USERNAME_FIELD = "username"

    REQUIRED_FIELDS = [
        "full_name",
        "email",
    ]

    @property
    def initials(self):
        if not self.full_name:
            return "U"

        parts = self.full_name.split()
        if len(parts) == 1:
            return parts[0][0].upper()

        return (parts[0][0] + parts[-1][0]).upper()

    def __str__(self):
        return self.username

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]


# OTP Model
class OTP(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    email = models.EmailField()
    code = models.CharField(
        max_length=6
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def is_expired(self):
        expiry_time = self.created_at + timedelta(minutes=5)
        return timezone.now() > expiry_time

    def __str__(self):
        return f"{self.email} - {self.code}"
    
class Match(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    STAGES = [
        ("GRP", "Group Stage"),
        ("R32", "Round of 32"),
        ("R16", "Round of 16"),
        ("QF", "Quarter Final"),
        ("SF", "Semi Final"),
        ("3RD", "Third Place"),
        ("FIN", "Final"),
    ]
    country1 = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="country1"
    )
    country2 = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="country2"
    )

    kickoff = models.DateTimeField()
    stage = models.CharField(
        max_length=5,
        choices=STAGES,
        default="GRP"
    )
    prediction_deadline = models.DateTimeField()
    is_locked = models.BooleanField(default=False)
    class Meta:
        ordering = ["kickoff"]
    def __str__(self):
        return f"{self.country1} vs {self.country2}"
    
class Result(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    WINNING_METHOD = [
        ("90", "90 Minutes"),
        ("ET", "Extra Time"),
        ("PEN", "Penalty Shootout"),
    ]
    match = models.OneToOneField(
        Match,
        on_delete=models.CASCADE,
        related_name="result"
    )
    full_time_country1 = models.PositiveSmallIntegerField(default=0)
    full_time_country2 = models.PositiveSmallIntegerField(default=0)

    half_time_country1 = models.PositiveSmallIntegerField(default=0)
    half_time_country2 = models.PositiveSmallIntegerField(default=0)

    first_team_to_score = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    goal_in_first_15 = models.BooleanField(default=False)
    both_teams_scored = models.BooleanField(default=False)
    winning_method = models.CharField(
        max_length=3,
        choices=WINNING_METHOD,
        default="90"
    )
    man_of_the_match = models.CharField(
        max_length=100,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    goals_first_half = models.PositiveSmallIntegerField(default=0)  # combined, both teams
    red_card = models.BooleanField(default=False)
    yellow_cards = models.PositiveSmallIntegerField(default=0)
    penalty_awarded = models.BooleanField(default=False)
    own_goal = models.BooleanField(default=False)
    total_corners = models.PositiveSmallIntegerField(default=0)
    team_most_corners = models.ForeignKey(
        Country, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="+"
    )

    result_published = models.BooleanField(default=False)
    points_awarded = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.match}"
    
class Prediction(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    goals_country1 = models.PositiveSmallIntegerField(null=True, blank=True)
    goals_country2 = models.PositiveSmallIntegerField(null=True, blank=True)
    WINNING_METHOD = [
        ("90", "90 Minutes"),
        ("ET", "Extra Time"),
        ("PEN", "Penalty Shootout"),
    ]
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE
    )
    predicted_winner = models.CharField(
        max_length=20,
        blank=True
    )
    full_time_country1 = models.PositiveSmallIntegerField(
        null=True,
        blank=True
    )
    full_time_country2 = models.PositiveSmallIntegerField(
        null=True,
        blank=True
    )
    half_time_country1 = models.PositiveSmallIntegerField(
        null=True,
        blank=True
    )
    half_time_country2 = models.PositiveSmallIntegerField(
        null=True,
        blank=True
    )
    first_team_to_score = models.CharField(
        max_length=20,
        blank=True
    )
    goal_in_first_15 = models.BooleanField(
        null=True,
        blank=True
    )
    both_teams_scored = models.BooleanField(
        null=True,
        blank=True
    )
    winning_method = models.CharField(
        max_length=3,
        choices=WINNING_METHOD,
        blank=True
    )
    man_of_the_match = models.CharField(
        max_length=100,
        blank=True
    )
    predicted_goals_first_half = models.PositiveSmallIntegerField(null=True, blank=True)
    predicted_total_goals = models.PositiveSmallIntegerField(null=True, blank=True)
    predicted_red_card = models.BooleanField(null=True, blank=True)
    predicted_yellow_cards = models.PositiveSmallIntegerField(null=True, blank=True)
    predicted_penalty_awarded = models.BooleanField(null=True, blank=True)
    predicted_own_goal = models.BooleanField(null=True, blank=True)
    predicted_total_corners = models.PositiveSmallIntegerField(null=True, blank=True)
    predicted_team_most_corners = models.CharField(max_length=20, blank=True)  # team name or "draw"
    predicted_winning_margin = models.CharField(
        max_length=2,
        choices=[("1", "1 goal"), ("2", "2 goals"), ("3", "3+ goals")],
        blank=True,
    )
    points_earned = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'match')
        ordering = ['user', '-submitted_at']

    def __str__(self):
        return f"{self.user} - {self.match}"
