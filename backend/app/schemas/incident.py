from pydantic import BaseModel


class IncidentResponse(BaseModel):
    id: int
    parking_lot_id: int
    incident_type: str
    severity: str
    status: str
    description: str


class IncidentListResponse(BaseModel):
    incidents: list[IncidentResponse]
