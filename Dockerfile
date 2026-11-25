FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependensi sistem untuk OpenCV (termasuk libgl1 agar ultralytics/cv2 tidak error libGL.so.1) & Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libxcb1 \
    && rm -rf /var/lib/apt/lists/*

# Install dependensi Python (CPU PyTorch + Ultralytics + FastAPI + PostgreSQL)
COPY requirements-cloud.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements-cloud.txt \
    && pip uninstall -y opencv-python || true \
    && pip install --force-reinstall --no-deps opencv-python-headless

# Salin source code backend, model YOLOv8, static files, dan production web bundle (mobile-app/dist)
COPY src ./src
COPY models ./models
COPY static ./static
COPY mobile-app/dist ./mobile-app/dist

EXPOSE 8000

CMD ["sh", "-c", "uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
