from app.core.database import SessionLocal
from app.models.sensor import Sensor
from app.models.parking_slot import ParkingSlot

db = SessionLocal()
try:
    print("\n========== SENSOR MAPPINGS ==========")
    for s in db.query(Sensor).order_by(Sensor.id).all():
        slot = db.get(ParkingSlot, s.parking_slot_id) if s.parking_slot_id else None
        print({
            "sensor_code": s.sensor_code,
            "sensor_type": s.sensor_type,
            "parking_slot_id": s.parking_slot_id,
            "actual_slot": slot.slot_number if slot else None,
            "is_online": s.is_online
        })
finally:
    db.close()
