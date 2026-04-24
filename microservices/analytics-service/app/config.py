from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PORT: int = 8002
    API_KEY: str = "autosphere-internal-analytics-key"

    # Same MongoDB URI as the monolith — read-only usage
    MONGODB_URI: str = "mongodb://localhost:27017/AutoSphere_db"


settings = Settings()
