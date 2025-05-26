# Image Moderation API 

A production-ready FastAPI-based service for automated image moderation (based on azure content safety API resource),  and MongoDB Atlas. Includes a minimal frontend for easy testing and demonstration.

---
![image](https://github.com/user-attachments/assets/dab75d19-fa2c-4489-8533-a8883ba6c61b)

### Confidence Scores
- 100% -> 100% confident it's safe
- 0% - > 0% confident it's safe (most severe) 

---

## Features

- **RESTful API** for image moderation with detailed safety reports
- **Token-based authentication** (admin/user roles)
- **Admin endpoints** for token management (create, list, delete)
- **MongoDB Atlas** for secure, cloud-based data storage
- **Azure Content Safety** integration for robust image analysis
- **Modern frontend** (HTML/CSS/JS) for uploading images and viewing results
- **Dockerized** for easy deployment and local development

---

## Prerequisites

- Docker & Docker Compose
- MongoDB Atlas account (for cloud database)
- Azure account with Content Safety resource

---

## Setup & Usage

### 1. Clone the repository
```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Configure environment variables
Create a `.env` file in the project root (see `.env.example`):
```
MONGODB_URL=your_mongodb_atlas_connection_string
CONTENT_SAFETY_ENDPOINT=your_azure_content_safety_endpoint
CONTENT_SAFETY_KEY=your_azure_content_safety_key
```

### 3. Build and run with Docker Compose
```bash
docker-compose up --build
```
- Backend: [http://localhost:7000](http://localhost:7000)
- Frontend: [http://localhost](http://localhost)

### 4. First-time admin setup
- On first run, an **initial admin token** is printed in the backend logs. Copy this token!
- Use this token to create user tokens and manage access.

---

## API Endpoints

### Authentication (Admin Only*)
- `POST /auth/tokens` — Create a new token 
- `GET /auth/tokens` — List all tokens
- `DELETE /auth/tokens/{token}` — Delete a token

#### Note*
- admin token is created when application starts and is used to access admin endpoints

### Moderation
- `POST /moderate` — Upload and analyze an image (requires any valid token)

---

## Frontend Usage
1. Open [http://localhost](http://localhost) in your browser
2. Paste your token (admin or user) in the authentication field
3. Upload an image for moderation
4. View the safety report and see your image preview

---

## Development & Local Testing
- You can run the backend locally with `uvicorn main:app --reload --port 7000`
- Serve the frontend with any static server (e.g., `python3 -m http.server 8000` in the `frontend` folder)
- All dependencies are listed in `requirements.txt`

---

## Security & Best Practices
- All endpoints require a valid bearer token
- Only admin tokens can manage other tokens
- Use strong, unique tokens and keep your `.env` file secure
- CORS is enabled for demo purposes (all origins allowed); restrict in production


