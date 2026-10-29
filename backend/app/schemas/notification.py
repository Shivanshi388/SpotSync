from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    is_read: bool


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
