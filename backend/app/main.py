from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.api import telemetry, images
from app.routers import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title='Crop Monitoring API')

# CORS: allow your frontend (dev & docker)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod (e.g. ["http://localhost:5173"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(telemetry.router)
app.include_router(images.router)
app.include_router(auth.router)

@app.get('/health')
def health():
    return {'status':'ok'}
