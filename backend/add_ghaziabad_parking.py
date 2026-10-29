from app.core.database import SessionLocal
from app.models.parking_lot import ParkingLot
from app.models.parking_slot import ParkingSlot

PARKING_DATA = [
    {
        "name": "City Center Parking",
        "address": "City Center, Ghaziabad",
        "latitude": 28.6692,
        "longitude": 77.4538,
        "available": 7,
    },
    {
        "name": "Metro Plaza Parking",
        "address": "Metro Plaza, Ghaziabad",
        "latitude": 28.6615,
        "longitude": 77.4412,
        "available": 4,
    },
    {
        "name": "Tech Park Parking",
        "address": "Tech Park, Ghaziabad",
        "latitude": 28.6848,
        "longitude": 77.4330,
        "available": 8,
    },
]

db = SessionLocal()

try:
    for item in PARKING_DATA:
        lot = (
            db.query(ParkingLot)
            .filter(ParkingLot.name == item["name"])
            .first()
        )

        if lot is None:
            lot = ParkingLot(
                name=item["name"],
                address=item["address"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                total_slots=10,
                is_active=True,
            )
            db.add(lot)
            db.flush()
            print(f"Added: {lot.name}")
        else:
            print(f"Already exists: {lot.name}")

            # Update location details without changing existing bookings.
            lot.address = item["address"]
            lot.latitude = item["latitude"]
            lot.longitude = item["longitude"]
            lot.total_slots = 10
            lot.is_active = True

        existing_slots = (
            db.query(ParkingSlot)
            .filter(ParkingSlot.parking_lot_id == lot.id)
            .all()
        )

        existing_numbers = {slot.slot_number for slot in existing_slots}

        for i in range(1, 11):
            slot_number = f"S{i:02}"
            if slot_number not in existing_numbers:
                db.add(
                    ParkingSlot(
                        parking_lot_id=lot.id,
                        slot_number=slot_number,
                        is_available=i <= item["available"],
                    )
                )

    db.commit()
    print("\nGhaziabad parking data added successfully.")

except Exception:
    db.rollback()
    raise
finally:
    db.close()
