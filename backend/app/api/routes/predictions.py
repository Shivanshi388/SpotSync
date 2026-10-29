from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.inference.model_loader import get_model_info
from app.api.dependencies import get_db
from app.schemas.prediction import (
    OccupancyPredictionRequest,
    OccupancyPredictionResponse,
    PredictionHistoryResponse,
)
from app.services.prediction_history_service import (
    prediction_history_service,
)
from app.services.prediction_service import prediction_service


router = APIRouter(
    prefix="/predictions",
    tags=["Predictions"],
)


@router.post(
    "/occupancy",
    response_model=OccupancyPredictionResponse,
)
def predict_occupancy(
    request: OccupancyPredictionRequest,
):
    return prediction_service.predict_occupancy(
        hour=request.hour,
        day_of_week=request.day_of_week,
        capacity=request.capacity,
        current_occupancy=request.current_occupancy,
    )


@router.get("/health")
def prediction_health():
    return {
        "status": "ok",
        **get_model_info(),
    }


@router.get(
    "/history/{parking_lot_id}",
    response_model=PredictionHistoryResponse,
)
def prediction_history(
    parking_lot_id: int,
    db: Session = Depends(get_db),
):
    predictions = prediction_history_service.get_history(
        db=db,
        parking_lot_id=parking_lot_id,
    )

    return {
        "predictions": [
            {
                "id": prediction.id,
                "parking_lot_id": prediction.parking_lot_id,
                "predicted_occupancy": prediction.predicted_occupancy,
                "prediction_hour": prediction.prediction_hour,
                "prediction_day": prediction.prediction_day,
            }
            for prediction in predictions
        ]
    }
