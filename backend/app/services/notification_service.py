from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.notification import Notification


class NotificationService:

    def create(
        self,
        db: Session,
        user_id: int,
        title: str,
        message: str,
        notification_type: str = "info",
    ):
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        return notification

    def get_user_notifications(
        self,
        db: Session,
        user_id: int,
    ):
        return (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.id.desc())
            .all()
        )


notification_service = NotificationService()
