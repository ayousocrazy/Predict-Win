from django.core.mail import send_mail
from django.conf import settings


def send_otp_email(email, otp_code):
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