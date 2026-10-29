from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Sensor(Base):
    __tablename__ = "sensors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parking_lot_id: Mapped[int] = mapped_column(
        ForeignKey("parking_lots.id"),
        nullable=False,
    )
    sensor_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    is_online: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
