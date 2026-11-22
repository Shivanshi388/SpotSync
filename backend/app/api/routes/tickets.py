from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db, require_admin
from app.schemas.ticket import (
    TicketCreateResponse,
    TicketValidationRequest,
    TicketValidationResponse,
)
from app.services.ticket_service import (
    generate_session_ticket,
    validate_session_ticket,
    exit_session_with_ticket,
)



from app.models.parking_session import ParkingSession
from app.models.parking_slot import ParkingSlot
from app.models.vehicle import Vehicle
from app.models.floor import Floor

router = APIRouter(prefix="/tickets", tags=["Parking Tickets"])


def _driver_route(slot_id):
    """Neo4j route for the QR page, flattened into simple steps. Never raises."""
    if not slot_id:
        return []
    try:
        from app.services.navigation_service import get_route_details
        details = get_route_details(slot_id)
    except Exception:
        return []
    if not details:
        return []

    steps = []
    for index, node in enumerate(details.get("route") or [], start=1):
        props = {
            key: (value if isinstance(value, (str, int, float, bool)) or value is None else str(value))
            for key, value in dict(node.get("properties") or {}).items()
        }
        labels = node.get("labels") or []
        name = (
            props.get("name") or props.get("display_code")
            or props.get("code") or props.get("id")
            or (labels[0] if labels else f"Point {index}")
        )
        kind = labels[0] if labels else "Point"
        steps.append({
            **props,
            "step": index,
            "type": kind,
            "name": str(name),
            "label": str(name),
            "instruction": f"{'Arrive at' if index == len(details['route']) else 'Proceed via'} {kind} {name}",
        })
    return steps


@router.post(
    "/sessions/{session_id}",
    response_model=TicketCreateResponse,
)
def create_ticket(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return generate_session_ticket(
        db,
        session_id=session_id,
        user_id=current_user.id,
    )


@router.post(
    "/validate",
    response_model=TicketValidationResponse,
)
def validate_ticket(
    request: TicketValidationRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return validate_session_ticket(db, request.token)


@router.post("/exit")
def exit_with_ticket(
    request: TicketValidationRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    return exit_session_with_ticket(db, request.token)


@router.get("/driver/{token}")
def get_public_driver_ticket(
    token: str,
    db: Session = Depends(get_db),
):
    """Validate a QR ticket and return only its active driver's parking details."""
    ticket = validate_session_ticket(db, token)

    session = db.get(ParkingSession, ticket["session_id"])
    if session is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Parking session not found")

    slot = db.get(ParkingSlot, session.parking_slot_id)
    vehicle = db.get(Vehicle, session.vehicle_id) if session.vehicle_id else None
    floor = db.get(Floor, slot.floor_id) if slot and slot.floor_id else None

    return {
        "valid": True,
        "status": session.status,
        "session_id": session.id,
        "vehicle": {
            "registration_number": vehicle.vehicle_number if vehicle else None,
            "vehicle_type": vehicle.vehicle_type if vehicle else None,
        },
        "slot": {
            "slot_number": (slot.display_code or slot.slot_number) if slot else None,
            "floor": floor.floor_code if floor else None,
            "floor_name": floor.floor_name if floor else None,
        },
        "route": _driver_route(slot.id if slot else None),
        "message": "Ticket validated successfully.",
    }
