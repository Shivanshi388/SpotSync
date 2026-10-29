from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.connection_manager import connection_manager


router = APIRouter(
    prefix="/ws",
    tags=["WebSocket"],
)


@router.websocket("/parking")
async def parking_updates(websocket: WebSocket):
    await connection_manager.connect(websocket)

    try:
        while True:
            message = await websocket.receive_json()

            await connection_manager.broadcast(
                {
                    "type": "parking_update",
                    "data": message,
                }
            )

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
