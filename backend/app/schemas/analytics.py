from pydantic import BaseModel


class SlotAnalytics(BaseModel):
    total_slots: int
    available_slots: int
    occupied_slots: int


class PredictionAnalytics(BaseModel):
    prediction_count: int
    average_occupancy: float
    maximum_occupancy: float
    minimum_occupancy: float


class BookingAnalytics(BaseModel):
    total_bookings: int
    status_counts: dict[str, int]


class RevenueAnalytics(BaseModel):
    successful_payment_count: int
    gross_revenue: float
    processed_refunds: float
    net_revenue: float
    currency: str

class ParkingAnalyticsResponse(BaseModel):
    parking_lot_id: int
    slots: SlotAnalytics
    current_occupancy_rate: float
    predictions: PredictionAnalytics
    bookings: BookingAnalytics
    revenue: RevenueAnalytics
