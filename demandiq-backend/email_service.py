import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

fm = FastMail(conf)

async def send_otp_email(email: str, otp: str, purpose: str):
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

    message = MessageSchema(
        subject=subject,
        recipients=[email],
        body=body,
        subtype="html"
    )

    await fm.send_message(message)