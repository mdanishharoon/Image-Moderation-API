import os
from fastapi import HTTPException
from azure.ai.contentsafety import ContentSafetyClient
from azure.ai.contentsafety.models import AnalyzeImageOptions, ImageData
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from datetime import datetime
from database import log_usage

# Azure Content Safety setup
CONTENT_SAFETY_ENDPOINT = os.getenv("CONTENT_SAFETY_ENDPOINT")
CONTENT_SAFETY_KEY = os.getenv("CONTENT_SAFETY_KEY")
content_safety_client = ContentSafetyClient(CONTENT_SAFETY_ENDPOINT, AzureKeyCredential(CONTENT_SAFETY_KEY))

async def moderate_image(contents: bytes, token_doc: dict):
    try:
        request = AnalyzeImageOptions(image=ImageData(content=contents))
        
        if not CONTENT_SAFETY_ENDPOINT or not CONTENT_SAFETY_KEY:
            raise HTTPException(
                status_code=500,
                detail="Azure Content Safety credentials not configured"
            )
        
        response = content_safety_client.analyze_image(request)
        
        categories = {}
        max_severity = 0
        
        for category in response.categories_analysis:
            category_name = category.category.lower()
            categories[category_name] = category.severity
            max_severity = max(max_severity, category.severity)
        
        # determine if the image is safe (severity 0-2 is considered safe)
        is_safe = max_severity <= 2
        
        # calculate confidence (inverse of max severity, normalized to 0-1)
        confidence = 1 - (max_severity / 7) #(7 was the max severity level in the api)
        
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
        await log_usage(usage)
        
        return result
        
    except HttpResponseError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Content Safety API error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        ) 