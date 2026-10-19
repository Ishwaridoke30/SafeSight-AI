# SafeSight AI – PPE Detection System

## About the Project

SafeSight AI is an AI-assisted workplace safety monitoring project that uses computer vision to detect Personal Protective Equipment (PPE) in images.

The goal is to help identify safety equipment and support workplace safety monitoring.

## Features

- Detects people in images.
- Detects safety helmets and safety vests.
- Identifies detected instances of people without helmets.
- Displays detection labels and confidence scores.
- Provides a web dashboard for image inspection.
- Uses a FastAPI backend to process images.

## Technologies Used

- Python
- FastAPI
- YOLO
- HTML
- CSS
- JavaScript

## Project Structure

- `backend/` – API and AI detection logic.
- `backend/models/` – AI model weights.
- `index.html` – Web dashboard.
- `style.css` – Dashboard styling.
- `script.js` – Frontend functionality.

## How to Run

### 1. Start the Backend

Open PowerShell and run:

```powershell
cd C:\Users\lenovo\OneDrive\Desktop\SafeSight_AI\backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API documentation: http://127.0.0.1:8000/docs

### 2. Start the Frontend

Open a second PowerShell terminal and run:

```powershell
cd C:\Users\lenovo\OneDrive\Desktop\SafeSight_AI
python -m http.server 5500 --bind 127.0.0.1
```

Open http://127.0.0.1:5500/ in your browser.

## Current Model Limitations

The current model supports these classes:

- Helmet
- Human
- No helmet
- Vest

Goggles detection is not supported by the current model. Detection results may be incorrect, so this prototype should not be used as the sole basis for real-world safety decisions.

## Model Attribution and License

The project uses a third-party PPE detection model. Please refer to the original model repository and its license for attribution, usage, and redistribution requirements.

## Project Status

Prototype for AI-assisted PPE detection and workplace safety monitoring.
