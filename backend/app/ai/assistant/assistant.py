from app.ai.assistant.prompts import SYSTEM_PROMPT
from app.ai.assistant.safety import (
    is_safe_request,
    safety_response,
)


class SpotSyncAssistant:

    def __init__(self):
        self.system_prompt = SYSTEM_PROMPT

    def respond(
        self,
        message: str,
        context: dict | None = None,
    ):
        if not is_safe_request(message):
            return {
                "response": safety_response(),
                "intent": "unsupported",
            }

        normalized = message.lower()

        if any(
            word in normalized
            for word in ["parking", "park", "spot"]
        ):
            intent = "parking"

        elif any(
            word in normalized
            for word in ["book", "booking", "reserve"]
        ):
            intent = "booking"

        elif any(
            word in normalized
            for word in ["price", "cost", "rate"]
        ):
            intent = "pricing"

        elif any(
            word in normalized
            for word in ["available", "availability", "free"]
        ):
            intent = "availability"

        else:
            intent = "general"

        responses = {
            "parking": (
                "I can help you find and compare parking "
                "options using SpotSync availability and predictions."
            ),
            "booking": (
                "I can help with parking bookings and "
                "booking status."
            ),
            "pricing": (
                "I can help compare parking prices "
                "across available locations."
            ),
            "availability": (
                "I can check parking availability and "
                "predicted occupancy."
            ),
            "general": (
                "I can help with parking, availability, "
                "predictions, bookings, and pricing."
            ),
        }

        return {
            "response": responses[intent],
            "intent": intent,
            "context": context or {},
        }


assistant = SpotSyncAssistant()
