from fastapi import APIRouter

from app.ai.assistant.assistant import assistant
from app.schemas.assistant import (
    AssistantRequest,
    AssistantResponse,
)


router = APIRouter(
    prefix="/assistant",
    tags=["AI Assistant"],
)


@router.post(
    "/chat",
    response_model=AssistantResponse,
)
def chat(request: AssistantRequest):
    return assistant.respond(
        message=request.message,
        context=request.context,
    )
