# Architecture — NaN-native SHAP-driven Churn App

Simplest path found for each of the 8 changes, mapped to actual files in the repo. Assumes
current stack: FastAPI + `models/predictor.py` (singleton `ChurnPredictor`) + React (Vite).

Three deviations from the spec, called out with reasoning (see chat message). Override any of
them by saying so.

---

## 0. Order of operations (do in this order, each step keeps the app runnable)

1. `train_model.py` rewrite → produces new artifacts.
2. `models/predictor.py` rewrite → loads new artifacts, new predict/predict_batch/explain logic.
3. `schemas/patient.py` + `routes/predict.py` → new response shape, warnings, CSV tolerance.
4. Frontend: `api.js` → components. Do this last, once backend contract is stable.

Don't do frontend and backend in parallel — the response shape changes (drivers instead of
`primary_churn_reason` string), so frontend will break against old backend and vice versa.

---

## 1. Model layer — HistGB / XGBoost / LightGBM compared by AUC

**File: `backend/compare_models.py`** (already exists as a comparison script — repurpose it,
don't create a new one)

- Replace the 8-model sklearn bakeoff with exactly 3: `HistGradientBoostingClassifier`
  (sklearn, `categorical_features="from_dtype"`), `XGBClassifier` (`enable_categorical=True`,
  `tree_method="hist"`), `LGBMClassifier` (native categorical via `pandas.Categorical` dtype).
- **No `pd.get_dummies` anywhere.** Cast object columns to `pandas` `category` dtype once,
  feed the same `X` (with real `NaN`s, no imputation) to all three.
- Identical split for all three: single `train_test_split(..., stratify=y, random_state=42)`
  reused across the file — this is what "identical splits" in your spec means, don't
  re-split per model.
- Score: 5-fold `StratifiedKFold` CV AUC (`cross_val_score`) + held-out test AUC. Print a table,
  pick `max(mean_cv_auc)` — ties broken by held-out AUC.
- Write result table to `data/model_comparison_benchmark.csv` (file already exists, overwrite it)
  so the winner is auditable, not just picked silently.

**File: `backend/train_model.py`** (rewrite)

- Import whichever of the 3 libs are installed; wrap `xgboost`/`lightgbm` imports in
  `try/except ImportError` — if either is missing, drop it from the bakeoff and log a warning.
  This is the concession to "simplest": HGB always works, the other two are optional upgrades.
- Feature set: keep your existing engineered features (`Engagement_Score`, `Cost_Per_Visit`,
  `Satisfaction_Avg`) — they're derived from numeric columns, `NaN`s propagate through
  arithmetic fine (`NaN - 3 = NaN`), no special handling needed.
- Categorical columns (`Gender`, `State`, `Specialty`, `Insurance_Type`) → `category` dtype,
  no encoding. Keep the **raw column list** (not one-hot expanded) as what gets saved to
  `model_columns.pkl` — this is the "raw feature names plus categorical list" from your spec.
- Train winner on full feature set, save:
  - `ml_model/churn_model.pkl` — the winning fitted model (whichever of the 3)
  - `ml_model/model_columns.pkl` — `{"features": [...], "categorical": [...]}`  (dict, not a
    bare list — routes and predictor both need to know which columns to cast to `category`)
  - `ml_model/model_meta.pkl` — `{"model_name": "LightGBM", "cv_auc": 0.81, "test_auc": 0.80}`
    (new, small — lets `/api/health` report the real winner + AUC instead of the current
    hardcoded `auc=0.6065` in `routes/predict.py`)
- **Delete**: `reason_model.pkl`, `reason_encoder.pkl` training code. Reason comes from SHAP
  now (see §3) — no second model to train. This removes ~30 lines from `train_model.py` and
  the entire multiclass-reason branch.
- `advice_map.pkl`: keep the load-from-CSV pattern, but re-key it (see §4) instead of keying by
  `Churn_Reason` string.

---

## 2. Messy CSV uploads, NaN-native, no imputation

**File: `backend/routes/predict.py`**, function `batch_predict`

- The `column_map` dict already in the file (Title_Case → snake_case) becomes the seed for an
  **alias map** — extend values to lists to catch variant spellings:
  ```python
  ALIASES = {
      "Avg_Out_Of_Pocket_Cost": ["avg_out_of_pocket_cost", "average_out_of_pocket_cost", "out_of_pocket_cost", "avg_oop_cost"],
      # ... one entry per expected column, same pattern
  }
  ```
  Normalize incoming headers: lowercase, strip, replace spaces/dashes with `_`, then match
  against the alias list. This is a pure string-matching function — no fuzzy matching library
  needed, keep it a dict lookup for simplicity/determinism.
- **Missing columns** → after alias-matching, any expected column not found gets added as an
  all-`NaN` column (`df[col] = np.nan`) rather than raising.
- **Unparseable numeric cells** → `pd.to_numeric(df[col], errors="coerce")` per numeric column —
  garbage becomes `NaN`, doesn't crash the request.
- **Unknown columns** → `df = df[[c for c in df.columns if c in expected_set]]`, drop rest
  silently (log count, don't warn — spec says warn about *missing*, not extra).
- **Row cap**: `if len(df) > 50_000: raise HTTPException(400, ...)` before any processing.
- **Warnings list**: collect during the above (`missing_columns`, `coerced_cell_count` per
  column, `dropped_unknown_columns`) into a `List[str]`, attach to response. This is additive —
  `predict_batch` in `predictor.py` doesn't need to know about warnings, routes assembles them.
- No changes needed to `models/predictor.py`'s `predict_batch` signature for this — it already
  takes a raw DataFrame. Only change: it must NOT call `pd.get_dummies` anymore (see §1), and
  must cast categorical columns to `category` dtype before calling `model.predict_proba`.

---

## 3. Explainability — SHAP replaces the rule chain

**File: `backend/models/predictor.py`**

- On `load()`: after loading `churn_model`, build `self.explainer = shap.TreeExplainer(self.churn_model)`
  once. Works identically for HGB/XGB/LGBM — that's why item 1 (native categorical/NaN
  gradient boosters) is a prerequisite, not a separate concern.
- **Delete**: `predict_reason_and_advice`'s entire if/elif rule chain (lines ~98–135 currently),
  and `compute_feature_contributions`'s heuristic min/max normalization (lines ~217–231
  currently). Both replaced by one function:
  ```python
  def compute_shap_drivers(self, X_row) -> List[Driver]:
      shap_values = self.explainer.shap_values(X_row)  # signed, one row
      top3 = sorted(zip(self.feature_names, shap_values[0]), key=lambda x: -abs(x[1]))[:3]
      return [Driver(feature=f, shap_value=round(v, 4)) for f, v in top3]
  ```
- **Single predict** (`predict()` method): call `compute_shap_drivers` per patient — cheap,
  one row.
- **Batch predict** (`predict_batch()` method): full per-row `TreeExplainer.shap_values` on
  every row of a 50k-row upload is the actual cost risk here, not the 3-model bakeoff. Simplest
  workable version:
  - if `len(df) <= 2000`: SHAP every row (TreeExplainer is fast, this is fine).
  - if `len(df) > 2000`: SHAP a stratified sample — top 500 by predicted probability (the
    ones people actually act on) + random 500 from the rest. Remaining rows get
    `top_driver = global_top_driver` (computed once from `self.explainer.shap_values(X_sample)`
    mean abs over the sample) instead of per-row SHAP.
  - Add a `sampled: bool` flag + `sample_size` to `BatchPredictionResponse` so frontend can show
    the UI notice your spec asks for. Don't build a separate "notice" endpoint — one field on
    the existing response.
- Frontend `FeatureChart.jsx`: change bars from all-positive normalized values to signed
  (red = positive/pushes-churn-up, green = negative/pushes-churn-down), diverging from a
  zero-centered axis instead of 0–1 normalized. This is a chart-rendering change only, no new
  component.

---

## 4. Retention advice follows the evidence

**File: `backend/train_model.py`** (advice_map construction) + **new file:
`backend/ml_model/driver_advice.py`** (small, hand-written, not learned from data)

- Your current `advice_map` is built from `df[["Churn_Reason","Retention_Advice"]]` — a 1:1
  string map from the dataset's ground-truth reason column. That column and its exact string
  values won't exist as SHAP driver names (SHAP driver names are feature names, e.g.
  `Avg_Out_Of_Pocket_Cost`, `Overall_Satisfaction`).
- Simplest correct approach: **don't try to auto-derive this mapping from data.** Hand-write a
  small static dict keyed by feature name, each value a dict with `program`/`action`/`detail`,
  matching Repo 2's granularity you described:
  ```python
  DRIVER_ADVICE = {
      "Avg_Out_Of_Pocket_Cost": {"program": "Financial Counseling", "action": "Offer payment plan / cost review", "detail": "..."},
      "Cost_Per_Visit": {...},           # same bucket as above
      "Overall_Satisfaction": {"program": "Care Outreach", "action": "...", "detail": "..."},
      "Wait_Time_Satisfaction": {...},
      "Staff_Satisfaction": {...},
      "Billing_Issues": {...},
      "Missed_Appointments": {"program": "Adherence Support", ...},
      "Portal_Usage": {...},
      "Days_Since_Last_Visit": {...},
      "Distance_To_Facility_Miles": {...},
      "Provider_Rating": {...},
      # + a DEFAULT fallback entry
  }
  ```
  One entry per feature in `model_columns.pkl["features"]`. This is ~20 dict entries, written
  once, not retrained — advice logic shouldn't be statistically learned, it's policy.
- Save as `ml_model/advice_map.pkl` (same filename/slot as before, different keying — nothing
  else needs to know it changed shape beyond `predictor.py`'s lookup).
- `predictor.py`: `advice = self.advice_map.get(top_driver.feature, self.advice_map["DEFAULT"])`.

---

## 5 & 6. Search/filter + Reset — **kept entirely client-side** (deviation flagged above)

No new backend endpoints (`/members`, `/reset`). `POST /api/batch-predict` already returns the
full `results` array in one response — frontend has everything it needs the moment upload
finishes. Confirm this is acceptable; if you need it later (shareable cohort links, resuming a
session across page reload) that's a real reason to add server state, not before.

**File: `frontend/src/components/BatchUpload.jsx`** (rename conceptually to cohort view, or
split — see §7)

- Add local state: `const [search, setSearch] = useState(""); const [tierFilter, setTierFilter] = useState("All");`
- Derive filtered list with `useMemo`:
  ```js
  const filtered = useMemo(() => {
    return results.results
      .filter(r => tierFilter === "All" || r.risk_level === tierFilter)
      .filter(r => r.patient_id.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.probability - a.probability);
  }, [results, search, tierFilter]);
  ```
- Render: text `<input>` + 4 chip `<button>`s (All/High/Medium/Low) above the existing table.
  Table already exists — swap `results.results.slice(0,50)` for `filtered.slice(0,50)`.
- Row click → `setSelectedPatient(row)` → conditionally render a detail panel (gauge + top-3
  SHAP drivers + advice) reusing existing `GaugeChart.jsx` and a new small
  `DriverBars.jsx` (signed bar chart, same component pattern as `FeatureChart.jsx` §3).
- **Clear/Reset**: `App.jsx` already has the exact state shape needed
  (`setPrediction(null)` for the empty state pattern). Add one button:
  ```js
  const handleClear = () => { setCohortResults(null); setSearch(""); setTierFilter("All"); setSelectedPatient(null); };
  ```
  This is a few lines, not a feature — no backend call needed since nothing was persisted
  server-side to begin with.

---

## 7. Frontend reorganization around the cohort

**File: `frontend/src/App.jsx`** (rewrite)

- Remove `Sidebar.jsx`'s single-patient form usage from `App.jsx` (component can stay in the
  tree unused or be deleted — check nothing else imports it before deleting the file).
- Remove `/api/predict` single-patient call path from `api.js` (`predictChurn` function) —
  keep the function only if you want to preserve it for internal testing; otherwise delete.
- New tab set, same `TABS` array pattern already in `App.jsx`:
  ```js
  const TABS = [
    { id: "overview", label: "Risk & Retention Overview" },   // KPI counts, tier distribution, top drivers, action cards
    { id: "analysis", label: "Detailed Analysis" },            // signed SHAP feature chart
    { id: "plan", label: "Retention Action Plan" },             // per-patient intervention list
    { id: "cohort", label: "Cohort Results" },                  // search/filter table + CSV download + detail view
  ];
  ```
- Root state moves from `prediction` (single patient) to `cohortResults` (batch response).
  `EmptyState` component stays, just changes its copy from "complete the patient parameters"
  to "upload a CSV to begin."
- Upload control (currently buried in the `batch` tab as `BatchUpload.jsx`) moves to be the
  primary action visible before any tab exists — e.g. render it in place of tabs when
  `cohortResults === null`, same conditional pattern `App.jsx` already uses for `EmptyState`.
- CSV download: new, small — `results.results` → CSV string (join rows with `,`, no library
  needed for this shape) → `Blob` → `<a download>`. Add as a button in the Cohort Results tab.

---

## 8. Backend schema/artifact changes — summary table

| File | Change |
|---|---|
| `backend/schemas/patient.py` | Add `Driver(BaseModel)` (`feature: str`, `shap_value: float`). Replace `primary_churn_reason: str` with `drivers: List[Driver]` on both `PredictionResponse` and `BatchPredictionRow`. Add `warnings: List[str]` to `BatchPredictionResponse`. Add `sampled: bool`, `sample_size: Optional[int]`. `HealthResponse.model_type`/`auc` now read from `model_meta.pkl` instead of hardcoded string. |
| `backend/routes/predict.py` | `batch_predict`: alias-map normalization, NaN coercion, warnings collection (§2). `predict_churn`: unchanged shape besides `drivers`. **Not adding** `/api/members`, `/api/reset` (§5/6 deviation). |
| `backend/models/predictor.py` | Remove one-hot (`pd.get_dummies`), remove rule chain, remove heuristic contributions, add `TreeExplainer`, add `compute_shap_drivers`, category-dtype casting helper shared by `predict` and `predict_batch`. |
| `backend/train_model.py` | 3-model bakeoff via `compare_models.py`, single winner trained + saved, reason-model training deleted, hand-written `advice_map` (§4). |
| `backend/ml_model/*.pkl` | `churn_model.pkl` (winner), `model_columns.pkl` (dict: features + categorical list, not flat one-hot list), `advice_map.pkl` (re-keyed by feature name), `model_meta.pkl` (new — name + AUC for health endpoint). `reason_model.pkl` / `reason_encoder.pkl` deleted. |

---

## Risks worth knowing before you start

- **SHAP explainer memory**: `TreeExplainer` holds a reference to the full tree structure —
  fine for one model in memory at startup, just don't rebuild it per-request.
- **Category dtype consistency**: train-time categories and inference-time categories must
  match exactly (same `.cat.categories`), or `predict_proba` errors on unseen categories at
  inference. Save the fitted category list alongside `model_columns.pkl`, don't re-infer from
  the incoming CSV.
- **XGBoost/LightGBM absence**: if you deploy somewhere that can't install them (some free-tier
  hosts have wheel-build issues with LightGBM), the app still needs to run on HGB alone —
  that's the reason for the `try/except` import guard in §1, don't skip it.
