from app.ai.inference.model_loader import get_prediction_model
from app.ai.recommendations.ranking import rank_parking_options


class RecommendationService:

    def __init__(self):
        self.model = get_prediction_model()

    def recommend(
        self,
        hour,
        day_of_week,
        parking_options,
    ):
        options = []

        for parking in parking_options:
            predicted_occupancy = self.model.predict(
                hour=hour,
                day_of_week=day_of_week,
                capacity=parking.capacity,
                current_occupancy=parking.current_occupancy,
            )

            options.append(
                {
                    "name": parking.name,
                    "distance_km": parking.distance_km,
                    "predicted_occupancy": predicted_occupancy,
                    "price_per_hour": parking.price_per_hour,
                }
            )

        ranked = rank_parking_options(options)

        for option in ranked:
            occupancy = option[
                "predicted_occupancy"
            ]

            if occupancy >= 0.85:
                availability_reason = (
                    "Very high predicted occupancy"
                )
            elif occupancy >= 0.65:
                availability_reason = (
                    "Moderately high predicted occupancy"
                )
            else:
                availability_reason = (
                    "Good predicted availability"
                )

            if option["distance_km"] <= 1:
                distance_reason = "Very close"
            elif option["distance_km"] <= 3:
                distance_reason = "Nearby"
            else:
                distance_reason = "Further away"

            option["reason"] = (
                f"{availability_reason}; "
                f"{distance_reason}; "
                f"?{option['price_per_hour']}/hour"
            )

        return ranked


recommendation_service = RecommendationService()
