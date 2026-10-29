from app.api.dependencies import get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.services.auth_service import login_user, register_user


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    try:
        user = register_user(
            db=db,
            name=request.name,
            email=request.email,
            phone=request.phone,
            password=request.password,
        )

        return {
            "message": "User registered successfully",
            "user_id": user.id,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except IntegrityError as exc:
        db.rollback()

        error_message = str(exc.orig).lower()

        if "users_phone_key" in error_message or "phone" in error_message:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mobile number already registered. Please use another number or log in.",
            )

        if "users_email_key" in error_message or "email" in error_message:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered. Please use another email or log in.",
            )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with these details already exists.",
        )


@router.post("/login", response_model=TokenResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    try:
        _, access_token = login_user(
            db=db,
            email=request.email,
            password=request.password,
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
    }