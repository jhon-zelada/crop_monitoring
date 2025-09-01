from fastapi import FastAPI, WebSocket
from app.core.config import settings
from app.db.session import engine, Base
from app.api import telemetry, images

# create tables automatically (scaffold convenience)
Base.metadata.create_all(bind=engine)

app = FastAPI(title='Crop Monitoring API')

app.include_router(telemetry.router)
app.include_router(images.router)

# simple websocket endpoint (for live updates)
@app.websocket('/ws/live')
async def ws_live(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # echo for now
            await websocket.send_text(f'echo: {data}')
    except Exception:
        await websocket.close()

@app.get('/health')
def health():
    return {'status':'ok'}