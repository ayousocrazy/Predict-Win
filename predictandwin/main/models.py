import uuid
from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager
)

from django.db import models
from django.utils import timezone
from datetime import timedelta


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
    points = models.PositiveIntegerField(
        default=0
    )
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