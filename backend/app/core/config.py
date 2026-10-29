from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    database_url: str

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    payment_mode: str = "razorpay"
    # Mock payments require BOTH APP_ENV=development and
    # ALLOW_MOCK_PAYMENTS=true. Keep the opt-in false by default.
    app_env: str = "production"
    allow_mock_payments: bool = False
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_client_id: str = "spotsync-backend"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()