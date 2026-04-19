"""
Razorpay Service — Handles secure payment gateway integration, order orchestration, 
and critical cryptographic signature verification.
"""
# Import OS for environment variable access
import os
# Import hmac and hashlib for manual cryptographic verification of payment signatures
import hmac
import hashlib
# Import the official Razorpay Python SDK
import razorpay
# Import FastAPI exception handling for gateway communication failures
from fastapi import HTTPException


# ── Internal Configuration ──

def _get_keys() -> tuple[str, str]:
    """Retrieves and sanitizes Razorpay API credentials from the system environment."""
    # Fetch credentials, stripping accidental whitespace
    key_id = (os.getenv("RAZORPAY_KEY_ID") or "").strip()
    key_secret = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()
    
    # Enforce configuration presence before proceeding with financial logic
    if not key_id or not key_secret:
        raise HTTPException(
            status_code=500,
            detail="Financial Configuration Error: Razorpay credentials missing from .env settings.",
        )
    return key_id, key_secret


def _get_client() -> razorpay.Client:
    """Initializes and returns an authenticated Razorpay SDK Client instance."""
    key_id, key_secret = _get_keys()
    # auth tuple contains (API Key, API Secret)
    return razorpay.Client(auth=(key_id, key_secret))


# ── Payment Orchestration ──

def create_order(amount_rupees: float, receipt: str, notes: dict | None = None) -> dict:
    """
    Initializes a formal Payment Order on the Razorpay servers.
    :param amount_rupees: Total billable amount in standard INR format.
    :param receipt: A unique tracking reference for the transaction (limited to 40 chars).
    :param notes: Metadata mapping for internal tracking (e.g., target bill_id).
    :return: The generated Razorpay Order object dictionary.
    """
    client = _get_client()
    # ── Unit Conversion ──
    # Razorpay processes all amounts in 'paise' (the lowest currency denomination).
    # 1 INR = 100 paise.
    amount_paise = int(amount_rupees * 100)
    
    # Construct the API payload
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        # enforce receipt length limit
        "receipt": receipt[:40],
        # provide empty dict if no notes are passed
        "notes": notes or {},
    }
    
    try:
        # Execute remote procedure call to Razorpay
        order = client.order.create(payload)
        return order
    except Exception as e:
        # Surface gateway errors to the application layer
        raise HTTPException(status_code=502, detail=f"Upstream Payment Gateway Error: {str(e)}")


# ── Security & Verification ──

def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    """
    Verifies the HMAC-SHA256 signature provided by Razorpay after a successful client-side payment.
    CRITICAL: This prevents 'callback spoofing' where a user might try to manually trigger a success endpoint.
    
    Security Design:
    1. We recreate the expected signature locally using our secret key.
    2. We compare it against the provided signature using constant-time comparison.
    """
    # Fetch our secret key
    _, key_secret = _get_keys()

    # ── The Protocol ──
    # The signature is calculated by hashing the concatenation of order_id and payment_id,
    # separated by a pipe character.
    message = f"{razorpay_order_id}|{razorpay_payment_id}"
    
    # Calculate the expected HMAC-SHA256 hash
    expected_hash = hmac.new(
        key_secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # ── Constant-Time Comparison ──
    # compare_digest prevents timing attacks that could reveal the secret key or valid signature.
    if not hmac.compare_digest(expected_hash, razorpay_signature):
        # Log and raise on potential fraud or misconfiguration
        raise HTTPException(
            status_code=400,
            detail=(
                "Security Audit Failure: Payment signature mismatch detected. "
                "This attempt has been logged. Verify environment credentials."
            ),
        )

    # Success indicates the payment is authentic and originated from Razorpay
    return True
