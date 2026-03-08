import joblib
import os

print("=" * 70)
print("✅ TESTING MODEL LOADING")
print("=" * 70)

model_path = "model.pkl"

if os.path.exists(model_path):
    print(f"\n✅ model.pkl found ({os.path.getsize(model_path) / (1024**2):.2f} MB)")
    
    try:
        artifact = joblib.load(model_path)
        print(f"\n✅ Model loaded successfully!")
        
        print(f"\n📊 Model Information:")
        print(f"   Model Type:      {type(artifact['model']).__name__}")
        print(f"   Features:        {artifact['feature_columns']}")
        print(f"   Target:          {artifact['target_column']}")
        print(f"   R² Score:        {artifact.get('r2', 'N/A'):.4f}")
        print(f"   MAE:             ₨{artifact.get('mae', 0):,.0f}")
        print(f"   MAPE:            {artifact.get('mape', 0):.2f}%")
        
        print(f"\n🔤 Encoders (Categorical Features):")
        for col, encoder in artifact['encoders'].items():
            print(f"   {col}: {list(encoder.classes_)}")
        
        print(f"\n✅ MODEL IS READY FOR FastAPI SERVICE!")
        print(f"\nNext: Start FastAPI with:")
        print(f"   uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
        
    except Exception as e:
        print(f"\n❌ Error loading model: {e}")
        exit(1)
else:
    print(f"\n❌ model.pkl not found!")
    exit(1)

print("\n" + "=" * 70)
