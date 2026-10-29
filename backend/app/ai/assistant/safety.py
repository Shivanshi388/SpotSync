def is_safe_request(message: str) -> bool:
    blocked_terms = [
        "hack",
        "bypass payment",
        "steal",
        "fraud",
        "credential",
        "password",
    ]

    normalized = message.lower()

    return not any(
        term in normalized
        for term in blocked_terms
    )


def safety_response() -> str:
    return (
        "I can help with parking, bookings, availability, "
        "predictions, pricing, and SpotSync services."
    )
