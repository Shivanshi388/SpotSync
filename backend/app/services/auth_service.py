from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.repositories.user_repository import (
    create_user,
    get_user_by_email,
)


def register_user(
    db: Session,
    name: str,
    email: str,
    phone: str | None,
    password: str,
):
    existing_user = get_user_by_email(db, email)

    if existing_user:
        raise ValueError("Email is already registered")

    password_hash = hash_password(password)

    user = create_user(
        db=db,
        name=name,
        email=email,
        phone=phone,
        password_hash=password_hash,
    )

    return user


def login_user(
    db: Session,
    email: str,
    password: str,
):
    user = get_user_by_email(db, email)

    if not user:
        raise ValueError("Invalid email or password")

    if not user.is_active:
        raise ValueError("User account is inactive")

    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")

    access_token = create_access_token(
        subject=str(user.id),
        role=user.role,
    )

    return user, access_token
