from sqlalchemy.orm import Session

from app.ai.inference.model_loader import get_prediction_model
from app.repositories.parking_repository import (
    get_active_parking_lots,
    get_parking_occupancy,
)
from app.services.prediction_history_service import prediction_history_service


class ParkingService:
    def __init__(self):
        self.model = get_prediction_model()

    def get_parking_overview(self, db: Session):
        parking_lots = get_active_parking_lots(db)

        results = []

        for parking_lot in parking_lots:
            occupancy = get_parking_occupancy(db, parking_lot.id)

            results.append(
                {
                    "id": parking_lot.id,
                    "name": parking_lot.name,
                    "address": getattr(parking_lot, "address", None),
                    "latitude": float(parking_lot.latitude) if parking_lot.latitude is not None else None,
                    "longitude": float(parking_lot.longitude) if parking_lot.longitude is not None else None,
                    "total_slots": occupancy["total_slots"],
                    "occupied_slots": occupancy["occupied_slots"],
                    "available_slots": occupancy["available_slots"],
                    "occupancy_rate": occupancy["occupancy_rate"],
                }
            )

        return results

    def predict_parking_occupancy(
        self,
        db: Session,
        parking_lot_id: int,
        hour: int,
        day_of_week: int,
    ):
        parking_lots = get_active_parking_lots(db)

        parking_lot = next(
            (lot for lot in parking_lots if lot.id == parking_lot_id),
            None,
        )

        if parking_lot is None:
            return None

        occupancy = get_parking_occupancy(db, parking_lot_id)
        total_slots = occupancy["total_slots"]

        if total_slots == 0:
            return {
                "parking_lot_id": parking_lot_id,
                "name": parking_lot.name,
                "current_occupancy": 0.0,
                "predicted_occupancy": 0.0,
                "predicted_percentage": 0.0,
                "available_percentage": 100.0,
                "status": "AVAILABLE",
            }

        current_occupancy = occupancy["occupancy_rate"]

        predicted = self.model.predict(
            hour=hour,
            day_of_week=day_of_week,
            capacity=total_slots,
            current_occupancy=current_occupancy,
        )

        prediction_history_service.save_prediction(
            db=db,
            parking_lot_id=parking_lot_id,
            predicted_occupancy=predicted,
            prediction_hour=hour,
            prediction_day=day_of_week,
        )

        available = max(0.0, 1.0 - predicted)

        if predicted >= 0.85:
            status = "FULL"
        elif predicted >= 0.65:
            status = "BUSY"
        elif predicted >= 0.40:
            status = "MODERATE"
        else:
            status = "AVAILABLE"

        return {
            "parking_lot_id": parking_lot_id,
            "name": parking_lot.name,
            "current_occupancy": current_occupancy,
            "predicted_occupancy": predicted,
            "predicted_percentage": round(predicted * 100, 2),
            "available_percentage": round(available * 100, 2),
            "status": status,
        }


parking_service = ParkingService()
