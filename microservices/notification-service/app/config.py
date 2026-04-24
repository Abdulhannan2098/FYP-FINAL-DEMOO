from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PORT: int = 8001
    API_KEY: str = "autosphere-internal-notify-key"

    # SMTP — same values as the Node.js backend .env
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USER: str = ""
    EMAIL_PASSWORD: str = ""
    EMAIL_FROM: str = ""

    # Branding
    BRAND_NAME: str = "AutoSphere"
    FRONTEND_URL: str = "http://localhost:5173"
    SUPPORT_EMAIL: str = "support@autosphere.com"
    VENDOR_SUPPORT_EMAIL: str = "vendor-support@autosphere.com"
    PRIMARY_COLOR: str = "#991B1B"
    DARK_BG: str = "#111827"
    CURRENCY: str = "PKR"


settings = Settings()
