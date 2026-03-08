from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import numpy as np
import joblib
import os
import sys

app = FastAPI(
    title="SmartRent AI Price Service",
    version="1.0.0",
    description="AI-powered rental price prediction service for SmartRent platform"
)

# ─────────────────────────────────────────────
# CORS CONFIGURATION
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5002",
        "http://localhost:3000",
        "http://127.0.0.1:5002",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# LOAD MODEL ON STARTUP
# ─────────────────────────────────────────────
MODEL_PATH = "model.pkl"
model = None
encoders = None
feature_columns = None
artifact_data = None

if not os.path.exists(MODEL_PATH):
    print(f"❌ Error: {MODEL_PATH} not found!")
    print(f"   Please run: python train_model.py")
    print(f"   Current directory: {os.getcwd()}")
    print(f"   Files in directory: {os.listdir('.')}")
    sys.exit(1)

try:
    artifact_data = joblib.load(MODEL_PATH)
    model = artifact_data["model"]
    encoders = artifact_data["encoders"]
    feature_columns = artifact_data["feature_columns"]
    
    print("=" * 60)
    print("✅ SmartRent AI Service Started")
    print("=" * 60)
    print(f"📦 Model loaded from: {MODEL_PATH}")
    print(f"📋 Features: {feature_columns}")
    print(f"🎯 Target: {artifact_data.get('target_column', 'price')}")
    print(f"📈 R² Score: {artifact_data.get('r2', 'N/A'):.4f}")
    print(f"💰 MAE: ₨{artifact_data.get('mae', 0):,.0f}")
    print("=" * 60)
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    sys.exit(1)

# ─────────────────────────────────────────────
# REQUEST / RESPONSE SCHEMAS
# ─────────────────────────────────────────────
class PricePredictionRequest(BaseModel):
    """Request model for price prediction"""
    city: str
    property_type: str           # "apartment", "house", "commercial", "office"
    sqft: float
    bedrooms: Optional[int] = 2
    bathrooms: Optional[int] = 1
    area: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "city": "Karachi",
                "property_type": "apartment",
                "sqft": 1200,
                "bedrooms": 3,
                "bathrooms": 2,
                "area": "DHA Phase 5"
            }
        }


class PricePredictionResponse(BaseModel):
    """Response model for price prediction"""
    suggested_price: int
    price_range_min: int
    price_range_max: int
    currency: str = "PKR"
    confidence: str
    message: str
    features_used: list


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    features: list


# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────
def safe_encode(encoder, value: str) -> int:
    """
    Safely encode a categorical value.
    If the value is unseen, returns the middle index as fallback.
    """
    try:
        classes = list(encoder.classes_)
        value_str = str(value).strip().lower()
        
        # Try exact match
        for i, cls in enumerate(classes):
            if str(cls).lower() == value_str:
                return i
        
        # Fallback: return middle index
        return len(classes) // 2
    except Exception as e:
        print(f"⚠️  Encoding error for {value}: {e}")
        return 0


def build_input_df(req: PricePredictionRequest) -> pd.DataFrame:
    """Convert API request to model input DataFrame"""
    row = {}
    
    for col in feature_columns:
        try:
            if col == "city":
                row[col] = safe_encode(encoders[col], req.city) if col in encoders else 0
            elif col == "property_type":
                row[col] = safe_encode(encoders[col], req.property_type) if col in encoders else 0
            elif col == "sqft":
                row[col] = float(req.sqft)
            elif col == "bedrooms":
                row[col] = int(req.bedrooms or 2)
            elif col == "bathrooms":
                row[col] = int(req.bathrooms or 1)
            elif col == "area":
                val = req.area or "other"
                row[col] = safe_encode(encoders[col], val) if col in encoders else 0
            else:
                # For any other engineered features, default to 0
                row[col] = 0
        except Exception as e:
            print(f"⚠️  Error processing {col}: {e}")
            row[col] = 0
    
    return pd.DataFrame([row])


# ─────────────────────────────────────────────
# API ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/", response_model=dict)
def root():
    """Root endpoint - service status"""
    return {
        "status": "SmartRent AI Service running ✅",
        "version": "1.0.0",
        "features": feature_columns,
        "docs": "Visit /docs for interactive API documentation"
    }


@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=model is not None,
        features=feature_columns
    )


@app.post("/predict", response_model=PricePredictionResponse)
def predict_price(req: PricePredictionRequest):
    """
    Predict rental price based on property characteristics
    
    Example request:
    ```json
    {
        "city": "Karachi",
        "property_type": "apartment",
        "sqft": 1200,
        "bedrooms": 3,
        "bathrooms": 2
    }
    ```
    """
    try:
        if model is None:
            raise HTTPException(
                status_code=503,
                detail="Model not loaded. Service unavailable."
            )

        # Build input dataframe
        input_df = build_input_df(req)
        
        # Make prediction
        predicted = float(model.predict(input_df)[0])

        # Round to nearest 500 for cleaner numbers
        predicted_rounded = round(predicted / 500) * 500
        
        # Ensure minimum of 10,000
        predicted_rounded = max(predicted_rounded, 10000)

        # Generate price range (±10%)
        price_min = int(predicted_rounded * 0.90)
        price_max = int(predicted_rounded * 1.10)

        # Calculate confidence based on feature completeness
        filled_features = sum([
            bool(req.city),
            bool(req.property_type),
            req.sqft and req.sqft > 0,
            req.bedrooms is not None and req.bedrooms > 0,
            req.bathrooms is not None and req.bathrooms > 0,
        ])
        
        if filled_features >= 5:
            confidence = "High"
        elif filled_features >= 3:
            confidence = "Medium"
        else:
            confidence = "Low"

        # Generate message
        message = f"Based on {req.bedrooms or 2}BR {req.property_type} in {req.city} ({req.sqft} sqft)"
        if req.area:
            message += f", {req.area} area"

        return PricePredictionResponse(
            suggested_price=int(predicted_rounded),
            price_range_min=price_min,
            price_range_max=price_max,
            confidence=confidence,
            message=message,
            features_used=feature_columns
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@app.get("/model-info")
def model_info():
    """Get information about the loaded model"""
    if artifact_data is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "model_type": "XGBoost Regressor",
        "features": feature_columns,
        "target": artifact_data.get("target_column", "price"),
        "r2_score": artifact_data.get("r2", None),
        "mean_absolute_error": f"₨{artifact_data.get('mae', 0):,.0f}",
        "encoders": list(encoders.keys()),
        "version": "1.0.0"
    }


@app.get("/features")
def get_features():
    """Get list of required features for prediction"""
    return {
        "features": feature_columns,
        "encoders": {
            col: list(encoders[col].classes_) if col in encoders else []
            for col in feature_columns
        }
    }


# ─────────────────────────────────────────────
# AREA / NEIGHBORHOOD INSIGHTS (from dataset CSV)
# ─────────────────────────────────────────────
# Resolve path relative to this file so it works regardless of cwd (e.g. run from project root)
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_CSV = os.path.join(_BASE_DIR, "dataset", "Property_with_Feature_Engineering.csv")
_area_stats_df: Optional[pd.DataFrame] = None


def _normalize_col(df: pd.DataFrame, possible_names: list, default: str) -> str:
    """Return the first column name that exists, else default."""
    for name in possible_names:
        if name in df.columns:
            return name
    return default


def _load_area_stats_df() -> Optional[pd.DataFrame]:
    """Load and normalize the dataset CSV for area stats. Lazy-loaded."""
    global _area_stats_df
    if _area_stats_df is not None:
        return _area_stats_df
    if not os.path.exists(DATASET_CSV):
        print(f"⚠️  Area stats: CSV not found at {DATASET_CSV}")
        print(f"   (resolved from base dir: {_BASE_DIR})")
        return None
    try:
        df = pd.read_csv(DATASET_CSV)
        # Normalize column names to match Property_with_Feature_Engineering.csv: price, city, property_type, location, locality, bedrooms, purpose
        col_price = _normalize_col(df, ["price", "monthly_rent", "rent"], "price")
        col_city = _normalize_col(df, ["city", "City"], "city")
        col_type = _normalize_col(df, ["property_type", "propertytype", "type"], "property_type")
        # Use "location" for neighborhood (e.g. Model Town); CSV has "location" and "locality". Name it "neighborhood" to avoid clashing with CSV's "area" (property size).
        col_neighborhood = _normalize_col(df, ["location", "locality", "area", "Area"], "neighborhood")
        col_bedrooms = _normalize_col(df, ["bedrooms", "beds"], "bedrooms")
        col_purpose = _normalize_col(df, ["purpose", "Purpose"], "purpose")

        rename = {}
        if col_price != "price":
            rename[col_price] = "price"
        if col_city != "city":
            rename[col_city] = "city"
        if col_type != "property_type":
            rename[col_type] = "property_type"
        if col_neighborhood != "neighborhood":
            rename[col_neighborhood] = "neighborhood"
        if col_bedrooms != "bedrooms":
            rename[col_bedrooms] = "bedrooms"
        if col_purpose != "purpose":
            rename[col_purpose] = "purpose"
        if rename:
            df = df.rename(columns=rename)

        # Ensure we have required columns
        if "price" not in df.columns or "city" not in df.columns:
            print("⚠️  Area stats: CSV missing 'price' or 'city' column")
            return None

        # Filter to rental only if purpose column exists; include "for rent", "rent", or any purpose containing "rent"
        if "purpose" in df.columns:
            purpose_lower = df["purpose"].astype(str).str.strip().str.lower()
            rent_mask = purpose_lower.isin(["for rent", "rent"]) | purpose_lower.str.contains("rent", na=False)
            df_rent = df[rent_mask].copy()
            if len(df_rent) == 0:
                # No rental rows: use full dataset so insights still show (e.g. sale prices as reference)
                print("⚠️  Area stats: no 'For Rent' rows; using full dataset for insights")
            else:
                df = df_rent

        df["price"] = pd.to_numeric(df["price"], errors="coerce")
        df = df.dropna(subset=["price"])
        df["city"] = df["city"].astype(str).str.strip()
        if "property_type" in df.columns:
            df["property_type"] = df["property_type"].astype(str).str.strip().str.lower()
        if "neighborhood" in df.columns:
            df["neighborhood"] = df["neighborhood"].astype(str).str.strip()
        if "bedrooms" in df.columns:
            df["bedrooms"] = pd.to_numeric(df["bedrooms"], errors="coerce")

        _area_stats_df = df
        print(f"✅ Area stats: loaded {len(df)} rental rows from {DATASET_CSV}")
        return _area_stats_df
    except Exception as e:
        print(f"⚠️  Area stats: failed to load CSV: {e}")
        return None


@app.get("/area-stats")
def area_stats(
    city: Optional[str] = None,
    property_type: Optional[str] = None,
    area: Optional[str] = None,
    bedrooms: Optional[str] = None,
):
    """
    Neighborhood / area insights from the dataset.
    Returns count, mean/median/min/max rent and top areas by listing count.
    Query params: city, property_type, area, bedrooms (all optional).
    """
    df = _load_area_stats_df()
    if df is None or len(df) == 0:
        return {
            "count": 0,
            "mean_rent": 0,
            "median_rent": 0,
            "min_rent": 0,
            "max_rent": 0,
            "currency": "PKR",
            "top_areas": [],
            "message": "No dataset available for insights.",
        }

    subset = df.copy()
    if city and str(city).strip():
        c = str(city).strip().lower()
        subset = subset[subset["city"].str.lower() == c]
    if property_type and str(property_type).strip():
        pt = str(property_type).strip().lower()
        if "property_type" in subset.columns:
            subset = subset[subset["property_type"].str.lower() == pt]
    if area and str(area).strip():
        ar = str(area).strip().lower()
        if "neighborhood" in subset.columns:
            subset = subset[subset["neighborhood"].astype(str).str.lower().str.contains(ar, na=False)]
        elif "area" in subset.columns:
            subset = subset[subset["area"].astype(str).str.lower().str.contains(ar, na=False)]
    if bedrooms and str(bedrooms).strip():
        try:
            b = int(bedrooms.replace("+", "").strip())
            if "bedrooms" in subset.columns:
                subset = subset[subset["bedrooms"].fillna(0).astype(int) >= b]
        except ValueError:
            pass

    if len(subset) == 0:
        return {
            "count": 0,
            "mean_rent": 0,
            "median_rent": 0,
            "min_rent": 0,
            "max_rent": 0,
            "currency": "PKR",
            "top_areas": [],
            "message": "No listings match the selected filters.",
        }

    price = subset["price"]
    positive_price = price[price > 0]
    mean_rent = int(round(price.mean()))
    median_rent = int(round(price.median()))
    min_rent = int(positive_price.min()) if len(positive_price) > 0 else 0
    max_rent = int(price.max())

    top_areas = []
    area_col = "neighborhood" if "neighborhood" in subset.columns else "area"
    if area_col in subset.columns and subset[area_col].notna().any():
        area_counts = subset.groupby(subset[area_col].astype(str).str.strip()).agg(
            count=("price", "count"),
            mean_rent=("price", "mean"),
        ).reset_index()
        area_counts = area_counts[area_counts[area_col].astype(str).str.len() > 0]
        area_counts["mean_rent"] = area_counts["mean_rent"].round(0).astype(int)
        area_counts = area_counts.sort_values("count", ascending=False).head(10)
        top_areas = area_counts.to_dict("records")
        # Normalize keys for JSON (response uses "area" for neighborhood name)
        top_areas = [{"area": str(r[area_col]), "count": int(r["count"]), "mean_rent": int(r["mean_rent"])} for r in top_areas]

    return {
        "count": int(len(subset)),
        "mean_rent": mean_rent,
        "median_rent": median_rent,
        "min_rent": min_rent,
        "max_rent": max_rent,
        "currency": "PKR",
        "top_areas": top_areas,
        "message": None,
    }


# ─────────────────────────────────────────────
# ERROR HANDLERS
# ─────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }


if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting FastAPI server...")
    print("📍 Visit: http://localhost:8000")
    print("📚 Docs:  http://localhost:8000/docs")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
