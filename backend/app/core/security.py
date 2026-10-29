from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings


password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(
    subject: str,
    role: str | None = None,
    expires_minutes: int | None = None,
) -> str:
    minutes = (
        expires_minutes
        if expires_minutes is not None
        else settings.jwt_access_token_expire_minutes
    )

    expire = datetime.now(timezone.utc) + timedelta(minutes=minutes)

    payload = {
        "sub": subject,
        "exp": expire,
    }

    if role is not None:
        payload["role"] = role

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
