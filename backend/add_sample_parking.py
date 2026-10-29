from app.core.database import SessionLocal
from app.models.parking_lot import ParkingLot
from app.models.parking_slot import ParkingSlot

db = SessionLocal()

try:
    if db.query(ParkingLot).count() > 0:
        print("Parking lots already exist. No data added.")
    else:
        lots = [
            ParkingLot(
                name="City Center Parking",
                address="City Center, Ghaziabad",
                total_slots=10,
                is_active=True,
            ),
            ParkingLot(
                name="Metro Plaza Parking",
                address="Metro Plaza, Ghaziabad",
                total_slots=10,
                is_active=True,
            ),
            ParkingLot(
                name="Tech Park Parking",
                address="Tech Park, Ghaziabad",
                total_slots=10,
                is_active=True,
            ),
        ]

        db.add_all(lots)
        db.flush()

        for lot in lots:
            available_count = {
                "City Center Parking": 7,
                "Metro Plaza Parking": 4,
                "Tech Park Parking": 8,
            }[lot.name]

            slots = [
                ParkingSlot(
                    parking_lot_id=lot.id,
                    slot_number=f"S{i:02}",
                    is_available=i <= available_count,
                )
                for i in range(1, 11)
            ]
            db.add_all(slots)

        db.commit()
        print("Sample parking data added successfully.")

except Exception:
    db.rollback()
    raise

finally:
    db.close()