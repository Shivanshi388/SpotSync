
from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import SessionLocal

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    return {"status": "ok", "service": "spotsync-api"}


@router.get("/health/ready")
def readiness_check():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database is not available",
        )
    finally:
        db.close()
