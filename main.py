from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import motor.motor_asyncio
from pymongo.server_api import ServerApi
from bson import ObjectId
import os
from dotenv import load_dotenv
from azure.ai.contentsafety import ContentSafetyClient
from azure.ai.contentsafety.models import AnalyzeImageOptions, ImageData, ImageCategory
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError

load_dotenv()

app = FastAPI(title="Image Moderation API")

#cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    # (I didnt really set a specific origin, so I just allowed all since this is just a test ig)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#MongoDB 
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL, server_api=ServerApi('1'))
db = client.image_moderation

# Azure Content Safety object
CONTENT_SAFETY_ENDPOINT = os.getenv("CONTENT_SAFETY_ENDPOINT")
CONTENT_SAFETY_KEY = os.getenv("CONTENT_SAFETY_KEY")
content_safety_client = ContentSafetyClient(CONTENT_SAFETY_ENDPOINT, AzureKeyCredential(CONTENT_SAFETY_KEY))

security = HTTPBearer()

# Models
class Token(BaseModel):
    token: str
    is_admin: bool
    created_at: datetime

class TokenCreate(BaseModel):
    is_admin: bool = False

class Usage(BaseModel):
    token: str
    endpoint: str
    timestamp: datetime

class CategoryAnalysis(BaseModel):
    category: str
    severity: int

class ModerationResult(BaseModel):
    is_safe: bool
    categories: dict
    confidence: float

async def get_current_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    token_doc = await db.tokens.find_one({"token": token})
    if not token_doc:
        raise HTTPException(status_code=401, detail="Invalid token")
    return token_doc

async def is_admin(token_doc: dict = Depends(get_current_token)):
    if not token_doc.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access needed for this action")
    return token_doc

# Routes
@app.post("/auth/tokens", response_model=Token)
async def create_token(token_data: TokenCreate, _: dict = Depends(is_admin)):
    token = os.urandom(32).hex()
    token_doc = {
        "token": token,
        "is_admin": token_data.is_admin,
        "created_at": datetime.utcnow()
    }
    await db.tokens.insert_one(token_doc)
    return token_doc

@app.get("/auth/tokens", response_model=List[Token])
async def list_tokens(_: dict = Depends(is_admin)):
    tokens = await db.tokens.find().to_list(length=None)
    return tokens

@app.delete("/auth/tokens/{token}")
async def delete_token(token: str, _: dict = Depends(is_admin)):
    result = await db.tokens.delete_one({"token": token})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Token not found")
    return {"message": "Token deleted successfully"}

@app.post("/moderate", response_model=ModerationResult)
async def moderate_image(
    file: UploadFile = File(...),
    token_doc: dict = Depends(get_current_token)
):
    try:
        
        contents = await file.read()
        print(f"File received: {file.filename}, size: {len(contents)} bytes")
        
        request = AnalyzeImageOptions(image=ImageData(content=contents))
        
        if not CONTENT_SAFETY_ENDPOINT or not CONTENT_SAFETY_KEY:
            raise HTTPException(
                status_code=500,
                detail="Azure Content Safety credentials not configured"
            )
        
        # analyze image using Azure Content Safety
        response = content_safety_client.analyze_image(request)
        print("Azure Content Safety analysis completed")
        
        # process the results
        categories = {}
        max_severity = 0
        
        for category in response.categories_analysis:
            category_name = category.category.lower()
            categories[category_name] = category.severity
            max_severity = max(max_severity, category.severity)
        
        # determine if the image is safe (severity 0-2 is considered safe)
        is_safe = max_severity <= 2
        
        # calculate confidence (inverse of max severity, normalized to 0-1)
        confidence = 1 - (max_severity / 7)  # 7 is the maximum severity level
        
        result = {
            "is_safe": is_safe,
            "categories": categories,
            "confidence": confidence
        }
        
        # Log usage
        usage = {
            "token": token_doc["token"],
            "endpoint": "/moderate",
            "timestamp": datetime.utcnow()
        }
        await db.usages.insert_one(usage)
        
        return result
        
    except HttpResponseError as e:
        print(f"Azure Content Safety API error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Content Safety API error: {str(e)}"
        )
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )

# Create initial admin token on startup
@app.on_event("startup")
async def create_initial_admin_token():
    # Check if any admin token exists
    admin_token = await db.tokens.find_one({"is_admin": True})
    if not admin_token:
        # Create initial admin token
        token = os.urandom(32).hex()
        token_doc = {
            "token": token,
            "is_admin": True,
            "created_at": datetime.utcnow()
        }
        await db.tokens.insert_one(token_doc)
        print("\n=== Initial Admin Token ===")
        print(f"Token: {token}")
        print("==========================\n")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7000) 