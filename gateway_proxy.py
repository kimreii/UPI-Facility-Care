import asyncio
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Gateway Proxy for Tunnel")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:8081"

client = httpx.AsyncClient(timeout=60.0)

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
async def proxy(request: Request, path: str = ""):
    is_api = (
        path.startswith("api/") or 
        path.startswith("uploads/") or 
        path.startswith("docs") or 
        path.startswith("openapi.json") or
        path.startswith("static/annotated/")
    )
    target_base = BACKEND_URL if is_api else FRONTEND_URL
    url = f"{target_base}/{path}"
    if request.url.query:
        url += f"?{request.url.query}"
    
    body = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)
    
    try:
        res = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body
        )
        # Filter hop-by-hop headers
        resp_headers = {k: v for k, v in res.headers.items() if k.lower() not in ["content-encoding", "transfer-encoding", "content-length"]}
        return Response(
            content=res.content,
            status_code=res.status_code,
            headers=resp_headers,
            media_type=res.headers.get("content-type")
        )
    except Exception as e:
        return Response(content=f"Proxy error: {str(e)}", status_code=502)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5050)
