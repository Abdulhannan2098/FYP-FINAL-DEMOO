import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from app.config import settings

logger = logging.getLogger(__name__)

_client: MongoClient = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
        logger.info(f"📦 MongoDB client created")
    return _client


def get_db():
    """Return the database object. Derives DB name from the URI."""
    client = get_client()
    # Extract DB name from URI (last path segment, before any query string)
    uri_path = settings.MONGODB_URI.split("/")[-1].split("?")[0]
    db_name = uri_path if uri_path else "AutoSphere_db"
    return client[db_name]


def ping_db() -> bool:
    try:
        get_client().admin.command("ping")
        return True
    except ConnectionFailure:
        return False
