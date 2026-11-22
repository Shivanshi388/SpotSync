import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    force=True
)
from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.database.neo4j import initialize_neo4j, close_neo4j
from app.mqtt.subscriber import start_mqtt_subscriber, stop_mqtt_subscriber
from app.services.sensor_health_monitor import (
    start_sensor_health_monitor,
    stop_sensor_health_monitor,
)
from app.api.routes import auth, bookings, parking, payments, analytics
from app.api.routes.health import router as health_router
from app.websocket.parking_updates import router as websocket_router

app = FastAPI(
    title="SpotSync API",
    description="Smart parking management API",
    version="1.0.0",
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://spot-sync-seven.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_origin_regex=(
        r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+"
        r"|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[a-z0-9-]+\.ngrok-free\.app"
        r"|[a-z0-9-]+\.trycloudflare\.com|[a-z0-9-]+\.vercel\.app)(:\d+)?"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health-check endpoints
app.include_router(health_router)
app.include_router(websocket_router)

# Shared API routes, including predictions and recommendations
app.include_router(api_router)

# Legacy routes retained for existing frontend compatibility
app.include_router(auth.router)
app.include_router(parking.router)
app.include_router(bookings.router)
app.include_router(payments.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {"message": "SpotSync API is running"}



@app.on_event("startup")
def start_optional_mqtt():
    start_sensor_health_monitor()
    initialize_neo4j()
    # Start the MQTT subscriber whenever broker credentials exist, so a
    # missing MQTT_ENABLED flag can no longer silently disable live sensors.
    if settings.mqtt_enabled or settings.mqtt_username:
        start_mqtt_subscriber()


@app.on_event("shutdown")
def stop_optional_mqtt():
    stop_mqtt_subscriber()
    stop_sensor_health_monitor()
    close_neo4j()
