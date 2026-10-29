from pydantic import BaseModel, Field


class SensorEventRequest(BaseModel):
    sensor_id: int = Field(..., gt=0)
    event_type: str = Field(..., min_length=1, max_length=100)
    value: float | None = None
    payload: dict = {}


class SensorEventResponse(BaseModel):
    id: int
    sensor_id: int
    event_type: str
    value: float | None
    payload: dict
