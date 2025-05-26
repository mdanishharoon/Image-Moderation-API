import os
import motor.motor_asyncio
from pymongo.server_api import ServerApi
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL, server_api=ServerApi('1'))
db = client.image_moderation

# Database operations
async def get_token(token: str):
    return await db.tokens.find_one({"token": token})

async def create_token(token_doc: dict):
    return await db.tokens.insert_one(token_doc)

async def list_tokens():
    return await db.tokens.find().to_list(length=None)

async def delete_token(token: str):
    return await db.tokens.delete_one({"token": token})

async def log_usage(usage: dict):
    return await db.usages.insert_one(usage)

async def get_admin_token():
    return await db.tokens.find_one({"is_admin": True}) 