# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.api import telemetry, images
from app.routers import auth
import asyncio
import json
import redis.asyncio as aioredis
import logging
from app.api.telemetry import manager
from app.core.security import close_redis
# DB init
Base.metadata.create_all(bind=engine)

# App + logging
app = FastAPI(title="Crop Monitoring API")
logger = logging.getLogger("app.main")
logging.basicConfig(level=logging.INFO)

# Redis channel to listen to (worker publishes to telemetry:all)
REDIS_CHANNEL = "telemetry:all"

@app.on_event("startup")
async def start_redis_pubsub():
    """
    Start a background reader task that:
      - connects to Redis
      - subscribes to REDIS_CHANNEL
      - polls pubsub.get_message(timeout=...) in a loop (safe to cancel)
      - on each message calls manager.broadcast(...)
      - reconnects on errors with backoff
    The created task is stored on app.state.redis_task so we can cancel it on shutdown.
    """
    async def reader():
        while True:
            r = None
            pubsub = None
            try:
                logger.info("Connecting to Redis at %s", settings.REDIS_URL)
                r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
                pubsub = r.pubsub()
                await pubsub.subscribe(REDIS_CHANNEL)
                logger.info("Subscribed to Redis channel %s", REDIS_CHANNEL)

                # Loop and poll get_message; this is cancellable and avoids async-generator close races.
                while True:
                    # timeout small so we can react quickly to cancellations
                    msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if not msg:
                        # yield control; nothing to do this iteration
                        await asyncio.sleep(0) 
                        continue

                    # msg example: {'type': 'message', 'pattern': None, 'channel': 'telemetry:all', 'data': '...'}
                    if msg.get("type") != "message":
                        continue

                    raw = msg.get("data")
                    try:
                        payload = json.loads(raw)
                    except Exception:
                        logger.warning("Received non-JSON Redis payload: %s", raw)
                        continue

                    device_id = payload.get("device_id")
                    try:
                        await manager.broadcast(device_id=device_id, payload=payload)
                    except Exception:
                        logger.exception("Error broadcasting payload")

            except asyncio.CancelledError:
                # Cancellation requested -> clean up and exit reader loop
                logger.info("Redis reader task cancelled; cleaning up and exiting")
                # attempt cleanup in finally block below
                break
            except Exception:
                # Log error and try to reconnect after backoff
                logger.exception("Unexpected error in Redis reader; reconnecting in 3s")
                await asyncio.sleep(3)
            finally:
                # best-effort cleanup of pubsub + connection
                try:
                    if pubsub is not None:
                        try:
                            await pubsub.unsubscribe(REDIS_CHANNEL)
                        except Exception:
                            pass
                        try:
                            await pubsub.close()
                        except Exception:
                            pass
                finally:
                    try:
                        if r is not None:
                            await r.close()
                    except Exception:
                        pass

        logger.info("Redis reader exiting")

    # start the reader background task and keep a reference to cancel later
    task = asyncio.create_task(reader(), name="redis-reader")
    app.state.redis_task = task
    logger.info("Started redis reader background task")

@app.on_event("shutdown")
async def stop_redis_pubsub():
    """
    Cancel and await the redis reader task on shutdown to avoid "Task was destroyed but it is pending".
    """
    task = getattr(app.state, "redis_task", None)
    if task:
        logger.info("Cancelling redis reader task...")
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            logger.info("Redis reader cancelled and awaited successfully")
        except Exception:
            logger.exception("Error waiting for redis reader task to finish")

# allow only your frontend origin so cookies work across ports
FRONTEND_ORIGIN = "http://localhost:5173"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# routers
app.include_router(telemetry.router)
app.include_router(images.router)
app.include_router(auth.router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.on_event("shutdown")
async def on_shutdown():
    await telemetry.stop_telemetry_pubsub_listener()
    await close_redis()

@app.on_event("startup")
async def on_startup():
    await telemetry.start_telemetry_pubsub_listener(app)


    