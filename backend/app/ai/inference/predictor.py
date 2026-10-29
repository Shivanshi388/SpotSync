from pathlib import Path
import joblib
import numpy as np

from sklearn.ensemble import RandomForestRegressor


MODEL_DIR = Path(__file__).resolve().parents[3] / "ml_models"
MODEL_DIR.mkdir(exist_ok=True)

MODEL_PATH = MODEL_DIR / "parking_occupancy.joblib"


class ParkingOccupancyModel:

    def __init__(self):
        self.model = None
        self.load_or_train()

    def load_or_train(self):
        if MODEL_PATH.exists():
            self.model = joblib.load(MODEL_PATH)
            return

        self.train()

    def train(self):
        rng = np.random.default_rng(42)

        samples = 1000

        hour = rng.integers(0, 24, samples)
        day_of_week = rng.integers(0, 7, samples)
        capacity = rng.integers(30, 301, samples)
        current_occupancy = rng.uniform(0.05, 0.95, samples)

        rush_hour = (
            ((hour >= 8) & (hour <= 10))
            | ((hour >= 17) & (hour <= 20))
        ).astype(float)

        weekend = (day_of_week >= 5).astype(float)

        target = (
            0.25
            + (current_occupancy * 0.55)
            + (rush_hour * 0.12)
            - (weekend * 0.08)
            + rng.normal(0, 0.04, samples)
        )

        target = np.clip(target, 0, 1)

        X = np.column_stack(
            [
                hour,
                day_of_week,
                capacity,
                current_occupancy,
            ]
        )

        self.model = RandomForestRegressor(
            n_estimators=150,
            max_depth=10,
            random_state=42,
        )

        self.model.fit(X, target)

        joblib.dump(self.model, MODEL_PATH)

    def predict(
        self,
        hour: int,
        day_of_week: int,
        capacity: int,
        current_occupancy: float,
    ) -> float:

        X = np.array(
            [
                [
                    hour,
                    day_of_week,
                    capacity,
                    current_occupancy,
                ]
            ]
        )

        prediction = float(self.model.predict(X)[0])

        return round(float(np.clip(prediction, 0, 1)), 4)


model = ParkingOccupancyModel()
