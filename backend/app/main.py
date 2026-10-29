import os

from fastapi import FastAPI

from app.api.router import api_router
from app.api.routes import auth, bookings, parking, payments, analytics
from app.api.routes.health import router as health_router

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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health-check endpoints
app.include_router(health_router)

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

