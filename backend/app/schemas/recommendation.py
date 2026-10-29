from pydantic import BaseModel, Field


class ParkingOption(BaseModel):
    name: str
    distance_km: float = Field(..., ge=0)
    capacity: int = Field(..., gt=0)
    current_occupancy: float = Field(..., ge=0, le=1)
    price_per_hour: float = Field(..., ge=0)


class RecommendationRequest(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    parking_options: list[ParkingOption]


class RecommendationResponse(BaseModel):
    recommendations: list[dict]
