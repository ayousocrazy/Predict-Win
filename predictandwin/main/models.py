import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.core.exceptions import ValidationError

# Custom User Manager
class CustomUserManager(BaseUserManager):

    def create_user(
        self,
        username,
        full_name,
        email=None,
        phone_number=None,
        password=None,
        **extra_fields
    ):

        if not email and not phone_number:
            raise ValueError(
                "Either email or phone number is required."
            )

        if email:
            email = self.normalize_email(email)

        user = self.model(
            username=username,
            full_name=full_name,
            email=email,
            phone_number=phone_number,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(
        self,
        username,
        full_name,
        email=None,
        phone_number=None,
        password=None,
        **extra_fields
    ):

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        return self.create_user(
            username=username,
            full_name=full_name,
            email=email,
            phone_number=phone_number,
            password=password,
            **extra_fields
        )


# Custom User Model
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
        unique=True,
        blank=True,
        null=True
    )
    phone_number = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True
    )
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)

    points = models.PositiveIntegerField(default=0)

    # Django auth fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "username"

    REQUIRED_FIELDS = ["full_name"]

    def clean(self):
        super().clean()

        if not self.email and not self.phone_number:
            raise ValidationError(
                "Either email or phone number is required."
            )

    def __str__(self):
        return self.username
