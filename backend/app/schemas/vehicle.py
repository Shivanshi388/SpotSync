from pydantic import BaseModel, Field


class VehicleCreateRequest(BaseModel):
    registration_number: str = Field(
        ...,
        min_length=2,
        max_length=30,
    )
    vehicle_type: str = Field(
        ...,
        min_length=2,
        max_length=30,
    )


class VehicleResponse(BaseModel):
    id: int
    user_id: int
    vehicle_number: str
    vehicle_type: str


class VehicleListResponse(BaseModel):
    vehicles: list[VehicleResponse]
