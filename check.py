import re

with open("/home/pavana/Patient-Churn-Prediction-and-Retention-Advisor/backend/static/index.html") as f:
    html = f.read()
with open("/home/pavana/Patient-Churn-Prediction-and-Retention-Advisor/backend/static/app.js") as f:
    js = f.read()

html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))
js_ids = set(re.findall(r'\$\(["\']([^"\']+)["\']\)', js))

missing = js_ids - html_ids
print("Missing IDs:", missing)
