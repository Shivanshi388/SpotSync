from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class BookingCreate(BaseModel):
    vehicle_id: int
    parking_slot_id: int
    start_time: datetime
    end_time: datetime


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    vehicle_id: int
    parking_slot_id: int
    start_time: datetime
    end_time: datetime
    status: str
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime


class BookingCancellationResponse(BookingResponse):
    demo_mode: bool = False
    demo_refund_simulated: bool = False
    message: str
