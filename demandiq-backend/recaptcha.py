import os
import requests
from dotenv import load_dotenv

load_dotenv()

RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY")

def verify_recaptcha(token: str) -> bool:
    # Allow bypassing reCAPTCHA if DISABLE_RECAPTCHA is set to true in environment,
    # or if we receive a special "bypass_token" (which the frontend can send if needed)
    if os.getenv("DISABLE_RECAPTCHA") == "true" or token == "bypass_token":
        print("[RECAPTCHA] Bypassing verification as requested.")
        return True
        
    if not token:
        return False
    try:
        response = requests.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={
                "secret": RECAPTCHA_SECRET_KEY,
                "response": token
            },
            timeout=5
        )
        result = response.json()
        return result.get("success", False)
    except Exception:
        return False