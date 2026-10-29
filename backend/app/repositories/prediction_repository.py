from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.prediction import Prediction


def create_prediction(
    db: Session,
    parking_lot_id: int,
    predicted_occupancy: float,
    prediction_hour: int,
    prediction_day: int,
):
    prediction = Prediction(
        parking_lot_id=parking_lot_id,
        predicted_occupancy=predicted_occupancy,
        prediction_hour=prediction_hour,
        prediction_day=prediction_day,
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return prediction


def get_predictions_for_parking_lot(
    db: Session,
    parking_lot_id: int,
):
    return db.scalars(
        select(Prediction)
        .where(Prediction.parking_lot_id == parking_lot_id)
        .order_by(Prediction.id.desc())
    ).all()
