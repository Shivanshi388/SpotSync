from app.ai.inference.predictor import model


def get_prediction_model():
    return model


def get_model_info():
    return {
        "model_type": "RandomForestRegressor",
        "features": [
            "hour",
            "day_of_week",
            "capacity",
            "current_occupancy",
        ],
        "model_path": str(model.__class__.__name__),
    }
