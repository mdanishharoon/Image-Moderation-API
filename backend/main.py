from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime
from typing import List

from models import Token, TokenCreate, ModerationResult
from database import create_token, list_tokens, delete_token, get_admin_token
from auth import get_current_token, is_admin
from moderation import moderate_image

app = FastAPI(title="Image Moderation API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
@app.post("/auth/tokens", response_model=Token)
async def create_token_route(token_data: TokenCreate, _: dict = Depends(is_admin)):
    token = os.urandom(32).hex()
    token_doc = {
        "token": token,
        "is_admin": token_data.is_admin,
        "created_at": datetime.utcnow()
    }
    await create_token(token_doc)
    return token_doc

@app.get("/auth/tokens", response_model=List[Token])
async def list_tokens_route(_: dict = Depends(is_admin)):
    return await list_tokens()

@app.delete("/auth/tokens/{token}")
async def delete_token_route(token: str, _: dict = Depends(is_admin)):
    result = await delete_token(token)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Token not found")
    return {"message": "Token deleted successfully"}

@app.post("/moderate", response_model=ModerationResult)
async def moderate_image_route(
    file: UploadFile = File(...),
    token_doc: dict = Depends(get_current_token)
):
    contents = await file.read()
    return await moderate_image(contents, token_doc)

# Create initial admin token on startup
@app.on_event("startup")
async def create_initial_admin_token():
    admin_token = await get_admin_token()
    if not admin_token:
        token = os.urandom(32).hex()
        token_doc = {
            "token": token,
            "is_admin": True,
            "created_at": datetime.utcnow()
        }
        await create_token(token_doc)
        print("\n=== Initial Admin Token ===")
        print(f"Token: {token}")
        print("==========================\n")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7000) 