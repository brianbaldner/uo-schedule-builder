# Multi-stage build for React frontend and Python backend

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/schedule-builder

# Copy package files and install dependencies
COPY schedule-builder/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY schedule-builder/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY main.py .
COPY class-scraper.ipynb .

# Copy the database (if it exists)
COPY classes.db* ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/schedule-builder/dist ./schedule-builder/dist

# Expose port
EXPOSE 8000

# Run the FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
