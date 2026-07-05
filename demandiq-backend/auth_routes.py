import urllib.request
import json
import os
from recaptcha import verify_recaptcha
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from auth import (
    get_user_by_email, create_user, save_otp,
    verify_otp_code, mark_user_verified,
    update_user_password, verify_password,
    generate_otp, create_jwt_token, create_google_user
)
from email_service import send_otp_email

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Schemas ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    business_name: str = ""
    business_type: str = ""

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str
    purpose: str
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    recaptcha_token: str = ""

class GoogleLoginRequest(BaseModel):
    credential: str
    business_name: str = ""
    business_type: str = ""

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    email: EmailStr
    current_password: str
    new_password: str

class ResendOtpRequest(BaseModel):
    email: EmailStr
    purpose: str

# ── Routes ───────────────────────────────────────────────

@router.post("/register")
async def register(req: RegisterRequest, background_tasks: BackgroundTasks):
    # Check if user already exists
    existing = get_user_by_email(req.email)
    if existing:
        if existing.get("is_verified"):
            raise HTTPException(status_code=400, detail="Email already registered.")
        else:
            # User exists but not verified — resend OTP
            otp = generate_otp()
            save_otp(req.email, otp, "signup")
            background_tasks.add_task(send_otp_email, req.email, otp, "signup")
            return {"message": "OTP resent. Please verify your email.", "email": req.email}

    # Create user
    user = create_user(
        name=req.name,
        email=req.email,
        password=req.password,
        business_name=req.business_name,
        business_type=req.business_type
    )
    if not user:
        raise HTTPException(status_code=500, detail="User creation failed.")

    # Send OTP
    otp = generate_otp()
    save_otp(req.email, otp, "signup")
    background_tasks.add_task(send_otp_email, req.email, otp, "signup")

    return {"message": "OTP sent to your email.", "email": req.email}


@router.post("/verify-otp")
async def verify_otp(req: VerifyOtpRequest):
    valid = verify_otp_code(req.email, req.otp, req.purpose)
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    if req.purpose == "signup":
        mark_user_verified(req.email)
        user = get_user_by_email(req.email)
        token = create_jwt_token(str(user["id"]), user["email"])
        return {
            "message": "Email verified successfully.",
            "token": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "business_name": user.get("business_name", ""),
                "business_type": user.get("business_type", "")
            }
        }

    return {"message": "OTP verified successfully.", "email": req.email}


@router.post("/login")
async def login(req: LoginRequest, background_tasks: BackgroundTasks):
    if not verify_recaptcha(req.recaptcha_token):
        raise HTTPException(status_code=400, detail="reCAPTCHA verification failed. Please try again.")

    user = get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.get("is_verified"):
        # Resend OTP
        otp = generate_otp()
        save_otp(req.email, otp, "login")
        background_tasks.add_task(send_otp_email, req.email, otp, "login")
        raise HTTPException(status_code=403, detail="Email not verified. OTP resent.")

    # Send login OTP
    otp = generate_otp()
    save_otp(req.email, otp, "login")
    background_tasks.add_task(send_otp_email, req.email, otp, "login")

    return {"message": "OTP sent to your email.", "email": req.email}


@router.post("/verify-login")
async def verify_login(req: VerifyOtpRequest):
    valid = verify_otp_code(req.email, req.otp, "login")
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    user = get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    token = create_jwt_token(str(user["id"]), user["email"])
    return {
        "message": "Login successful.",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "business_name": user.get("business_name", ""),
            "business_type": user.get("business_type", "")
        }
    }


@router.post("/google-login")
async def google_login(req: GoogleLoginRequest):
    # Verify the credential with Google API
    token = req.credential
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
    
    try:
        req_obj = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req_obj, timeout=5) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid Google token. Verify your token or client connection.")

    # Validate Issuer
    iss = payload.get("iss")
    if iss not in ["accounts.google.com", "https://accounts.google.com"]:
        raise HTTPException(status_code=400, detail="Invalid token issuer.")

    # Validate Audience if set in env
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if client_id:
        aud = payload.get("aud")
        if aud != client_id:
            raise HTTPException(status_code=400, detail="Token audience mismatch.")

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided in Google account.")

    # Fetch user or create
    user = get_user_by_email(email)
    if not user:
        name = payload.get("name", email.split("@")[0])
        user = create_google_user(
            name=name,
            email=email,
            business_name=req.business_name,
            business_type=req.business_type
        )
    else:
        # User exists, make sure they are marked verified
        if not user.get("is_verified"):
            mark_user_verified(email)
            user = get_user_by_email(email)

    # Return JWT token
    token = create_jwt_token(str(user["id"]), user["email"])
    return {
        "message": "Login successful.",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "business_name": user.get("business_name", ""),
            "business_type": user.get("business_type", "")
        }
    }


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    user = get_user_by_email(req.email)
    if not user:
        # Security — don't reveal if email exists
        return {"message": "If this email exists, an OTP has been sent."}

    otp = generate_otp()
    save_otp(req.email, otp, "reset")
    background_tasks.add_task(send_otp_email, req.email, otp, "reset")

    return {"message": "If this email exists, an OTP has been sent.", "email": req.email}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    valid = verify_otp_code(req.email, req.otp, "reset")
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    success = update_user_password(req.email, req.new_password)
    if not success:
        raise HTTPException(status_code=500, detail="Password reset failed.")

    return {"message": "Password reset successfully."}


@router.post("/change-password")
async def change_password(req: ChangePasswordRequest):
    user = get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not verify_password(req.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    success = update_user_password(req.email, req.new_password)
    if not success:
        raise HTTPException(status_code=500, detail="Password change failed.")

    return {"message": "Password changed successfully."}


@router.post("/resend-otp")
async def resend_otp(req: ResendOtpRequest, background_tasks: BackgroundTasks):
    user = get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    otp = generate_otp()
    save_otp(req.email, otp, req.purpose)
    background_tasks.add_task(send_otp_email, req.email, otp, req.purpose)

    return {"message": "OTP resent successfully."}


@router.get("/me")
async def get_me(email: str):
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "business_name": user.get("business_name", ""),
        "business_type": user.get("business_type", ""),
        "is_verified": user.get("is_verified", False),
        "created_at": user.get("created_at", "")
    }