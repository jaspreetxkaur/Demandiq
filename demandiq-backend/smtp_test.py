import os
import smtplib
import ssl
from fastapi import APIRouter

router = APIRouter()

@router.get("/smtp-test")
async def smtp_test():
    try:
        server = smtplib.SMTP_SSL(
            "smtp.gmail.com",
            465,
            context=ssl.create_default_context(),
            timeout=15
        )
        server.login(
            os.getenv("MAIL_USERNAME"),
            os.getenv("MAIL_PASSWORD")
        )
        server.quit()
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}