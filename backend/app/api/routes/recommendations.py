from fastapi import APIRouter

from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.recommendation_service import recommendation_service


router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"],
)


@router.post(
    "/parking",
    response_model=RecommendationResponse,
)
def recommend_parking(request: RecommendationRequest):

    recommendations = recommendation_service.recommend(
        hour=request.hour,
        day_of_week=request.day_of_week,
        parking_options=request.parking_options,
    )

    return {
        "recommendations": recommendations,
    }
