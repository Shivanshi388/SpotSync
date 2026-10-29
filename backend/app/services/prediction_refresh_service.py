from datetime import datetime

from sqlalchemy.orm import Session

from app.repositories.parking_repository import get_active_parking_lots, get_parking_occupancy
from app.services.parking_service import parking_service


class PredictionRefreshService:

    def refresh_all(self, db: Session):
        now = datetime.now()
        hour = now.hour
        day_of_week = now.weekday()

        results = []

        parking_lots = get_active_parking_lots(db)

        for parking_lot in parking_lots:
            occupancy = get_parking_occupancy(
                db,
                parking_lot.id,
            )

            prediction = parking_service.predict_parking_occupancy(
                db=db,
                parking_lot_id=parking_lot.id,
                hour=hour,
                day_of_week=day_of_week,
            )

            results.append(
                {
                    "parking_lot_id": parking_lot.id,
                    "name": parking_lot.name,
                    "current_occupancy": occupancy["occupancy_rate"],
                    "predicted_occupancy": prediction["predicted_occupancy"],
                    "status": prediction["status"],
                }
            )

        return results


prediction_refresh_service = PredictionRefreshService()
