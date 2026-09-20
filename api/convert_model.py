
import tensorflow as tf
import os

# Chemin du modèle Keras
keras_model_path = "../models/1.keras"

# Dossier de sortie SavedModel
saved_model_path = "../models/saved_model"

print("Loading model...")

model = tf.keras.models.load_model(
    keras_model_path,
    compile=False
)

print("Model loaded successfully!")
print("Input shape:", model.input_shape)
print("Output shape:", model.output_shape)

# Supprimer l'ancien SavedModel s'il existe
if os.path.exists(saved_model_path):
    import shutil
    shutil.rmtree(saved_model_path)

print("\nExporting SavedModel...")

model.export(saved_model_path)

print("\nSavedModel created successfully!")
print("Location:", os.path.abspath(saved_model_path))
