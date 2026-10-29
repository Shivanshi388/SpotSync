from pydantic import BaseModel, Field


class AssistantRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
    )
    context: dict = {}


class AssistantResponse(BaseModel):
    response: str
    intent: str
    context: dict
