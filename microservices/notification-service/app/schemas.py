from pydantic import BaseModel
from typing import Optional, List


class EmailResponse(BaseModel):
    success: bool
    message: str
    message_id: Optional[str] = None


class GenericEmailRequest(BaseModel):
    to: str
    subject: str
    html: str
    text: Optional[str] = None


class WelcomeRequest(BaseModel):
    to: str
    user_name: str
    user_role: Optional[str] = None


class EmailVerificationRequest(BaseModel):
    to: str
    user_name: str
    otp: str


class PasswordResetRequest(BaseModel):
    to: str
    user_name: str
    reset_token: str
    reset_url: str


class PasswordChangedRequest(BaseModel):
    to: str
    user_name: str


class OrderItem(BaseModel):
    name: str
    quantity: int
    price: float


class OrderConfirmationRequest(BaseModel):
    to: str
    user_name: str
    order_id: str
    order_items: List[OrderItem] = []
    grand_total: float
    vendor_count: int = 1


class OrderStatusRequest(BaseModel):
    to: str
    user_name: str
    order_id: str
    status: str
    vendor_name: str


class VendorRegistrationRequest(BaseModel):
    to: str
    vendor_name: str
    business_name: Optional[str] = None


class VendorDecisionRequest(BaseModel):
    to: str
    vendor_name: str
    is_approved: bool
    rejection_reason: Optional[str] = ""


class VendorVerificationApprovedRequest(BaseModel):
    to: str
    vendor_name: str
    business_name: Optional[str] = None


class VendorVerificationFailedRequest(BaseModel):
    to: str
    vendor_name: str
    reason: Optional[str] = ""


class ProductApprovedRequest(BaseModel):
    to: str
    vendor_name: str
    product_name: str
    product_id: Optional[str] = None


class ProductRejectedRequest(BaseModel):
    to: str
    vendor_name: str
    product_name: str
    product_id: Optional[str] = None
    rejection_reason: Optional[str] = ""


class NewOrderRequest(BaseModel):
    to: str
    vendor_name: str
    order_number: str
    items: List[OrderItem] = []
    total_amount: float
