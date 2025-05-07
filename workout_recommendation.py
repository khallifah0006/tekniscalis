import argparse
import numpy as np
import pandas as pd
import tensorflow as tf
import json
import sys
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
import warnings
warnings.filterwarnings('ignore')

# Parse command line arguments
parser = argparse.ArgumentParser(description='Workout Recommendation System')
parser.add_argument('--age', type=float, required=True, help='Age in years')
parser.add_argument('--height', type=float, required=True, help='Height in cm')
parser.add_argument('--weight', type=float, required=True, help='Weight in kg')
args = parser.parse_args()

# Assign variables from command line arguments
umur = args.age
tinggi = args.height
berat = args.weight

# Calculate BMI and determine category
def calculate_bmi_category(weight, height):
    # Height in meters, weight in kg
    height_m = height / 100
    bmi = weight / (height_m ** 2)
    
    if bmi < 18.5:
        return "Kurus", bmi
    elif bmi < 25:
        return "Normal", bmi
    elif bmi < 30:
        return "Overweight", bmi
    else:
        return "Obesitas", bmi

# Load and preprocess the dataset
def load_and_preprocess_data(filepath):
    try:
        # Read CSV data
        df = pd.read_csv(filepath)
        
        # Calculate BMI if not already present
        if 'BMI' not in df.columns:
            df['BMI'] = df['Berat Badan (kg)'] / ((df['Tinggi Badan (cm)'] / 100) ** 2)
        
        return df
    except Exception as e:
        return None

# Prepare data for model training
def prepare_data(df):
    # Select features for the model
    features = df[['Tinggi Badan (cm)', 'Berat Badan (kg)', 'Umur (Tahun)', 'BMI']]
    
    # Target variable: Kategori BMI
    target_bmi = df['Kategori BMI']
    
    # Encode categorical target
    label_encoder = LabelEncoder()
    encoded_target = label_encoder.fit_transform(target_bmi)
    
    # Scale features
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(features)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        scaled_features, encoded_target, test_size=0.2, random_state=42
    )
    
    return X_train, X_test, y_train, y_test, label_encoder, scaler

# Build TensorFlow model for BMI category prediction
def build_bmi_model(input_shape, num_categories):
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(input_shape,)),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(16, activation='relu'),
        tf.keras.layers.Dense(num_categories, activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

# Function to import workout database
def import_workout_db(file_path):
    try:
        with open(file_path, 'r') as file:
            content = file.read()
            # Extract the dictionary part of the Python file
            start_idx = content.find('workout_db = {')
            if start_idx == -1:
                raise ValueError("Could not find workout_db in the file")
            
            # Extract the dictionary part
            content = content[start_idx + len('workout_db = '):]
            
            # Parse the dictionary
            workout_db = eval(content)
            
            return workout_db
    except Exception as e:
        # Return a basic workout db if there's an error
        return {
            "strength": {
                "upper_body": [
                    {"name": "Push-ups", "description": "Basic upper body exercise", "target": "Dada, Triceps", "kesulitan": "Medium", "jenis": "strength", "subkategori": "upper_body"},
                    {"name": "Dips", "description": "Triceps builder", "target": "Triceps, Dada", "kesulitan": "Hard", "jenis": "strength", "subkategori": "upper_body"}
                ],
                "lower_body": [
                    {"name": "Squats", "description": "Basic lower body exercise", "target": "Quadriceps, Glutes", "kesulitan": "Medium", "jenis": "strength", "subkategori": "lower_body"}
                ]
            },
            "endurance": {
                "cardio": [
                    {"name": "Jogging", "description": "Basic cardio workout", "target": "Kardiovaskular", "kesulitan": "Medium", "jenis": "endurance", "subkategori": "cardio"},
                    {"name": "Berenang", "description": "Full body cardio", "target": "Kardiovaskular, Full Body", "kesulitan": "Medium", "jenis": "endurance", "subkategori": "cardio"}
                ]
            }
        }

# Function to recommend workouts based on BMI category and age
def recommend_workouts(bmi_category, workout_db, age):
    endurance_recs = []
    strength_recs = []
    
    # First pass: Select appropriate workouts based on BMI category
    if bmi_category == "Kurus":
        # For underweight: Focus on strength building with moderate cardio
        strength_difficulty = ["Easy", "Medium"]
        endurance_difficulty = ["Easy"]
        
        # Must include specific workouts
        target_strength = ["Push-ups", "Squats", "Dips", "Pull-ups"]
        target_endurance = ["Jogging", "Berenang"]
        
    elif bmi_category == "Normal":
        # For normal BMI: Balanced approach with medium difficulty
        strength_difficulty = ["Medium", "Hard"]
        endurance_difficulty = ["Medium", "Hard"]
        
        # Must include specific workouts
        target_strength = ["Push-ups", "Squats", "Dips", "Pull-ups"]
        target_endurance = ["Jogging", "Bersepeda", "Berenang"]
        
    elif bmi_category == "Overweight":
        # For overweight: Mix of strength and higher cardio
        strength_difficulty = ["Medium"]
        endurance_difficulty = ["Medium", "Hard"]
        
        # Must include specific workouts
        target_strength = ["Push-ups", "Squats"]
        target_endurance = ["Jogging", "Berenang", "Bersepeda"]
        
    else:  # Obesitas
        # For obesity: Focus on manageable exercises
        strength_difficulty = ["Easy"]
        endurance_difficulty = ["Easy", "Medium"]
        
        # Must include specific workouts with assistance
        target_strength = ["Assisted", "Wall"]
        target_endurance = ["Jogging", "Berenang", "Brisk Walking"]
    
    # Age-based adjustments
    if age > 45:
        # For older adults: Lower intensity, focus on joint-friendly exercises
        strength_difficulty = ["Easy"]
        if "Hard" in endurance_difficulty:
            endurance_difficulty.remove("Hard")
        
        # Add low-impact options
        target_endurance.extend(["Brisk Walking", "Berenang"])
    
    # First, try to find the specific target workouts
    for category, workouts in workout_db.items():
        for subcat, workout_list in workouts.items():
            for workout in workout_list:
                # Check if it's a target workout
                if category == "strength":
                    # Check if any target workout name is in the workout name
                    if any(target in workout["name"] for target in target_strength) and workout["kesulitan"] in strength_difficulty:
                        strength_recs.append(workout)
                        
                elif category == "endurance":
                    if any(target in workout["name"] for target in target_endurance) and workout["kesulitan"] in endurance_difficulty:
                        endurance_recs.append(workout)
    
    # If we don't have enough recommendations, add more from the appropriate difficulty
    if len(strength_recs) < 3:
        for subcat, workout_list in workout_db["strength"].items():
            for workout in workout_list:
                if workout["kesulitan"] in strength_difficulty and workout not in strength_recs:
                    strength_recs.append(workout)
                    if len(strength_recs) >= 3:
                        break
            if len(strength_recs) >= 3:
                break
    
    if len(endurance_recs) < 3:
        for subcat, workout_list in workout_db["endurance"].items():
            for workout in workout_list:
                if workout["kesulitan"] in endurance_difficulty and workout not in endurance_recs:
                    endurance_recs.append(workout)
                    if len(endurance_recs) >= 3:
                        break
            if len(endurance_recs) >= 3:
                break
    
    return {
        "endurance_workouts": endurance_recs[:3],  
        "strength_workouts": strength_recs[:3]     
    }

# Determine age category
def get_age_category(age):
    if age < 18:
        return "Remaja"
    elif age < 30:
        return "Dewasa Muda"
    elif age < 45:
        return "Dewasa"
    elif age < 60:
        return "Dewasa Lanjut"
    else:
        return "Lansia"

# Determine difficulty level based on BMI and age
def get_difficulty_level(bmi_category, age):
    if bmi_category == "Obesitas" or age >= 60:
        return "Easy"
    elif bmi_category == "Overweight" or age >= 45:
        return "Medium"
    elif bmi_category == "Normal":
        return "Medium to Hard"
    else:  # Kurus
        return "Easy to Medium"

# Generate summary text
def generate_summary(bmi_category, age_category, difficulty_level):
    summary = f"<p>Berdasarkan BMI Anda yang termasuk kategori <strong>{bmi_category}</strong> "
    summary += f"dan kategori usia <strong>{age_category}</strong>, "
    
    if bmi_category == "Kurus":
        summary += "Anda disarankan untuk fokus pada latihan yang dapat membantu membangun massa otot "
        summary += "dan meningkatkan kekuatan tubuh. Kombinasikan dengan asupan kalori yang cukup."
    elif bmi_category == "Normal":
        summary += "Anda disarankan untuk menjaga keseimbangan antara latihan kekuatan dan kardio "
        summary += "untuk mempertahankan kondisi tubuh yang sehat."
    elif bmi_category == "Overweight":
        summary += "Anda disarankan untuk fokus pada latihan kardio dengan intensitas sedang hingga tinggi "
        summary += "dikombinasikan dengan latihan kekuatan untuk membantu menurunkan berat badan."
    else:  # Obesitas
        summary += "Anda disarankan untuk memulai dengan latihan intensitas rendah yang aman bagi sendi, "
        summary += "secara bertahap meningkatkan intensitas seiring peningkatan kebugaran Anda."
    
    summary += f"</p><p>Tingkat kesulitan yang direkomendasikan: <strong>{difficulty_level}</strong>.</p>"
    return summary

# Main function
try:
    # Calculate BMI
    bmi_category, bmi_value = calculate_bmi_category(berat, tinggi)
    
    # Import workout database
    workout_db = import_workout_db('workouts_data.py')
    
    # Get age category and difficulty level
    age_category = get_age_category(umur)
    difficulty_level = get_difficulty_level(bmi_category, umur)
    
    # Generate summary
    summary = generate_summary(bmi_category, age_category, difficulty_level)
    
    # Get workout recommendations
    workout_recommendations = recommend_workouts(bmi_category, workout_db, umur)
    
    # Prepare response
    response = {
        "bmi": bmi_value,
        "bmi_category": bmi_category,
        "age_category": age_category,
        "difficulty_level": difficulty_level,
        "summary": summary,
        "endurance_workouts": workout_recommendations["endurance_workouts"],
        "strength_workouts": workout_recommendations["strength_workouts"]
    }
    
    # Print JSON response for server
    print(json.dumps(response))
    
except Exception as e:
    error_response = {
        "error": str(e)
    }
    print(json.dumps(error_response))
    sys.exit(1)