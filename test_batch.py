import pandas as pd
import json
from backend.models.predictor import predictor
predictor.load()

df = pd.read_csv("data/patient_churn_dataset_enriched.csv")
res = predictor.predict_batch(df, df.copy())
print(json.dumps(res[0]))
