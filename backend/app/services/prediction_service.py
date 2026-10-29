from app.ai.inference.model_loader import get_prediction_model


class PredictionService:

    def __init__(self):
        self.model = get_prediction_model()

    def predict_occupancy(
        self,
        hour: int,
        day_of_week: int,
        capacity: int,
        current_occupancy: float,
    ):

        predicted = self.model.predict(
            hour=hour,
            day_of_week=day_of_week,
            capacity=capacity,
            current_occupancy=current_occupancy,
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
            "predicted_occupancy": predicted,
            "predicted_percentage": round(predicted * 100, 2),
            "available_percentage": round(available * 100, 2),
            "status": status,
        }


prediction_service = PredictionService()
