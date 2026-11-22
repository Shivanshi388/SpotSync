from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    database_url: str

    # Optional Neo4j graph database connection
    neo4j_uri: str = ""
    neo4j_username: str = "neo4j"
    neo4j_password: str = ""
    neo4j_database: str = "neo4j"
    neo4j_connection_timeout: float = 10.0

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 720
    booking_checkout_expiry_minutes: int = 15

    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    payment_mode: str = "razorpay"
    # Mock payments require BOTH APP_ENV=development and
    # ALLOW_MOCK_PAYMENTS=true. Keep the opt-in false by default.
    app_env: str = "production"
    allow_mock_payments: bool = False
    mqtt_enabled: bool = False
    mqtt_broker: str = "df78515f.ala.asia-southeast1.emqxsl.com"
    mqtt_port: int = 8883
    mqtt_client_id: str = "spotsync-backend"
    mqtt_username: str = ""
    mqtt_password: str = ""

    # Additional credentials used by the Arduino MQTT bridge
    spotsync_mqtt_username: str = ""
    spotsync_mqtt_password: str = ""

    mqtt_tls_enabled: bool = True
    sensor_ingestion_token: str = ""
    sensor_stale_after_seconds: int = 120
    sensor_max_future_skew_seconds: int = 300
    sensor_health_check_interval_seconds: int = 30

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
