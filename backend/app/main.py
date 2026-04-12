import asyncio
import json
import logging
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import agent, analytics, applications, auth, geo, jobs, preferences, resumes, users
from app.core.config import settings
from app.core.database import engine

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections for agent log streaming."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user {user_id}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        self.active_connections[user_id].remove(websocket)
        if not self.active_connections[user_id]:
            del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_log(self, user_id: str, message: dict):
        connections = self.active_connections.get(user_id, [])
        disconnected = []
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(user_id, ws)


ws_manager = WebSocketManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting JobCatcher backend...")
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("Database connection verified")
    yield
    logger.info("Shutting down JobCatcher backend...")
    await engine.dispose()


app = FastAPI(
    title="JobCatcher API",
    description="AI-powered autonomous job application platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(preferences.router)
app.include_router(resumes.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(agent.router)
app.include_router(analytics.router)
app.include_router(geo.router)


@app.get("/health")
async def health_check():
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {e}"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "environment": settings.ENVIRONMENT,
        "database": db_status,
    }


@app.websocket("/ws/agent/logs")
async def agent_logs_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    try:
        from app.core.security import verify_token

        payload = verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception:
        ws_manager.disconnect(user_id, websocket)
