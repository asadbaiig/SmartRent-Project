import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score, mean_absolute_percentage_error
from sklearn.ensemble import RandomForestRegressor
import joblib
import os
import time

print("=" * 70)
print("🚀 SMARTRENT AI MODEL TRAINING - OPTIMIZED")
print("=" * 70)

# ─────────────────────────────────────────────
# 1. LOAD AND SAMPLE DATA
# ─────────────────────────────────────────────
CSV_PATH = "dataset/Property_with_Feature_Engineering.csv"

if not os.path.exists(CSV_PATH):
    print(f"❌ Error: {CSV_PATH} not found!")
    exit(1)

print(f"\n📖 Loading CSV: {CSV_PATH}")
start_time = time.time()

# Load data with sample for faster processing
df = pd.read_csv(CSV_PATH)
print(f"✅ Loaded {len(df):,} rows in {time.time() - start_time:.1f}s")

# ─────────────────────────────────────────────
# 2. CONFIGURATION
# ─────────────────────────────────────────────
TARGET_COLUMN = "price"
FEATURE_COLUMNS = [
    "city",
    "property_type",
    "bedrooms",
    "baths",
    "area_sqft",
]

# Filter for rental properties only
print("\n🔍 Filtering for rental properties (For Rent)...")
initial_count = len(df)
df = df[df["purpose"] == "For Rent"].copy()
print(f"   Found {len(df):,} rental properties (removed {initial_count - len(df):,})")

# ─────────────────────────────────────────────
# 3. DATA CLEANING
# ─────────────────────────────────────────────
print(f"\n🧹 Cleaning data...")

# Remove zero/null prices
df = df[df[TARGET_COLUMN] > 0]
print(f"   ✅ Removed zero prices")

# Remove extreme outliers (keep 1st to 99th percentile)
q1, q99 = df[TARGET_COLUMN].quantile([0.01, 0.99])
df = df[(df[TARGET_COLUMN] >= q1) & (df[TARGET_COLUMN] <= q99)]
print(f"   ✅ Removed outliers (kept prices between ₨{q1:,.0f} - ₨{q99:,.0f})")

# Keep rows with valid features
df = df[FEATURE_COLUMNS + [TARGET_COLUMN]].dropna(subset=[TARGET_COLUMN])
print(f"   ✅ Cleaned: {len(df):,} rows remaining")

# ─────────────────────────────────────────────
# 4. FEATURE ENGINEERING
# ─────────────────────────────────────────────
print(f"\n⚙️  Feature Engineering:")

# Fill missing values in numeric columns
numeric_cols = df.select_dtypes(include=[np.number]).columns
for col in numeric_cols:
    df[col] = df[col].fillna(df[col].median())
    print(f"   ✅ {col}: filled with median")

# Encode categorical variables
print(f"\n🔤 Encoding categorical features:")
encoders = {}
for col in FEATURE_COLUMNS:
    if df[col].dtype == 'object':
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
        print(f"   ✅ {col}: {len(le.classes_)} unique values encoded")

# ─────────────────────────────────────────────
# 5. TRAIN / TEST SPLIT
# ─────────────────────────────────────────────
print(f"\n📊 Train/Test Split:")
X = df[FEATURE_COLUMNS]
y = df[TARGET_COLUMN]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"   Training samples:  {len(X_train):,}")
print(f"   Test samples:      {len(X_test):,}")

# ─────────────────────────────────────────────
# 6. TRAIN MODEL
# ─────────────────────────────────────────────
print(f"\n🤖 Training RandomForest Regressor...")
print(f"   This may take 2-5 minutes...")

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    n_jobs=-1,  # Use all CPU cores
    random_state=42,
    verbose=1
)

train_start = time.time()
model.fit(X_train, y_train)
train_time = time.time() - train_start
print(f"   ✅ Training completed in {train_time:.1f}s")

# ─────────────────────────────────────────────
# 7. EVALUATE MODEL
# ─────────────────────────────────────────────
print(f"\n📈 Model Evaluation:")
y_pred = model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)
mape = mean_absolute_percentage_error(y_test, y_pred)

print(f"   MAE  (₨):     {mae:,.0f}")
print(f"   R² Score:     {r2:.4f}")
print(f"   MAPE (%):     {mape:.2f}%")

# Show sample predictions
print(f"\n🎯 Sample Predictions vs Actual:")
for i in range(min(5, len(y_test))):
    actual = y_test.iloc[i]
    predicted = y_pred[i]
    diff_pct = (predicted - actual) / actual * 100
    print(f"   Actual: ₨{actual:,.0f} | Predicted: ₨{predicted:,.0f} | Diff: {diff_pct:+.1f}%")

# ─────────────────────────────────────────────
# 8. SAVE MODEL
# ─────────────────────────────────────────────
print(f"\n💾 Saving model...")
artifact = {
    "model": model,
    "encoders": encoders,
    "feature_columns": FEATURE_COLUMNS,
    "target_column": TARGET_COLUMN,
    "mae": float(mae),
    "r2": float(r2),
    "mape": float(mape),
    "training_samples": len(X_train),
    "test_samples": len(X_test),
}

joblib.dump(artifact, "model.pkl")
model_size = os.path.getsize("model.pkl") / (1024**2)

print(f"   ✅ model.pkl saved!")
print(f"      Size: {model_size:.2f} MB")
print(f"      Location: {os.path.abspath('model.pkl')}")

# ─────────────────────────────────────────────
# 9. SUMMARY
# ─────────────────────────────────────────────
print(f"\n" + "=" * 70)
print(f"✅ TRAINING COMPLETE - READY FOR DEPLOYMENT")
print(f"=" * 70)

print(f"\n📊 Dataset Summary:")
print(f"   Total rentals analyzed:  {len(df):,}")
print(f"   Price range:             ₨{y.min():,.0f} - ₨{y.max():,.0f}")
print(f"   Average price:           ₨{y.mean():,.0f}")

print(f"\n🎯 Model Performance:")
if r2 > 0.75:
    quality = "🌟 EXCELLENT"
elif r2 > 0.6:
    quality = "✅ GOOD"
elif r2 > 0.4:
    quality = "⚠️  ACCEPTABLE"
else:
    quality = "❌ POOR"

print(f"   Quality: {quality} (R² = {r2:.4f})")
print(f"   Average error: ₨{mae:,.0f}")

print(f"\n🚀 Next Steps:")
print(f"   1. Start FastAPI: uvicorn main:app --host 0.0.0.0 --port 8000")
print(f"   2. Start Node.js: npm run dev")
print(f"   3. Test at: http://localhost:5002/properties/new")

print(f"\n" + "=" * 70)
