import smtplib
import ssl
import uuid
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str, text: str = None) -> dict:
    """
    Send email via SMTP. Returns {success, message_id} or {success, error}.
    Stateless — creates a new connection per call (safe for low-volume notification use).
    """
    if not settings.EMAIL_USER or not settings.EMAIL_PASSWORD:
        logger.warning("SMTP credentials not configured — email not sent.")
        return {"success": False, "error": "SMTP credentials not configured"}

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"AutoSphere Notifications <{settings.EMAIL_FROM or settings.EMAIL_USER}>"
        msg["To"] = to

        if text:
            msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))

        context = ssl.create_default_context()
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USER, to, msg.as_string())

        message_id = f"ns-{uuid.uuid4().hex[:12]}"
        logger.info(f"✅ Email sent | to={to} | subject={subject} | id={message_id}")
        return {"success": True, "message_id": message_id}

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ SMTP auth failed: {e}")
        return {"success": False, "error": "SMTP authentication failed"}
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP error to {to}: {e}")
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error(f"❌ Unexpected error sending to {to}: {e}")
        return {"success": False, "error": str(e)}
