import threading
from django.core.mail import send_mail
from django.conf import settings
import logging
logger = logging.getLogger(__name__)

def send_otp_email(email, otp_code):
    def _send():
        try:
            send_mail(
                subject="Email Verification",
                message=f"Your OTP is {otp_code}. It expires in 5 minutes.",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception:
            logger.exception("Failed to send OTP email to %s", email)

    threading.Thread(target=_send, daemon=True).start()