from sqlalchemy import Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parking_lot_id: Mapped[int] = mapped_column(
        ForeignKey("parking_lots.id"),
        nullable=False,
    )
    incident_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    severity: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="open",
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
