from app.core.database import SessionLocal
from app.services.prediction_refresh_service import prediction_refresh_service


def refresh_predictions():
    db = SessionLocal()

    try:
        return prediction_refresh_service.refresh_all(db)
    finally:
        db.close()
