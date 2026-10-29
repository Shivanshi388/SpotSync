from sqlalchemy.orm import Session

from app.repositories.prediction_repository import (
    create_prediction,
    get_predictions_for_parking_lot,
)


class PredictionHistoryService:

    def save_prediction(
        self,
        db: Session,
        parking_lot_id: int,
        predicted_occupancy: float,
        prediction_hour: int,
        prediction_day: int,
    ):
        return create_prediction(
            db=db,
            parking_lot_id=parking_lot_id,
            predicted_occupancy=predicted_occupancy,
            prediction_hour=prediction_hour,
            prediction_day=prediction_day,
        )

    def get_history(
        self,
        db: Session,
        parking_lot_id: int,
    ):
        return get_predictions_for_parking_lot(
            db=db,
            parking_lot_id=parking_lot_id,
        )


prediction_history_service = PredictionHistoryService()
