import os
import httpx
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=465,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=True,
    USE_CREDENTIALS=True,
)

fm = FastMail(conf)

async def send_otp_email(email: str, otp: str, purpose: str):
    # CRITICAL: Always print the OTP to console so the owner can read it from the Render dashboard logs
    print(f"[OTP SYSTEM LOG] Generated OTP for {email} ({purpose}): {otp}", flush=True)

    if purpose == "signup":
        subject = "DemandIQ — Verify Your Email"
        body = f"""
        <div style="font-family:Inter,sans-serif;background:#080808;color:#fff;padding:40px;max-width:480px;margin:0 auto;border-radius:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
                <div style="width:24px;height:24px;background:#fff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#000;font-weight:900;">D</div>
                <span style="font-size:16px;font-weight:700;">DemandIQ</span>
            </div>
            <h2 style="font-size:22px;font-weight:800;margin-bottom:8px;letter-spacing:-0.5px;">Verify your email</h2>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin-bottom:28px;">
                Use the OTP below to complete your DemandIQ signup. This code expires in 10 minutes.
            </p>
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
                <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#fff;">{otp}</div>
            </div>
            <p style="color:rgba(255,255,255,0.3);font-size:12px;">If you didn't request this, ignore this email.</p>
        </div>
        """
    elif purpose == "login":
        subject = "DemandIQ — Login OTP"
        body = f"""
        <div style="font-family:Inter,sans-serif;background:#080808;color:#fff;padding:40px;max-width:480px;margin:0 auto;border-radius:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
                <div style="width:24px;height:24px;background:#fff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#000;font-weight:900;">D</div>
                <span style="font-size:16px;font-weight:700;">DemandIQ</span>
            </div>
            <h2 style="font-size:22px;font-weight:800;margin-bottom:8px;letter-spacing:-0.5px;">Your login OTP</h2>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin-bottom:28px;">
                Use this OTP to sign in to DemandIQ. Expires in 10 minutes.
            </p>
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
                <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#fff;">{otp}</div>
            </div>
            <p style="color:rgba(255,255,255,0.3);font-size:12px;">If you didn't request this, ignore this email.</p>
        </div>
        """
    elif purpose == "reset":
        subject = "DemandIQ — Reset Your Password"
        body = f"""
        <div style="font-family:Inter,sans-serif;background:#080808;color:#fff;padding:40px;max-width:480px;margin:0 auto;border-radius:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:32px;">
                <div style="width:24px;height:24px;background:#fff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#000;font-weight:900;">D</div>
                <span style="font-size:16px;font-weight:700;">DemandIQ</span>
            </div>
            <h2 style="font-size:22px;font-weight:800;margin-bottom:8px;letter-spacing:-0.5px;">Reset your password</h2>
            <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.7;margin-bottom:28px;">
                Use this OTP to reset your DemandIQ password. Expires in 10 minutes.
            </p>
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
                <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#fff;">{otp}</div>
            </div>
            <p style="color:rgba(255,255,255,0.3);font-size:12px;">If you didn't request this, ignore this email.</p>
        </div>
        """
    else:
        subject = "DemandIQ — OTP Code"
        body = f"<p>Your OTP is: <b>{otp}</b>. Expires in 10 minutes.</p>"

    # 1. Try sending via Resend API if API Key is configured in environment
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        print("[EMAIL] Attempting HTTP send via Resend API...")
        # If there's no domain setup on Resend yet, we fallback to Resend's default sender domain
        sender_email = os.getenv("MAIL_FROM") or "onboarding@resend.dev"
        if "onboarding@resend.dev" in sender_email and email != "delivered@resend.dev":
            # For testing with unverified domains, Resend requires sending to the account owner.
            # However, we'll try sending anyway and let the error show in logs if the user is using standard emails.
            pass
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": f"DemandIQ <{sender_email}>",
                        "to": [email],
                        "subject": subject,
                        "html": body
                    },
                    timeout=10.0
                )
                if res.status_code in (200, 201):
                    print(f"[EMAIL] Success sending email via Resend API to {email} (ID: {res.json().get('id')})")
                    return
                else:
                    print(f"[EMAIL] Resend API error (Status {res.status_code}): {res.text}")
        except Exception as e:
            print(f"[EMAIL] Exception occurred during Resend API send: {str(e)}")

    # 2. Fallback to standard SMTP (which works locally but may fail/timeout on Render)
    print("[EMAIL] Attempting standard SMTP send...")
    message = MessageSchema(
        subject=subject,
        recipients=[email],
        body=body,
        subtype="html"
    )
    
    try:
        await fm.send_message(message)
        print(f"[EMAIL] Success sending SMTP email to {email}")
    except Exception as e:
        print(f"[EMAIL] ERROR: SMTP sending failed to {email}. Reason: {str(e)}")