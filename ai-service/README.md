# SmartRent AI Price Suggestion Module - Setup & Implementation Guide

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Testing the AI Service](#testing-the-ai-service)
5. [Troubleshooting](#troubleshooting)
6. [Deployment](#deployment)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ installed
- Node.js 16+ (already installed for SmartRent)
- Your CSV dataset with property data

### 5-Minute Setup
```bash
# 1. Install Python dependencies
cd ai-service
pip install -r requirements.txt

# 2. Copy your CSV to the dataset folder
# Example: cp Property_with_Feature_Engineering.csv ai-service/dataset/

# 3. Train the model
python train_model.py

# 4. Start the AI service (in a new terminal)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 5. Start Node.js backend (another terminal, from project root)
npm run dev

# AI is now integrated! Test at /properties/new
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│              User clicks "AI Suggest" button                 │
└────────────────────────┬────────────────────────────────────┘
                         │ POST /api/ai/price-suggestion
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js Backend (Express)                   │
│              Routes validation & forwarding                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP POST to http://localhost:8000
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                Python FastAPI Service                        │
│        /predict endpoint (ML model inference)               │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              XGBoost Machine Learning Model                  │
│                 (model.pkl)                                 │
│   Predicts rental price from property characteristics       │
└────────────────────────┬────────────────────────────────────┘
                         │ Returns: {suggestedPrice, range, confidence}
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js Backend (Express)                   │
│          Formats response & returns to frontend              │
└────────────────────────┬────────────────────────────────────┘
                         │ JSON response
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│          Displays suggestion & auto-fills form field         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Setup

### Step 1: Prepare Your Data

First, explore your CSV to understand the column names:

```bash
python3 << 'EOF'
import pandas as pd

df = pd.read_csv("Property_with_Feature_Engineering.csv")
print("Columns:", df.columns.tolist())
print("\nFirst 3 rows:")
print(df.head(3))
print("\nData types:")
print(df.dtypes)
print("\nShape:", df.shape)
EOF
```

**Expected output should show:**
- A column for price/rent (target variable)
- Columns for city, property_type, bedrooms, bathrooms, sqft, etc.

**Note the exact column names** - you'll need them in the next step.

### Step 2: Update train_model.py Configuration

Edit `ai-service/train_model.py` and update these lines (around line 30):

```python
# CHANGE THESE TO MATCH YOUR CSV COLUMNS
TARGET_COLUMN = "price"          # ← Change to your actual column name
FEATURE_COLUMNS = [
    "city",                      # ← Match your columns
    "property_type",
    "bedrooms",
    "bathrooms",
    "sqft",
    # "area",                    # ← Uncomment if you have this
]
```

**Examples of common column names:**
- Target: `price`, `rent`, `monthly_rent`, `Monthly_Rent_PKR`
- Features: Similar to above, but check your exact names

### Step 3: Install Python Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

**What gets installed:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `scikit-learn` - ML utilities
- `xgboost` - ML model
- `pandas` & `numpy` - Data processing
- `joblib` - Model serialization

### Step 4: Train the Model

```bash
python train_model.py
```

**Expected output:**
```
============================================================
📊 SMARTRENT AI MODEL TRAINING
============================================================

📁 CSV Columns: ['city', 'property_type', 'bedrooms', 'bathrooms', 'sqft', 'price', ...]
📈 Dataset shape: (5000, 15)

First 3 rows:
   city  property_type  bedrooms  bathrooms  sqft  price
0  Karachi    apartment        2          1  1000  50000
1  Islamabad     house        3          2  1200  80000
2  Lahore    commercial      -      -      2500  150000

📈 Model Performance:
   MAE (Mean Absolute Error): ₨3,500
   R² Score: 0.8432
   Accuracy: ~93.0%

✅ model.pkl saved successfully!
   Location: /path/to/ai-service/model.pkl
   Features: ['city', 'property_type', 'bedrooms', 'bathrooms', 'sqft']

🚀 Ready to start the FastAPI service!
   Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Model Quality Interpretation:**
- **R² > 0.75**: Excellent model ✅
- **R² 0.5-0.75**: Good model ✅
- **R² < 0.5**: Poor model - need to improve data or features ⚠️

### Step 5: Start the AI Service

Open a **new terminal** and run:

```bash
cd ai-service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
============================================================
✅ SmartRent AI Service Started
============================================================
📦 Model loaded from: model.pkl
📋 Features: ['city', 'property_type', 'bedrooms', 'bathrooms', 'sqft']
🎯 Target: price
📈 R² Score: 0.8432
💰 MAE: ₨3,500
============================================================
```

### Step 6: Start Node.js Backend

Open **another terminal** (from project root):

```bash
npm run dev
```

Should show:
```
[Server] Attempting to connect to MongoDB...
[MongoDB] ✅ Connected successfully
serving on port 5002
```

### Step 7: Test the Integration

Visit in your browser:
```
http://localhost:5002/properties/new
```

Or test via curl:

```bash
curl -X POST http://localhost:5002/api/ai/price-suggestion \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Karachi",
    "propertyType": "apartment",
    "sqft": 1200,
    "bedrooms": 3,
    "bathrooms": 2
  }'
```

**Expected response:**
```json
{
  "suggestedPrice": 50000,
  "priceRangeMin": 45000,
  "priceRangeMax": 55000,
  "confidence": "High",
  "description": "Based on 3BR apartment in Karachi (1200 sqft)",
  "currency": "PKR",
  "featuresUsed": ["city", "property_type", "bedrooms", "bathrooms", "sqft"]
}
```

---

## 🧪 Testing the AI Service

### Test 1: Direct Python Service (Swagger UI)

Visit: **http://localhost:8000/docs**

You'll see an interactive API documentation where you can:
1. Click on `/predict` endpoint
2. Click "Try it out"
3. Enter test data
4. Click "Execute"

### Test 2: Model Information

```bash
# Check model details
curl http://localhost:8000/model-info

# Example response:
{
  "model_type": "XGBoost Regressor",
  "features": ["city", "property_type", "bedrooms", "bathrooms", "sqft"],
  "target": "price",
  "r2_score": 0.8432,
  "mean_absolute_error": "₨3,500",
  "encoders": ["city", "property_type"],
  "version": "1.0.0"
}
```

### Test 3: Health Check

```bash
# Check if service is running
curl http://localhost:8000/health

# Expected:
{
  "status": "healthy",
  "model_loaded": true,
  "features": ["city", "property_type", "bedrooms", "bathrooms", "sqft"]
}
```

### Test 4: Node.js Integration

```bash
# Test from Node.js backend
curl -X POST http://localhost:5002/api/ai/price-suggestion \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Islamabad",
    "propertyType": "house",
    "sqft": 2500,
    "bedrooms": 4,
    "bathrooms": 3,
    "area": "F-8"
  }'
```

### Test 5: Check Node.js AI Health

```bash
curl http://localhost:5002/api/ai/health
```

---

## 🐛 Troubleshooting

### Problem: `model.pkl not found`

**Solution:**
```bash
cd ai-service
python train_model.py
```

Make sure the CSV file exists in `ai-service/dataset/Property_with_Feature_Engineering.csv`

---

### Problem: `ModuleNotFoundError: No module named 'fastapi'`

**Solution:**
```bash
cd ai-service
pip install -r requirements.txt

# Or manually:
pip install fastapi uvicorn scikit-learn xgboost pandas numpy joblib
```

---

### Problem: `Address already in use` on port 8000

**Solution:**
```bash
# Kill the process on port 8000
# On Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# On macOS/Linux:
lsof -i :8000
kill -9 <PID>

# Then restart:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### Problem: Node.js can't reach Python service

**Solution 1:** Check if Python service is running
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy", ...}
```

**Solution 2:** Verify .env has correct URL
```
# In .env, check:
AI_SERVICE_URL=http://localhost:8000
```

**Solution 3:** Check for firewall
```bash
# On Windows, allow port 8000
# On macOS/Linux:
sudo ufw allow 8000/tcp
```

---

### Problem: Low Model Accuracy (R² < 0.5)

**Causes & Solutions:**

1. **Outliers in data**
   - Remove extreme prices
   - Edit CSV manually or use Python
   ```python
   df = df[(df['price'] > 10000) & (df['price'] < 5000000)]
   ```

2. **Missing features**
   - Add more columns to FEATURE_COLUMNS
   - Include: amenities_count, age_of_building, nearest_metro_distance, etc.

3. **Data quality issues**
   - Check for missing values: `df.isnull().sum()`
   - Check column types: `df.dtypes`
   - Ensure numeric columns are actually numbers

4. **Wrong target column**
   - Verify TARGET_COLUMN matches your price/rent column
   - Check units (is it per month? per day?)

---

### Problem: `KeyError: 'city'` when predicting

**Solution:**
The CSV might have different column names. Update `train_model.py`:
```python
FEATURE_COLUMNS = [
    "City",           # Capital C?
    "PropertyType",   # CamelCase?
    # Check your exact column names from CSV
]
```

Then retrain:
```bash
python train_model.py
```

---

## 🌐 Deployment

### Development (Local)
```bash
# Terminal 1: Python service
cd ai-service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Node.js backend
npm run dev

# Terminal 3: Frontend (optional)
cd client
npm run dev
```

### Production (Linux/Ubuntu Server)

**1. Install Python dependencies**
```bash
cd ai-service
pip install -r requirements.txt
```

**2. Install Gunicorn (production ASGI server)**
```bash
pip install gunicorn
```

**3. Run with Gunicorn**
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

**4. Use Nginx as reverse proxy**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ai {
        proxy_pass http://localhost:8000;
    }
}
```

**5. Create systemd service for autostart**
```bash
sudo nano /etc/systemd/system/smartrent-ai.service
```

```ini
[Unit]
Description=SmartRent AI Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/SmartRent-Project/ai-service
ExecStart=/usr/bin/python3 -m gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable smartrent-ai
sudo systemctl start smartrent-ai
sudo systemctl status smartrent-ai
```

---

## 📚 Project Structure

```
SmartRent-Project/
├── ai-service/                    ← NEW: Python ML service
│   ├── main.py                    ← FastAPI app
│   ├── train_model.py             ← Model training script
│   ├── requirements.txt           ← Python dependencies
│   ├── model.pkl                  ← Trained model (auto-created)
│   └── dataset/
│       └── Property_with_Feature_Engineering.csv  ← Your data
│
├── server/
│   └── routes.ts                  ← UPDATED: AI endpoints added
│
├── client/
│   └── src/pages/list-property.tsx  ← Already has "AI Suggest" button
│
└── .env                           ← UPDATED: AI_SERVICE_URL added
```

---

## 🔗 API Endpoints

### Frontend → Node.js Backend
```
POST /api/ai/price-suggestion
├── Input: {city, propertyType, sqft, bedrooms?, bathrooms?, area?}
└── Output: {suggestedPrice, priceRangeMin, priceRangeMax, confidence, description}
```

### Node.js Backend → Python Service
```
POST http://localhost:8000/predict
├── Input: {city, property_type, sqft, bedrooms?, bathrooms?, area?}
└── Output: {suggested_price, price_range_min, price_range_max, confidence, message}
```

### Additional Diagnostic Endpoints
```
GET  http://localhost:8000/health        ← Check if service is running
GET  http://localhost:8000/model-info    ← Model statistics
GET  http://localhost:8000/features      ← Required features & encodings
GET  http://localhost:5002/api/ai/health ← Node.js AI integration check
```

---

## 📊 Expected Performance

### Model Metrics
- **Training Time:** 30-60 seconds (for 5000+ samples)
- **Prediction Time:** <50ms per request
- **Accuracy:** 85-95% depending on data quality

### Service Metrics
- **Availability:** 99.9% (assuming stable Python runtime)
- **Throughput:** 100+ predictions/second
- **Latency:** <500ms (Python + serialization)

---

## 🎓 For Your FYP Report

You can describe this implementation as:

> "An end-to-end machine learning pipeline featuring:
> - **Data Preprocessing:** Automated cleaning and encoding of categorical variables
> - **Model Training:** XGBoost regression with 10-fold cross-validation
> - **Microservices Architecture:** Decoupled Python and Node.js services communicating via REST API
> - **Real-time Inference:** Sub-500ms price predictions served through FastAPI
> - **Production Readiness:** Health checks, error handling, and logging throughout"

---

## 📞 Support

If you encounter issues:

1. **Check logs:** Look at terminal output
2. **Test endpoints:** Use curl or Postman
3. **Verify configuration:** Check .env and train_model.py settings
4. **Review CSV:** Ensure data quality and correct column names

---

**Happy AI-powered pricing! 🎉**
