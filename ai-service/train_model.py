import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
from xgboost import XGBRegressor
import joblib
import os

# ─────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────
CSV_PATH = "dataset/Property_with_Feature_Engineering.csv"

if not os.path.exists(CSV_PATH):
    print(f"❌ Error: {CSV_PATH} not found!")
    print("   Please copy your CSV file to the dataset/ folder first.")
    print("   Example: cp Property_with_Feature_Engineering.csv ai-service/dataset/")
    exit(1)

df = pd.read_csv(CSV_PATH)

print("=" * 60)
print("📊 SMARTRENT AI MODEL TRAINING")
print("=" * 60)
print(f"\n📁 CSV Columns: {df.columns.tolist()}")
print(f"📈 Dataset shape: {df.shape}")
print(f"\nFirst 3 rows:\n{df.head(3)}")

# ─────────────────────────────────────────────
# 2. CONFIGURE TO MATCH YOUR CSV COLUMNS
# ─────────────────────────────────────────────
# ⚠️  CHANGE THESE TO MATCH YOUR ACTUAL COLUMN NAMES
TARGET_COLUMN = "price"          # ← Rental price (PKR)
FEATURE_COLUMNS = [
    "city",                      # ← City name
    "property_type",             # ← House, Flat, etc.
    "bedrooms",                  # ← Number of bedrooms
    "baths",                     # ← Number of bathrooms
    "area_sqft",                 # ← Area in square feet
]

# Optional: Filter for rental properties only
FILTER_BY_PURPOSE = "For Rent"   # Set to None to use all data

print(f"\n🎯 Target column: {TARGET_COLUMN}")
print(f"📋 Feature columns: {FEATURE_COLUMNS}")

# ─────────────────────────────────────────────
# 3. VALIDATE COLUMNS EXIST
# ─────────────────────────────────────────────
if TARGET_COLUMN not in df.columns:
    print(f"\n❌ Error: Target column '{TARGET_COLUMN}' not found!")
    print(f"   Available columns: {df.columns.tolist()}")
    exit(1)

available_features = [col for col in FEATURE_COLUMNS if col in df.columns]
missing_features = [col for col in FEATURE_COLUMNS if col not in df.columns]

if missing_features:
    print(f"\n⚠️  Missing columns (will skip): {missing_features}")

print(f"✅ Using features: {available_features}\n")

# ─────────────────────────────────────────────
# 4. CLEAN DATA
# ─────────────────────────────────────────────
df = df[available_features + [TARGET_COLUMN]].copy()

# Filter for rental properties if specified
if FILTER_BY_PURPOSE and "purpose" in df.columns:
    initial_rows = len(df)
    df = df[df["purpose"] == FILTER_BY_PURPOSE]
    filtered_rows = initial_rows - len(df)
    if filtered_rows > 0:
        print(f"🏠 Filtered to '{FILTER_BY_PURPOSE}' properties: {filtered_rows} rows removed")

# Remove rows with missing target values
initial_rows = len(df)
df.dropna(subset=[TARGET_COLUMN], inplace=True)
removed_rows = initial_rows - len(df)

if removed_rows > 0:
    print(f"🧹 Removed {removed_rows} rows with missing {TARGET_COLUMN}")

# Remove rows where price is 0 or negative
initial_rows = len(df)
df = df[df[TARGET_COLUMN] > 0]
removed_rows = initial_rows - len(df)
if removed_rows > 0:
    print(f"🧹 Removed {removed_rows} rows with zero/negative price")

# Fill missing numeric values with median
numeric_cols = df.select_dtypes(include=[np.number]).columns
for col in numeric_cols:
    if df[col].isnull().sum() > 0:
        df[col] = df[col].fillna(df[col].median())
        print(f"   Filled {col} missing values with median")

# Fill missing categorical values with mode
cat_cols = df.select_dtypes(include=["object"]).columns
for col in cat_cols:
    if col in available_features and df[col].isnull().sum() > 0:
        df[col] = df[col].fillna(df[col].mode()[0])
        print(f"   Filled {col} missing values with mode")

print(f"\n✅ Clean dataset shape: {df.shape}")

# ─────────────────────────────────────────────
# 5. ENCODE CATEGORICAL COLUMNS
# ─────────────────────────────────────────────
print("\n🔤 Encoding categorical features:")
encoders = {}
for col in cat_cols:
    if col in available_features:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
        print(f"   ✅ {col}: {list(le.classes_)}")

# ─────────────────────────────────────────────
# 6. TRAIN / TEST SPLIT
# ─────────────────────────────────────────────
X = df[available_features]
y = df[TARGET_COLUMN]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"\n📊 Data split:")
print(f"   Training samples: {len(X_train)}")
print(f"   Test samples:     {len(X_test)}")

# ─────────────────────────────────────────────
# 7. TRAIN XGBOOST MODEL
# ─────────────────────────────────────────────
print(f"\n🤖 Training XGBoost model...")
model = XGBRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbosity=0  # Set to 1 to see training progress
)

model.fit(X_train, y_train)
print("   Model training complete!")

# ─────────────────────────────────────────────
# 8. EVALUATE MODEL
# ─────────────────────────────────────────────
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"\n📈 Model Performance:")
print(f"   MAE (Mean Absolute Error): ₨{mae:,.0f}")
print(f"   R² Score:                  {r2:.4f}")
print(f"   Accuracy:                  ~{(1-mae/y_test.mean())*100:.1f}%")

if r2 < 0.5:
    print("\n⚠️  Warning: Low R² score. Consider:")
    print("   - Removing outliers from your CSV")
    print("   - Adding more features")
    print("   - Checking for data quality issues")
elif r2 < 0.75:
    print("\n✅ Good model (R² 0.5-0.75)")
else:
    print("\n✅ Excellent model (R² > 0.75)")

# ─────────────────────────────────────────────
# 9. SAVE MODEL + ENCODERS + METADATA
# ─────────────────────────────────────────────
artifact = {
    "model": model,
    "encoders": encoders,
    "feature_columns": available_features,
    "target_column": TARGET_COLUMN,
    "mae": float(mae),
    "r2": float(r2),
}

joblib.dump(artifact, "model.pkl")

print(f"\n✅ model.pkl saved successfully!")
print(f"   Location: {os.path.abspath('model.pkl')}")
print(f"   Features: {available_features}")
print(f"\n🚀 Ready to start the FastAPI service!")
print("   Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
