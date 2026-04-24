from fastapi import APIRouter, Header, HTTPException, status, Query
from datetime import datetime, timedelta
from collections import defaultdict
from app.database import get_db
from app.config import settings
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

ORDER_STATUSES = ["Pending Vendor Action", "In Progress", "Shipped", "Delivered", "Cancelled"]
PRODUCT_CATEGORIES = [
    "Rims & Wheels", "Spoilers", "Body Kits", "Hoods",
    "LED Lights", "Body Wraps / Skins", "Exhaust Systems", "Interior Accessories",
]


def _auth(x_api_key: str):
    if x_api_key != settings.API_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


# ── Overview ───────────────────────────────────────────────────────────────────

@router.get("/overview", summary="Platform overview statistics")
async def get_overview(x_api_key: str = Header(None)):
    _auth(x_api_key)
    db = get_db()

    total_users      = db.users.count_documents({})
    total_customers  = db.users.count_documents({"role": "customer"})
    total_vendors    = db.users.count_documents({"role": "vendor"})
    verified_vendors = db.users.count_documents({"role": "vendor", "vendorStatus": "verified"})

    total_products   = db.products.count_documents({})
    approved_products = db.products.count_documents({"isApproved": True})
    pending_products  = db.products.count_documents({"approvalStatus": "Pending"})

    total_orders    = db.orders.count_documents({})
    delivered_orders = db.orders.count_documents({"status": "Delivered"})

    # Revenue = sum of totalAmount for Delivered orders
    pipeline = [
        {"$match": {"status": "Delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$totalAmount"}}},
    ]
    rev_result = list(db.orders.aggregate(pipeline))
    total_revenue = rev_result[0]["total"] if rev_result else 0.0

    return {
        "users": {
            "total": total_users,
            "customers": total_customers,
            "vendors": total_vendors,
            "verified_vendors": verified_vendors,
        },
        "products": {
            "total": total_products,
            "approved": approved_products,
            "pending_approval": pending_products,
            "rejected": db.products.count_documents({"approvalStatus": "Rejected"}),
        },
        "orders": {
            "total": total_orders,
            "delivered": delivered_orders,
        },
        "revenue": {
            "total_delivered_pkr": round(total_revenue, 2),
        },
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


# ── Orders ─────────────────────────────────────────────────────────────────────

@router.get("/orders", summary="Order breakdown and recent activity")
async def get_orders(
    days: int = Query(30, ge=1, le=365, description="Look-back window in days"),
    x_api_key: str = Header(None),
):
    _auth(x_api_key)
    db = get_db()

    by_status = {s: db.orders.count_documents({"status": s}) for s in ORDER_STATUSES}

    # Revenue per day for the last N days
    since = datetime.utcnow() - timedelta(days=days)
    pipeline = [
        {"$match": {"status": "Delivered", "createdAt": {"$gte": since}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                "revenue": {"$sum": "$totalAmount"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    daily = [{"date": d["_id"], "revenue": round(d["revenue"], 2), "count": d["count"]}
             for d in db.orders.aggregate(pipeline)]

    # Recent 10 orders
    recent_cursor = db.orders.find({}, {"orderNumber": 1, "status": 1, "totalAmount": 1, "createdAt": 1}) \
                              .sort("createdAt", -1).limit(10)
    recent = [
        {
            "order_number": str(o.get("orderNumber", "")),
            "status": o.get("status", ""),
            "total_amount": o.get("totalAmount", 0),
            "created_at": o["createdAt"].isoformat() + "Z" if o.get("createdAt") else None,
        }
        for o in recent_cursor
    ]

    return {
        "by_status": by_status,
        "total": sum(by_status.values()),
        "daily_revenue_last_{}_days".format(days): daily,
        "recent_orders": recent,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


# ── Products ───────────────────────────────────────────────────────────────────

@router.get("/products", summary="Product statistics by category and approval")
async def get_products(x_api_key: str = Header(None)):
    _auth(x_api_key)
    db = get_db()

    by_category = {
        cat: db.products.count_documents({"category": cat, "isApproved": True})
        for cat in PRODUCT_CATEGORIES
    }

    # Top rated (approved products with rating > 0)
    top_rated_cursor = db.products.find(
        {"isApproved": True, "rating": {"$gt": 0}},
        {"name": 1, "category": 1, "rating": 1, "numReviews": 1, "price": 1},
    ).sort("rating", -1).limit(10)

    top_rated = [
        {
            "id": str(p["_id"]),
            "name": p.get("name", ""),
            "category": p.get("category", ""),
            "rating": p.get("rating", 0),
            "num_reviews": p.get("numReviews", 0),
            "price": p.get("price", 0),
        }
        for p in top_rated_cursor
    ]

    # AR-ready products
    ar_ready = db.products.count_documents({"model3D.isARReady": True})

    return {
        "by_category": by_category,
        "approval": {
            "approved": db.products.count_documents({"approvalStatus": "Approved"}),
            "pending": db.products.count_documents({"approvalStatus": "Pending"}),
            "rejected": db.products.count_documents({"approvalStatus": "Rejected"}),
        },
        "ar_ready": ar_ready,
        "top_rated": top_rated,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users", summary="User growth and registration stats")
async def get_users(
    days: int = Query(30, ge=1, le=365, description="Look-back window in days"),
    x_api_key: str = Header(None),
):
    _auth(x_api_key)
    db = get_db()

    since = datetime.utcnow() - timedelta(days=days)

    # Registrations per day
    pipeline = [
        {"$match": {"createdAt": {"$gte": since}}},
        {
            "$group": {
                "_id": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                    "role": "$role",
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.date": 1}},
    ]

    daily_by_role: dict = defaultdict(lambda: defaultdict(int))
    for doc in db.users.aggregate(pipeline):
        date = doc["_id"]["date"]
        role = doc["_id"].get("role", "unknown")
        daily_by_role[date][role] += doc["count"]

    daily_registrations = [
        {"date": date, **counts}
        for date, counts in sorted(daily_by_role.items())
    ]

    return {
        "by_role": {
            "customer": db.users.count_documents({"role": "customer"}),
            "vendor": db.users.count_documents({"role": "vendor"}),
            "admin": db.users.count_documents({"role": "admin"}),
        },
        "vendor_status": {
            "unverified": db.users.count_documents({"role": "vendor", "vendorStatus": "unverified"}),
            "pending": db.users.count_documents({"role": "vendor", "vendorStatus": "pending_verification"}),
            "verified": db.users.count_documents({"role": "vendor", "vendorStatus": "verified"}),
            "rejected": db.users.count_documents({"role": "vendor", "vendorStatus": "rejected"}),
        },
        "auth_providers": {
            "local": db.users.count_documents({"authProvider": "local"}),
            "google": db.users.count_documents({"authProvider": "google"}),
        },
        "new_last_{}_days".format(days): db.users.count_documents({"createdAt": {"$gte": since}}),
        "daily_registrations": daily_registrations,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


# ── Revenue ────────────────────────────────────────────────────────────────────

@router.get("/revenue", summary="Revenue breakdown by period and vendor")
async def get_revenue(
    days: int = Query(30, ge=1, le=365, description="Look-back window in days"),
    x_api_key: str = Header(None),
):
    _auth(x_api_key)
    db = get_db()

    since = datetime.utcnow() - timedelta(days=days)

    # Monthly revenue (last 12 months)
    monthly_pipeline = [
        {"$match": {"status": "Delivered"}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m", "date": "$createdAt"}},
                "revenue": {"$sum": "$totalAmount"},
                "orders": {"$sum": 1},
            }
        },
        {"$sort": {"_id": -1}},
        {"$limit": 12},
    ]
    monthly = [
        {"month": d["_id"], "revenue": round(d["revenue"], 2), "orders": d["orders"]}
        for d in db.orders.aggregate(monthly_pipeline)
    ]
    monthly.reverse()

    # Top 5 vendors by revenue
    vendor_pipeline = [
        {"$match": {"status": "Delivered"}},
        {"$group": {"_id": "$vendor", "revenue": {"$sum": "$totalAmount"}, "orders": {"$sum": 1}}},
        {"$sort": {"revenue": -1}},
        {"$limit": 5},
        {
            "$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "_id",
                "as": "vendor_info",
            }
        },
    ]
    top_vendors = []
    for doc in db.orders.aggregate(vendor_pipeline):
        info = doc.get("vendor_info", [{}])[0]
        top_vendors.append({
            "vendor_id": str(doc["_id"]),
            "business_name": info.get("businessName", info.get("name", "Unknown")),
            "revenue": round(doc["revenue"], 2),
            "orders": doc["orders"],
        })

    return {
        "monthly_revenue": monthly,
        "top_vendors_by_revenue": top_vendors,
        "period_days": days,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }
