from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
from io import BytesIO
from PIL import Image
import requests
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# ============================================================
# CORS
# ============================================================

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# TensorFlow Serving
# ============================================================

# Le nom du modèle sera défini lorsque nous lancerons
# TensorFlow Serving.
endpoint = os.getenv(
    "TF_SERVING_URL",
    "http://localhost:8501/v1/models/pepper_model:predict"
)

# ============================================================
# Classes
# ============================================================

CLASS_NAMES = [
    "Pepper__bell___Bacterial_spot",
    "Pepper__bell___healthy"
]


# ============================================================
# Health check
# ============================================================

@app.get("/ping")
async def ping():
    return {"message": "Hello, I am alive"}


# ============================================================
# Image preprocessing
# ============================================================

def read_file_as_image(data: bytes) -> np.ndarray:

    image = Image.open(
        BytesIO(data)
    ).convert("RGB")

    # Le modèle attend :
    # (256, 256, 3)
    image = image.resize((256, 256))

    image = np.array(
        image,
        dtype=np.float32
    )

    # IMPORTANT :
    # Ne pas ajouter /255.0 tant que nous n'avons pas
    # confirmé que le modèle a été entraîné avec cette
    # normalisation.

    return image


# ============================================================
# Prediction
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...)
):

    # Lire l'image
    image = read_file_as_image(
        await file.read()
    )

    # Ajouter la dimension batch
    #
    # (256, 256, 3)
    #       ↓
    # (1, 256, 256, 3)

    img_batch = np.expand_dims(
        image,
        axis=0
    )

    # Préparer la requête pour TensorFlow Serving
    json_data = {
        "instances": img_batch.tolist()
    }

    try:

        response = requests.post(
            endpoint,
            json=json_data,
            timeout=30
        )

        response.raise_for_status()

    except requests.exceptions.RequestException as e:

        return {
            "error": "TensorFlow Serving is unavailable",
            "details": str(e)
        }

    # Récupérer la prédiction
    result = response.json()

    prediction = np.array(
        result["predictions"][0]
    )

    # Classe prédite
    predicted_index = int(
        np.argmax(prediction)
    )

    predicted_class = CLASS_NAMES[
        predicted_index
    ]

    # Confiance
    confidence = float(
        np.max(prediction)
    )

    return {
        "class": predicted_class,
        "confidence": confidence
    }


# ============================================================
# Run
# ============================================================

if __name__ == "__main__":

    uvicorn.run(
        app,
        host="localhost",
        port=8000
    )
