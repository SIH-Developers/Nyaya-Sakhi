"""
Root-level ASGI entrypoint shim for Render and cloud deployments.
Re-exports the FastAPI app from backend.api so that:
  - `uvicorn api:api --host 0.0.0.0 --port $PORT`
  - `uvicorn api:app --host 0.0.0.0 --port $PORT`
  - `uvicorn backend.api:api --host 0.0.0.0 --port $PORT`
all work seamlessly.
"""
from backend.api import api

# Also alias app -> api so either variable name works
app = api

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.api:api", host="0.0.0.0", port=port)
