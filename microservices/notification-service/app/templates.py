"""
Email HTML templates — Python equivalent of backend/utils/emailService.js templates.
Mirrors AutoSphere brand colours and layout.
"""

from datetime import datetime
from app.config import settings
import html as html_lib


def _esc(value: str) -> str:
    return html_lib.escape(str(value or ""))


def _fmt_currency(amount: float) -> str:
    try:
        return f"{settings.CURRENCY} {float(amount):,.2f}"
    except Exception:
        return f"{settings.CURRENCY} 0.00"


def _fmt_datetime(dt: datetime = None) -> str:
    dt = dt or datetime.utcnow()
    return dt.strftime("%b %d, %Y %I:%M %p UTC")


def _render_button(label: str, url: str) -> str:
    if not label or not url:
        return ""
    return f"""
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:20px auto 0 auto;">
      <tr>
        <td bgcolor="{settings.PRIMARY_COLOR}" align="center" style="border-radius:10px;">
          <a href="{_esc(url)}" target="_blank" style="display:inline-block;background:{settings.PRIMARY_COLOR};padding:12px 20px;
             border-radius:10px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">
            {_esc(label)}
          </a>
        </td>
      </tr>
    </table>"""


def _render_otp_block(label: str, otp: str, note: str = "") -> str:
    return f"""
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
           style="margin:18px 0 8px 0;border:1px solid #E5E7EB;border-radius:14px;">
      <tr>
        <td align="center" style="padding:18px 14px;">
          <div style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;">{_esc(label)}</div>
          <div style="margin:10px 0 8px 0;font-family:Courier New,monospace;font-size:34px;font-weight:800;
                      color:{settings.PRIMARY_COLOR};letter-spacing:8px;">{_esc(otp)}</div>
          {f'<div style="font-size:13px;color:#6B7280;">{_esc(note)}</div>' if note else ""}
        </td>
      </tr>
    </table>"""


def _render_card(
    preheader: str = "",
    heading: str = "",
    greeting: str = "",
    lead: str = "",
    body_html: str = "",
    cta_label: str = "",
    cta_url: str = "",
    footer_note: str = "",
) -> str:
    year = datetime.utcnow().year
    brand = _esc(settings.BRAND_NAME)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>{_esc(heading or settings.BRAND_NAME)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{_esc(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F3F4F6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;">
          <tr>
            <td style="background:{settings.DARK_BG};padding:18px 22px;border-radius:16px 16px 0 0;">
              <div style="font-size:18px;font-weight:800;color:#ffffff;">{brand}</div>
              <div style="font-size:12px;color:#D1D5DB;margin-top:4px;">{_esc(heading)}</div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:24px 22px;border-radius:0 0 16px 16px;">
              {f'<p style="margin:0 0 12px 0;font-size:16px;color:#111827;">{_esc(greeting)}</p>' if greeting else ""}
              {f'<p style="margin:0 0 16px 0;font-size:14px;color:#374151;">{_esc(lead)}</p>' if lead else ""}
              {body_html}
              {_render_button(cta_label, cta_url)}
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:22px 0 14px 0;"/>
              <p style="margin:0;font-size:12px;color:#6B7280;">
                Need help? <a href="mailto:{_esc(settings.SUPPORT_EMAIL)}" style="color:{settings.PRIMARY_COLOR};text-decoration:none;">{_esc(settings.SUPPORT_EMAIL)}</a>
              </p>
              {f'<p style="margin:10px 0 0 0;font-size:12px;color:#6B7280;">{_esc(footer_note)}</p>' if footer_note else ""}
              <p style="margin:10px 0 0 0;font-size:11px;color:#9CA3AF;">© {year} {brand}. Automated message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ─── Template functions ────────────────────────────────────────────────────────

def welcome(user_name: str, user_role: str = None) -> dict:
    role_line = f'<p style="margin:0 0 14px 0;font-size:14px;color:#374151;"><strong>Account type:</strong> {_esc(user_role)}</p>' if user_role else ""
    return {
        "subject": f"Welcome to {settings.BRAND_NAME}",
        "html": _render_card(
            preheader=f"Welcome to {settings.BRAND_NAME}. Your account is ready.",
            heading="Welcome",
            greeting=f"Hello {user_name},",
            lead=f"Thanks for joining {settings.BRAND_NAME}. Your account has been created successfully.",
            body_html=role_line,
            cta_label="Open AutoSphere",
            cta_url=settings.FRONTEND_URL,
            footer_note="If you did not create this account, contact support.",
        ),
        "text": f"Welcome to {settings.BRAND_NAME}\n\nHello {user_name},\nYour account is ready.\nSign in: {settings.FRONTEND_URL}",
    }


def email_verification(user_name: str, otp: str) -> dict:
    return {
        "subject": f"Verify your email address - {settings.BRAND_NAME}",
        "html": _render_card(
            preheader="Use this code to verify your email address.",
            heading="Email verification",
            greeting=f"Hello {user_name},",
            lead="Use the code below to finish setting up your account.",
            body_html=_render_otp_block("Verification code", otp, "Expires in 10 minutes."),
            footer_note="Never share this code with anyone.",
        ),
        "text": f"Your verification code is: {otp}\nExpires in 10 minutes.",
    }


def password_reset(user_name: str, reset_token: str, reset_url: str) -> dict:
    return {
        "subject": f"Password reset code - {settings.BRAND_NAME}",
        "html": _render_card(
            preheader="Use this code to reset your password.",
            heading="Password reset",
            greeting=f"Hello {user_name},",
            lead="We received a request to reset your password.",
            body_html=_render_otp_block("Password reset code", reset_token, "Expires in 10 minutes."),
            cta_label="Continue to verification",
            cta_url=reset_url,
            footer_note="If you did not request a password reset, no action is required.",
        ),
        "text": f"Your password reset code is: {reset_token}\nExpires in 10 minutes.\nLink: {reset_url}",
    }


def password_changed(user_name: str) -> dict:
    when = _fmt_datetime()
    reset_link = f"{settings.FRONTEND_URL}/forgot-password"
    return {
        "subject": f"Password changed - {settings.BRAND_NAME}",
        "html": _render_card(
            preheader="A password change was made to your account.",
            heading="Security notification",
            greeting=f"Hello {user_name},",
            lead=f"Your account password was changed on {when}.",
            body_html="""
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                   style="margin:16px 0;border:1px solid #FEF3C7;background:#FFFBEB;border-radius:14px;">
              <tr>
                <td style="padding:14px;font-size:13px;color:#92400E;">
                  <strong>Didn't make this change?</strong><br/>Reset your password immediately.
                </td>
              </tr>
            </table>""",
            cta_label="Reset password",
            cta_url=reset_link,
        ),
        "text": f"Your password was changed on {when}.\nIf not you, reset: {reset_link}",
    }


def order_confirmation(
    user_name: str, order_id: str, order_items: list, grand_total: float, vendor_count: int = 1
) -> dict:
    rows = "".join(
        f"""<tr>
          <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-size:14px;color:#111827;">{_esc(it.get("name","Item"))}</td>
          <td align="center" style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-size:14px;">{it.get("quantity",1)}</td>
          <td align="right" style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-size:14px;">{_fmt_currency(it.get("price",0))}</td>
          <td align="right" style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-size:14px;">{_fmt_currency(float(it.get("quantity",1))*float(it.get("price",0)))}</td>
        </tr>"""
        for it in order_items
    )
    track_url = f"{settings.FRONTEND_URL}/dashboard/customer"
    multi_note = f'<p style="font-size:13px;color:#6B7280;">Note: your checkout includes items from {vendor_count} vendors.</p>' if vendor_count > 1 else ""
    body = f"""
    <p style="font-size:14px;color:#374151;margin:0 0 10px 0;"><strong>Order Reference:</strong> #{_esc(order_id)}</p>
    {multi_note}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
           style="margin:12px 0;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
      <tr style="background:#F9FAFB;">
        <th align="left" style="padding:10px 8px;font-size:12px;color:#6B7280;text-transform:uppercase;">Item</th>
        <th align="center" style="padding:10px 8px;font-size:12px;color:#6B7280;text-transform:uppercase;">Qty</th>
        <th align="right" style="padding:10px 8px;font-size:12px;color:#6B7280;text-transform:uppercase;">Unit</th>
        <th align="right" style="padding:10px 8px;font-size:12px;color:#6B7280;text-transform:uppercase;">Total</th>
      </tr>
      {rows}
      <tr>
        <td colspan="3" align="right" style="padding:12px 8px;font-size:14px;"><strong>Grand total</strong></td>
        <td align="right" style="padding:12px 8px;font-size:14px;"><strong>{_fmt_currency(grand_total)}</strong></td>
      </tr>
    </table>"""
    return {
        "subject": f"Order confirmation #{order_id} - {settings.BRAND_NAME}",
        "html": _render_card(
            preheader=f"Order #{order_id} confirmed.",
            heading="Order confirmed",
            greeting=f"Hello {user_name},",
            lead="Thanks for your purchase. Your order has been received.",
            body_html=body,
            cta_label="Track your order",
            cta_url=track_url,
        ),
        "text": f"Order #{order_id} confirmed.\nGrand total: {_fmt_currency(grand_total)}\nTrack: {track_url}",
    }


def order_status_update(user_name: str, order_id: str, status: str, vendor_name: str) -> dict:
    view_url = f"{settings.FRONTEND_URL}/dashboard/customer"
    status_map = {
        "pending vendor action": ("Pending", "Your order is waiting for vendor action."),
        "in progress": ("Processing", "Your order is being processed."),
        "accepted": ("Processing", "Your order is being processed."),
        "shipped": ("Shipped", "Your order has been shipped."),
        "delivered": ("Delivered", "Your order has been delivered. Thank you!"),
        "completed": ("Delivered", "Your order has been delivered. Thank you!"),
        "cancelled": ("Cancelled", "Your order has been cancelled."),
        "rejected": ("Cancelled", "Your order has been cancelled."),
    }
    label, lead = status_map.get(status.lower(), (status, "Your order status has been updated."))
    body = f"""
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
           style="border:1px solid #E5E7EB;border-radius:14px;">
      <tr>
        <td style="padding:14px;font-size:14px;color:#374151;">
          <div><strong>Order ID:</strong> #{_esc(order_id)}</div>
          <div style="margin-top:6px;"><strong>Vendor:</strong> {_esc(vendor_name)}</div>
          <div style="margin-top:10px;">
            <span style="display:inline-block;padding:8px 12px;border-radius:999px;background:#F3F4F6;font-weight:700;font-size:13px;">{_esc(label)}</span>
          </div>
        </td>
      </tr>
    </table>"""
    return {
        "subject": f"Order update #{order_id} - {settings.BRAND_NAME}",
        "html": _render_card(
            preheader=f"Order #{order_id} status: {label}.",
            heading="Order status update",
            greeting=f"Hello {user_name},",
            lead=lead,
            body_html=body,
            cta_label="View order details",
            cta_url=view_url,
        ),
        "text": f"Order #{order_id} — Status: {label}\nVendor: {vendor_name}\nView: {view_url}",
    }


def vendor_registration(vendor_name: str, business_name: str = None) -> dict:
    biz = f'<p style="font-size:14px;color:#374151;"><strong>Business:</strong> {_esc(business_name)}</p>' if business_name else ""
    return {
        "subject": f"Vendor application received - {settings.BRAND_NAME}",
        "html": _render_card(
            preheader="Your vendor application is under review.",
            heading="Vendor application",
            greeting=f"Hello {vendor_name},",
            lead=f"Thanks for applying to become a vendor on {settings.BRAND_NAME}. Our team will review in 1–2 business days.",
            body_html=biz,
        ),
        "text": f"Vendor application received.\nBusiness: {business_name or 'N/A'}\nWe will be in touch.",
    }


def vendor_decision(vendor_name: str, is_approved: bool, rejection_reason: str = "") -> dict:
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/vendor"
    if is_approved:
        body = """<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                        style="border:1px solid #D1FAE5;background:#ECFDF5;border-radius:14px;">
          <tr><td style="padding:14px;font-size:13px;color:#065F46;">
            <strong>Next steps</strong><ul style="margin:10px 0 0;padding-left:18px;">
              <li>Complete your store profile</li><li>Add your products</li><li>Start fulfilling orders</li>
            </ul>
          </td></tr></table>"""
        cta_label, cta_url = "Open vendor dashboard", dashboard_url
    else:
        reason_html = f'<p style="padding:12px;background:#FEF2F2;border-left:4px solid #DC2626;font-size:13px;color:#7F1D1D;">{_esc(rejection_reason)}</p>' if rejection_reason else ""
        body = f'<p style="font-size:14px;color:#374151;">After careful review, your application was not approved at this time.</p>{reason_html}'
        cta_label, cta_url = "", ""
    return {
        "subject": f"Vendor application {'approved' if is_approved else 'update'} - {settings.BRAND_NAME}",
        "html": _render_card(
            preheader="Vendor application approved." if is_approved else "Update on your vendor application.",
            heading="Vendor application",
            greeting=f"Hello {vendor_name},",
            lead="Good news — your application is approved." if is_approved else "Here is an update on your application.",
            body_html=body,
            cta_label=cta_label,
            cta_url=cta_url,
        ),
        "text": f"Vendor application {'APPROVED' if is_approved else 'NOT approved'}.\n{rejection_reason or ''}",
    }


def vendor_verification_approved(vendor_name: str, business_name: str = None) -> dict:
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/vendor"
    biz = business_name or "your business"
    return {
        "subject": f"Vendor verification approved - {settings.BRAND_NAME}",
        "html": _render_card(
            preheader="Your vendor verification has been approved!",
            heading="Verification approved",
            greeting=f"Hello {vendor_name},",
            lead=f"Congratulations! Your identity verification for {biz} has been completed.",
            body_html="""<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                               style="border:1px solid #D1FAE5;background:#ECFDF5;border-radius:14px;">
              <tr><td style="padding:14px;font-size:13px;color:#065F46;">
                <strong>You're all set!</strong>
                <ul style="margin:10px 0 0;padding-left:18px;">
                  <li>Create and manage product listings</li>
                  <li>Upload 3D models for AR preview</li>
                  <li>Receive and fulfill customer orders</li>
                </ul>
              </td></tr></table>""",
            cta_label="Go to Vendor Dashboard",
            cta_url=dashboard_url,
        ),
        "text": f"Vendor verification approved for {biz}.\nDashboard: {dashboard_url}",
    }


def vendor_verification_failed(vendor_name: str, reason: str = "") -> dict:
    retry_url = f"{settings.FRONTEND_URL}/vendor/verification"
    reason_html = f'<p style="padding:12px;background:#FEF2F2;border-left:4px solid #DC2626;font-size:13px;color:#7F1D1D;">{_esc(reason)}</p>' if reason else ""
    return {
        "subject": f"Vendor verification update - {settings.BRAND_NAME}",
        "html": _render_card(
            preheader="Your vendor verification needs attention.",
            heading="Verification update",
            greeting=f"Hello {vendor_name},",
            lead="We were unable to complete your vendor verification at this time.",
            body_html=reason_html,
            cta_label="Retry Verification",
            cta_url=retry_url,
        ),
        "text": f"Verification failed.\nReason: {reason}\nRetry: {retry_url}",
    }


def product_approved(vendor_name: str, product_name: str, product_id: str = None) -> dict:
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/vendor/products"
    ref = f"#{product_id[-8:].upper()}" if product_id else "N/A"
    return {
        "subject": "Your Product is Now Live on the Platform",
        "html": _render_card(
            preheader="Your product is now live on the marketplace.",
            heading="Product approved",
            greeting=f"Hello {vendor_name},",
            lead="Your product has been reviewed and is now live.",
            body_html=f'<p style="font-size:14px;color:#374151;"><strong>Product:</strong> {_esc(product_name)}</p><p style="font-size:13px;color:#6B7280;"><strong>Ref:</strong> {_esc(ref)}</p>',
            cta_label="Open Vendor Dashboard",
            cta_url=dashboard_url,
        ),
        "text": f"Product approved: {product_name} ({ref})\nDashboard: {dashboard_url}",
    }


def product_rejected(
    vendor_name: str, product_name: str, product_id: str = None, rejection_reason: str = ""
) -> dict:
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/vendor/products"
    ref = f"#{product_id[-8:].upper()}" if product_id else "N/A"
    reason_text = rejection_reason or "No specific reason provided."
    return {
        "subject": "Product Review Result - Not Approved",
        "html": _render_card(
            preheader="Your product review result is ready.",
            heading="Product review: Not approved",
            greeting=f"Hello {vendor_name},",
            lead="Your product does not meet our current requirements.",
            body_html=f"""
            <p style="font-size:14px;color:#374151;"><strong>Product:</strong> {_esc(product_name)} — Ref: {_esc(ref)}</p>
            <p style="padding:12px;background:#FEF2F2;border-left:4px solid #DC2626;font-size:13px;color:#7F1D1D;">{_esc(reason_text)}</p>""",
            cta_label="Review Requirements",
            cta_url=dashboard_url,
        ),
        "text": f"Product not approved: {product_name}\nReason: {reason_text}",
    }


def new_order_for_vendor(
    vendor_name: str, order_number: str, items: list, total_amount: float
) -> dict:
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard/vendor/orders"
    rows = "".join(
        f"<tr><td style='padding:10px 8px;border-bottom:1px solid #E5E7EB;font-size:14px;'>{_esc(it.get('name','Item'))}</td>"
        f"<td align='right' style='padding:10px 8px;border-bottom:1px solid #E5E7EB;font-size:14px;'>{it.get('quantity',1)}</td></tr>"
        for it in items
    )
    return {
        "subject": f"New order received #{order_number} - {settings.BRAND_NAME}",
        "html": _render_card(
            preheader=f"New order #{order_number} received.",
            heading="New order received",
            greeting=f"Hello {vendor_name},",
            lead="A customer has placed a new order that includes your product(s).",
            body_html=f"""
            <p style="font-size:14px;"><strong>Order ID:</strong> #{_esc(order_number)}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                   style="margin:12px 0;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
              <tr style="background:#F9FAFB;">
                <th align="left" style="padding:10px 8px;font-size:12px;color:#6B7280;">Product</th>
                <th align="right" style="padding:10px 8px;font-size:12px;color:#6B7280;">Qty</th>
              </tr>
              {rows}
            </table>
            <p style="font-size:14px;"><strong>Total:</strong> {_fmt_currency(total_amount)}</p>""",
            cta_label="Review Order",
            cta_url=dashboard_url,
        ),
        "text": f"New order #{order_number}.\nTotal: {_fmt_currency(total_amount)}\nReview: {dashboard_url}",
    }
