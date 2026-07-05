import os
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
from supabase import create_client, Client
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

# ── Config ───────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 1440))

if not SUPABASE_URL or not SUPABASE_KEY or not JWT_SECRET:
    raise ValueError("Missing critical configuration in environment variables: SUPABASE_URL, SUPABASE_KEY, or JWT_SECRET")

# ── Clients ──────────────────────────────────────────────
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# ── Password utils ───────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ── OTP utils ────────────────────────────────────────────
def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

# ── JWT utils ────────────────────────────────────────────
def create_jwt_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

# ── Auth dependency ──────────────────────────────────────
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"user_id": user_id, "email": email}

# ── Database operations ──────────────────────────────────
def get_user_by_email(email: str) -> Optional[dict]:
    try:
        res = supabase.table("users").select("*").eq("email", email).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None
    except Exception:
        return None

def create_user(name: str, email: str, password: str, business_name: str = "", business_type: str = "") -> dict:
    password_hash = hash_password(password)
    try:
        res = supabase.table("users").insert({
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "business_name": business_name,
            "business_type": business_type,
            "is_verified": False
        }).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"User creation failed: {str(e)}")

def save_otp(email: str, otp: str, purpose: str) -> bool:
    try:
        # Delete old OTPs for this email and purpose
        supabase.table("otp_codes").delete().eq("email", email).eq("purpose", purpose).execute()
        # Save new OTP — expires in 10 minutes
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        supabase.table("otp_codes").insert({
            "email": email,
            "otp": otp,
            "purpose": purpose,
            "expires_at": expires_at,
            "used": False
        }).execute()
        return True
    except Exception:
        return False

def verify_otp_code(email: str, otp: str, purpose: str) -> bool:
    try:
        res = supabase.table("otp_codes").select("*").eq("email", email).eq("otp", otp).eq("purpose", purpose).eq("used", False).execute()
        if not res.data:
            return False
        record = res.data[0]
        # Check expiry
        expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return False
        # Mark as used
        supabase.table("otp_codes").update({"used": True}).eq("id", record["id"]).execute()
        return True
    except Exception:
        return False

def mark_user_verified(email: str) -> bool:
    try:
        supabase.table("users").update({"is_verified": True}).eq("email", email).execute()
        return True
    except Exception:
        return False

def update_user_password(email: str, new_password: str) -> bool:
    try:
        password_hash = hash_password(new_password)
        supabase.table("users").update({"password_hash": password_hash}).eq("email", email).execute()
        return True
    except Exception:
        return False

def create_google_user(name: str, email: str, business_name: str = "", business_type: str = "") -> dict:
    # Google users don't use passwords, but we store a random high-entropy hash for database compliance
    random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    password_hash = hash_password(random_password)
    try:
        res = supabase.table("users").insert({
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "business_name": business_name,
            "business_type": business_type,
            "is_verified": True
        }).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google User creation failed: {str(e)}")