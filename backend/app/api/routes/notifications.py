from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.schemas.notification import NotificationListResponse
from app.services.notification_service import notification_service


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get(
    "",
    response_model=NotificationListResponse,
)
def get_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notifications = notification_service.get_user_notifications(
        db=db,
        user_id=current_user.id,
    )

    return {
        "notifications": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "title": item.title,
                "message": item.message,
                "notification_type": item.notification_type,
                "is_read": item.is_read,
            }
            for item in notifications
        ]
    }
