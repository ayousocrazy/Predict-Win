import threading
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def send_otp_email(email, otp_code):
    def _send():
        try:
            print(repr(settings.DEFAULT_FROM_EMAIL))
            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.DEFAULT_FROM_EMAIL,
                    "to": [email],
                    "subject": "Email Verification",
                    "text": f"Your OTP is {otp_code}. It expires in 5 minutes.",
                },
                timeout=10,
            )
            if not response.ok:
                logger.error(
                    "Resend rejected the request (%s): %s",
                    response.status_code,
                    response.text,
                )
            response.raise_for_status()
        except Exception:
            logger.exception("Failed to send OTP email to %s", email)

    threading.Thread(target=_send, daemon=True).start()