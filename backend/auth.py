from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_token

security = HTTPBearer()

async def get_current_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    token_doc = await get_token(token)
    if not token_doc:
        raise HTTPException(status_code=401, detail="Invalid token")
    return token_doc

async def is_admin(token_doc: dict = Depends(get_current_token)):
    if not token_doc.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access needed for this action")
    return token_doc 