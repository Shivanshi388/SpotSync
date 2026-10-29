from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    parking_lot_id: Mapped[int] = mapped_column(
        ForeignKey("parking_lots.id"),
        nullable=False,
    )

    predicted_occupancy: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    prediction_hour: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    prediction_day: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
