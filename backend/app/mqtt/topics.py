OCCUPANCY_TOPIC = "spotsync/parking/{slot_id}/occupancy"


def occupancy_topic(slot_id: str) -> str:
    return OCCUPANCY_TOPIC.format(slot_id=slot_id)