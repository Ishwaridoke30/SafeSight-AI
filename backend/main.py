
from io import BytesIO
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO

app = FastAPI(title="SafeSight AI API")

# Load the trained PPE detection model once
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "best.pt"

try:
    model = YOLO(str(MODEL_PATH))
    MODEL_CONNECTED = True
    print("SafeSight AI PPE model loaded successfully.")
    print("Supported classes:", model.names)
except Exception as exc:
    model = None
    MODEL_CONNECTED = False
    print("Could not load PPE model:", exc)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "SafeSight AI backend is running",
        "ai_model_connected": MODEL_CONNECTED,
        "supported_classes": (
            list(model.names.values()) if model else []
        ),
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "ai_model_connected": MODEL_CONNECTED,
    }


@app.post("/inspect")
async def inspect_image(file: UploadFile = File(...)):
    if not MODEL_CONNECTED or model is None:
        raise HTTPException(
            status_code=503,
            detail="The PPE detection model is not available.",
        )

    allowed_types = ["image/jpeg", "image/png", "image/webp"]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Upload a JPG, PNG, or WEBP image.",
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 10 MB.",
        )

    try:
        # Validate the uploaded image
        with Image.open(BytesIO(contents)) as image:
            image.verify()

        # Reopen the image for AI inference
        with Image.open(BytesIO(contents)) as image:
            image = image.convert("RGB")

        # Run PPE detection
        results = model.predict(
            source=image,
            conf=0.25,
            verbose=False,
        )

        detections = []

        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                class_id = int(box.cls.item())
                confidence = float(box.conf.item())
                coordinates = box.xyxy[0].tolist()

                detections.append({
                    "class_name": model.names[class_id],
                    "confidence": round(confidence, 4),
                    "bbox": [
                        round(float(value), 2)
                        for value in coordinates
                    ],
                })

    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        )
    except Exception as exc:
        print("PPE inference error:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="AI image detection failed. Check the backend terminal.",
        )

    return {
        "filename": file.filename,
        "message": "AI image detection completed successfully.",
        "ai_model_connected": True,
        "detection_status": "evaluated",
        "total_detections": len(detections),
        "detections": detections,
    }
