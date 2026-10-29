from pydantic import BaseModel, Field


class OccupancyPredictionRequest(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    capacity: int = Field(..., gt=0)
    current_occupancy: float = Field(..., ge=0, le=1)


class OccupancyPredictionResponse(BaseModel):
    predicted_occupancy: float
    predicted_percentage: float
    available_percentage: float
    status: str


class PredictionHistoryItem(BaseModel):
    id: int
    parking_lot_id: int
    predicted_occupancy: float
    prediction_hour: int
    prediction_day: int


class PredictionHistoryResponse(BaseModel):
    predictions: list[PredictionHistoryItem]
