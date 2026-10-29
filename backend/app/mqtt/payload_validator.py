from pydantic import BaseModel, ConfigDict


class SensorPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sensor_id: str
    slot_id: str
    status: str
    distance_cm: float
    timestamp: str