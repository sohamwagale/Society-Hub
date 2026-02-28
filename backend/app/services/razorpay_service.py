"""
Razorpay service: initializes the client from env variables and provides
helpers for order creation and payment signature verification.
"""
import os
import hmac
import hashlib
import razorpay
from fastapi import HTTPException


def _get_keys() -> tuple[str, str]:
    """Read and sanitize Razorpay credentials from environment."""
    key_id = (os.getenv("RAZORPAY_KEY_ID") or "").strip()
    key_secret = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()
    if not key_id or not key_secret:
        raise HTTPException(
            status_code=500,
            detail="Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env",
        )
    return key_id, key_secret


def _get_client() -> razorpay.Client:
    key_id, key_secret = _get_keys()
    return razorpay.Client(auth=(key_id, key_secret))


def create_order(amount_rupees: float, receipt: str, notes: dict | None = None) -> dict:
    """
    Creates a Razorpay order.
    :param amount_rupees: Amount in Indian Rupees (will be converted to paise internally).
    :param receipt: A short receipt identifier string (<= 40 chars).
    :param notes: Optional dict of key-value metadata.
    :return: The full Razorpay order dict including `id`, `amount`, `currency`.
    """
    client = _get_client()
    amount_paise = int(amount_rupees * 100)  # Razorpay requires paise (1 INR = 100 paise)
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt[:40],  # Razorpay limit
        "notes": notes or {},
    }
    try:
        order = client.order.create(payload)
        return order
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {str(e)}")


def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    """
    Verifies the HMAC-SHA256 signature that Razorpay sends to the client after a successful payment.
    This is the primary security check – never mark a bill as paid without calling this.

    We implement the HMAC check manually in addition to using the SDK, because:
    - Some versions of the razorpay Python SDK have import issues with SignatureVerificationError
    - Manual verification ensures we get a clear error message on failure
    """
    _, key_secret = _get_keys()

    # The Razorpay signature is HMAC-SHA256 of "{order_id}|{payment_id}" using the key_secret
    message = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected_signature = hmac.new(
        key_secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, razorpay_signature):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Payment signature verification failed. "
                f"This could mean the payment was tampered with, or your RAZORPAY_KEY_SECRET "
                f"in .env does not match the key used for this order. "
                f"order_id={razorpay_order_id}"
            ),
        )

    return True
