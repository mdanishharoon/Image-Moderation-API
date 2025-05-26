from pydantic import BaseModel
from datetime import datetime
from typing import List

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