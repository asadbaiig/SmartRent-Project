import pandas as pd
import os
import sys

csv_path = "dataset/Property_with_Feature_Engineering.csv"

if os.path.exists(csv_path):
    print("=" * 70)
    print("📊 CSV ANALYSIS - SMARTRENT AI")
    print("=" * 70)
    
    # Read first few rows
    df = pd.read_csv(csv_path, nrows=5)
    
    print("\n📋 COLUMN NAMES:")
    columns = df.columns.tolist()
    for i, col in enumerate(columns, 1):
        print(f"   {i}. {col}")
    
    print("\n📈 DATA TYPES:")
    print(df.dtypes)
    
    print("\n👀 FIRST 3 ROWS:")
    print(df.head(3).to_string())
    
    print("\n" + "=" * 70)
    print("📊 FULL DATASET INFO:")
    print("=" * 70)
    df_full = pd.read_csv(csv_path)
    print(f"   Total Rows:      {len(df_full):,}")
    print(f"   Total Columns:   {len(df_full.columns)}")
    print(f"   Memory Usage:    {df_full.memory_usage(deep=True).sum() / (1024**2):.2f} MB")
    
    print("\n🔍 MISSING VALUES:")
    missing = df_full.isnull().sum()
    has_missing = False
    for col, count in missing[missing > 0].items():
        print(f"   {col}: {count} ({count/len(df_full)*100:.1f}%)")
        has_missing = True
    if not has_missing:
        print("   ✅ No missing values!")
    
    print("\n💰 NUMERIC COLUMNS (potential target variables):")
    numeric_cols = df_full.select_dtypes(include=['number']).columns.tolist()
    for col in numeric_cols[:10]:  # Show first 10
        print(f"   - {col}: min={df_full[col].min():.0f}, max={df_full[col].max():.0f}, mean={df_full[col].mean():.0f}")
    
    print("\n📝 CATEGORICAL COLUMNS:")
    cat_cols = df_full.select_dtypes(include=['object']).columns.tolist()
    for col in cat_cols:
        unique_count = df_full[col].nunique()
        print(f"   - {col}: {unique_count} unique values")
        print(f"      Values: {df_full[col].unique()[:5].tolist()}")
    
    print("\n" + "=" * 70)
    print("✅ Analysis Complete!")
    print("=" * 70)
else:
    print(f"❌ CSV not found at {csv_path}")
    sys.exit(1)
