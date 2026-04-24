from fastapi import APIRouter, Header, HTTPException, status
from app import templates as tmpl
from app.email_client import send_email
from app.schemas import (
    EmailResponse, GenericEmailRequest,
    WelcomeRequest, EmailVerificationRequest, PasswordResetRequest, PasswordChangedRequest,
    OrderConfirmationRequest, OrderStatusRequest,
    VendorRegistrationRequest, VendorDecisionRequest,
    VendorVerificationApprovedRequest, VendorVerificationFailedRequest,
    ProductApprovedRequest, ProductRejectedRequest, NewOrderRequest,
)
from app.config import settings

router = APIRouter()


def _require_api_key(x_api_key: str = Header(None)):
    if x_api_key != settings.API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


def _respond(result: dict) -> EmailResponse:
    if result.get("success"):
        return EmailResponse(success=True, message="Email sent", message_id=result.get("message_id"))
    return EmailResponse(success=False, message=result.get("error", "Failed to send email"))


# ── Generic ────────────────────────────────────────────────────────────────────

@router.post("/send", response_model=EmailResponse, summary="Send a generic email")
async def send_generic(req: GenericEmailRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    result = send_email(req.to, req.subject, req.html, req.text)
    return _respond(result)


# ── Auth ───────────────────────────────────────────────────────────────────────

@router.post("/welcome", response_model=EmailResponse, summary="Send welcome email")
async def send_welcome(req: WelcomeRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.welcome(req.user_name, req.user_role)
    return _respond(send_email(req.to, **content))


@router.post("/email-verification", response_model=EmailResponse, summary="Send email OTP")
async def send_email_verification(req: EmailVerificationRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.email_verification(req.user_name, req.otp)
    return _respond(send_email(req.to, **content))


@router.post("/password-reset", response_model=EmailResponse, summary="Send password reset OTP")
async def send_password_reset(req: PasswordResetRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.password_reset(req.user_name, req.reset_token, req.reset_url)
    return _respond(send_email(req.to, **content))


@router.post("/password-changed", response_model=EmailResponse, summary="Send password change notice")
async def send_password_changed(req: PasswordChangedRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.password_changed(req.user_name)
    return _respond(send_email(req.to, **content))


# ── Orders ─────────────────────────────────────────────────────────────────────

@router.post("/order-confirmation", response_model=EmailResponse, summary="Send order confirmation")
async def send_order_confirmation(req: OrderConfirmationRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    items = [i.model_dump() for i in req.order_items]
    content = tmpl.order_confirmation(req.user_name, req.order_id, items, req.grand_total, req.vendor_count)
    return _respond(send_email(req.to, **content))


@router.post("/order-status", response_model=EmailResponse, summary="Send order status update")
async def send_order_status(req: OrderStatusRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.order_status_update(req.user_name, req.order_id, req.status, req.vendor_name)
    return _respond(send_email(req.to, **content))


# ── Vendors ────────────────────────────────────────────────────────────────────

@router.post("/vendor-registration", response_model=EmailResponse, summary="Vendor application acknowledgment")
async def send_vendor_registration(req: VendorRegistrationRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.vendor_registration(req.vendor_name, req.business_name)
    return _respond(send_email(req.to, **content))


@router.post("/vendor-decision", response_model=EmailResponse, summary="Vendor approved/rejected")
async def send_vendor_decision(req: VendorDecisionRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.vendor_decision(req.vendor_name, req.is_approved, req.rejection_reason)
    return _respond(send_email(req.to, **content))


@router.post("/vendor-verification-approved", response_model=EmailResponse)
async def send_vendor_verification_approved(req: VendorVerificationApprovedRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.vendor_verification_approved(req.vendor_name, req.business_name)
    return _respond(send_email(req.to, **content))


@router.post("/vendor-verification-failed", response_model=EmailResponse)
async def send_vendor_verification_failed(req: VendorVerificationFailedRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.vendor_verification_failed(req.vendor_name, req.reason)
    return _respond(send_email(req.to, **content))


@router.post("/product-approved", response_model=EmailResponse, summary="Product approved notification")
async def send_product_approved(req: ProductApprovedRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.product_approved(req.vendor_name, req.product_name, req.product_id)
    return _respond(send_email(req.to, **content))


@router.post("/product-rejected", response_model=EmailResponse, summary="Product rejected notification")
async def send_product_rejected(req: ProductRejectedRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    content = tmpl.product_rejected(req.vendor_name, req.product_name, req.product_id, req.rejection_reason)
    return _respond(send_email(req.to, **content))


@router.post("/new-order", response_model=EmailResponse, summary="New order notification for vendor")
async def send_new_order(req: NewOrderRequest, x_api_key: str = Header(None)):
    _require_api_key(x_api_key)
    items = [i.model_dump() for i in req.items]
    content = tmpl.new_order_for_vendor(req.vendor_name, req.order_number, items, req.total_amount)
    return _respond(send_email(req.to, **content))
