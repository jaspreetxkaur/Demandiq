import pickle, json, asyncio
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile
import io
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shap
from auth_routes import router as auth_router
from smtp_test import router as smtp_test_router

app = FastAPI(title="DemandIQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(smtp_test_router)

# ── Load models ──────────────────────────────────────────
with open("models/lgbm_model.pkl", "rb") as f:
    model = pickle.load(f)

with open("models/le_dict.pkl", "rb") as f:
    le_dict = pickle.load(f)

with open("models/feature_cols.json") as f:
    feature_cols = json.load(f)

with open("models/meta.json") as f:
    meta = json.load(f)

baseline = pd.read_csv("models/baseline_stats.csv")
explainer = shap.TreeExplainer(model)

# ── Request schema ───────────────────────────────────────
class PredictRequest(BaseModel):
    store_nbr: int
    family: str
    onpromotion: int = 0
    is_holiday: int = 0
    oil_price: float = 93.14
    month: int = 6
    day_of_week: int = 2
    week_of_year: int = 24
    quarter: int = 2
    is_weekend: int = 0


# ── Anomaly detection ────────────────────────────────────
def detect_anomaly(store, family_enc, predicted_sales):
    row = baseline[
        (baseline["store_nbr"] == store)
        & (baseline["family"] == family_enc)
    ]

    if row.empty:
        return {
            "is_anomaly": False,
            "severity": "normal",
            "message": "No baseline data."
        }

    mean = row["sales_mean"].values[0]
    std = row["sales_std"].values[0]

    if std == 0:
        return {
            "is_anomaly": False,
            "severity": "normal",
            "message": "Stable product."
        }

    z = (predicted_sales - mean) / std

    if z > 2.5:
        pct = round((predicted_sales - mean) / mean * 100)

        return {
            "is_anomaly": True,
            "severity": "high",
            "message": f"Demand spike detected — {pct}% above normal. Check inventory."
        }

    elif z < -2.5:
        pct = round((mean - predicted_sales) / mean * 100)

        return {
            "is_anomaly": True,
            "severity": "low",
            "message": f"Demand drop detected — {pct}% below normal. Reduce orders."
        }

    return {
        "is_anomaly": False,
        "severity": "normal",
        "message": "Demand within normal range."
    }


# ── Build input row ──────────────────────────────────────
def build_row(
    req,
    family_enc,
    lag_7=500,
    lag_14=480,
    lag_28=460,
    rolling_avg_7=490,
    rolling_avg_28=475,
    trend_7=40,
    city_enc=0,
    state_enc=0,
    type_enc=0,
    cluster=1,
):
    row = {
        "store_nbr": req.store_nbr,
        "family": family_enc,
        "onpromotion": req.onpromotion,
        "city": city_enc,
        "state": state_enc,
        "type": type_enc,
        "cluster": cluster,
        "oil_price": req.oil_price,
        "is_holiday": req.is_holiday,
        "year": 2017,
        "month": req.month,
        "day_of_week": req.day_of_week,
        "week_of_year": req.week_of_year,
        "quarter": req.quarter,
        "is_weekend": req.is_weekend,
        "lag_7": lag_7,
        "lag_14": lag_14,
        "lag_28": lag_28,
        "rolling_avg_7": rolling_avg_7,
        "rolling_avg_28": rolling_avg_28,
        "trend_7": trend_7,
    }

    return pd.DataFrame([row])[feature_cols]


# ── Actionable Advice Generator ──────────────────────────
def generate_advice(
    predicted,
    what_if,
    anomaly,
    family,
    onpromotion,
    is_holiday,
):
    advice = []

    baseline_val = what_if.get("baseline", predicted)
    promo_val = what_if.get("promotion_only", baseline_val)
    holiday_val = what_if.get("holiday_only", baseline_val)

    promo_boost = (
        ((promo_val - baseline_val) / baseline_val * 100)
        if baseline_val > 0 else 0
    )

    holiday_boost = (
        ((holiday_val - baseline_val) / baseline_val * 100)
        if baseline_val > 0 else 0
    )

    if onpromotion == 0 and promo_boost > 5:
        advice.append(
            f"🎯 Running a promotion could increase sales by "
            f"{promo_boost:.1f}%."
        )

    elif onpromotion == 1 and promo_boost < 2:
        advice.append(
            f"⚠️ Current promotion is showing minimal impact "
            f"(+{promo_boost:.1f}%)."
        )

    if is_holiday == 0 and holiday_boost > 10:
        advice.append(
            f"🎉 Upcoming holidays could boost sales by "
            f"{holiday_boost:.1f}%."
        )

    if anomaly["severity"] == "high":
        advice.append(
            "🚨 Demand spike detected. Increase inventory immediately."
        )

    elif anomaly["severity"] == "low":
        advice.append(
            "📉 Demand is below normal. Reduce orders."
        )

    if baseline_val > 0:
        if predicted > baseline_val * 1.2:
            advice.append(
                f"📈 Sales are trending "
                f"{((predicted - baseline_val) / baseline_val * 100):.1f}% "
                f"above baseline."
            )

        elif predicted < baseline_val * 0.8:
            advice.append(
                f"📉 Sales are trending below baseline for {family}."
            )

    if not advice:
        advice.append(
            f"✅ Demand is stable for {family}. Maintain current inventory."
        )

    return advice


def predict_single(req: PredictRequest):
    family_enc = int(
        le_dict["family"].transform([req.family])[0]
    )

    input_df = build_row(req, family_enc)

    pred = max(
        0,
        round(float(model.predict(input_df)[0]), 1)
    )

    # SHAP explanation
    shap_vals = explainer.shap_values(input_df)[0]

    shap_pairs = sorted(
        zip(feature_cols, shap_vals),
        key=lambda x: abs(x[1]),
        reverse=True,
    )[:3]

    drivers = []

    for fname, fval in shap_pairs:

        direction = "boosting" if fval > 0 else "reducing"
        impact = round(abs(fval), 1)

        if "lag" in fname:
            drivers.append(
                f"recent sales history ({direction} by {impact} units)"
            )

        elif "rolling" in fname:
            drivers.append(
                f"sales trend ({direction} by {impact} units)"
            )

        elif "promotion" in fname:
            drivers.append(
                f"promotion status ({direction} by {impact} units)"
            )

        elif "holiday" in fname:
            drivers.append(
                f"holiday effect ({direction} by {impact} units)"
            )

        elif "day_of_week" in fname:
            drivers.append(
                f"day of week ({direction} by {impact} units)"
            )

        elif "oil" in fname:
            drivers.append(
                f"oil price ({direction} by {impact} units)"
            )

        else:
            drivers.append(
                f"{fname} ({direction} by {impact} units)"
            )

    explanation = (
        f"Predicted sales: {pred} units. "
        f"Main drivers: {', '.join(drivers)}."
    )

    anomaly = detect_anomaly(
        req.store_nbr,
        family_enc,
        pred,
    )

    if anomaly["is_anomaly"]:
        explanation += f" {anomaly['message']}"

    # What-if scenarios
    scenarios = {}

    for name, promo, hol in [
        ("baseline", 0, 0),
        ("promotion_only", 1, 0),
        ("holiday_only", 0, 1),
        ("promotion_holiday", 1, 1),
    ]:

        r2 = req.__class__(
            **{
                **req.dict(),
                "onpromotion": promo,
                "is_holiday": hol,
            }
        )

        row2 = build_row(r2, family_enc)

        scenarios[name] = max(
            0,
            round(float(model.predict(row2)[0]), 1)
        )

    advice = generate_advice(
        pred,
        scenarios,
        anomaly,
        req.family,
        req.onpromotion,
        req.is_holiday,
    )

    return {
        "predicted_sales": pred,
        "explanation": explanation,
        "anomaly": anomaly,
        "what_if": scenarios,
        "shap_drivers": [
            {
                "feature": f,
                "impact": round(float(v), 2),
            }
            for f, v in shap_pairs
        ],
        "advice": advice,
    }


# ── /predict endpoint ────────────────────────────────────
@app.post("/predict")
def predict(req: PredictRequest):
    return predict_single(req)


# ── Batch forecasting pipeline ───────────────────────────
def run_forecast_pipeline(df: pd.DataFrame):
    required_cols = {
        "store_nbr": 1,
        "family": "BEVERAGES",
        "onpromotion": 0,
        "is_holiday": 0,
        "oil_price": 93.14,
        "month": 6,
        "day_of_week": 2,
        "week_of_year": 24,
        "quarter": 2,
        "is_weekend": 0
    }

    # Fill missing columns and normalize types
    for col, default in required_cols.items():
        if col not in df.columns:
            df[col] = default
        else:
            df[col] = df[col].fillna(default)
            if isinstance(default, int):
                df[col] = df[col].astype(int)
            elif isinstance(default, float):
                df[col] = df[col].astype(float)
            else:
                df[col] = df[col].astype(str)

    results = []
    known_families = list(le_dict["family"].classes_)

    for _, row in df.iterrows():
        # Clean family name
        family_val = str(row["family"]).strip().upper()
        if family_val not in known_families:
            match = [f for f in known_families if f.upper() == family_val]
            if match:
                family_val = match[0]
            else:
                family_val = "BEVERAGES"

        req = PredictRequest(
            store_nbr=int(row["store_nbr"]),
            family=family_val,
            onpromotion=int(row["onpromotion"]),
            is_holiday=int(row["is_holiday"]),
            oil_price=float(row["oil_price"]),
            month=int(row["month"]),
            day_of_week=int(row["day_of_week"]),
            week_of_year=int(row["week_of_year"]),
            quarter=int(row["quarter"]),
            is_weekend=int(row["is_weekend"])
        )
        res = predict_single(req)
        results.append(res)

    if not results:
        return {
            "predicted_sales": 0.0,
            "explanation": "No data processed.",
            "anomaly": {"is_anomaly": False, "severity": "normal", "message": "No data."},
            "what_if": {"baseline": 0.0, "promotion_only": 0.0, "holiday_only": 0.0, "promotion_holiday": 0.0},
            "shap_drivers": [],
            "advice": ["No data provided."],
            "predictions": []
        }

    predictions = [r["predicted_sales"] for r in results]
    predicted_sales = round(sum(predictions), 1)

    what_if = {
        "baseline": round(sum(r["what_if"]["baseline"] for r in results), 1),
        "promotion_only": round(sum(r["what_if"]["promotion_only"] for r in results), 1),
        "holiday_only": round(sum(r["what_if"]["holiday_only"] for r in results), 1),
        "promotion_holiday": round(sum(r["what_if"]["promotion_holiday"] for r in results), 1),
    }

    # Consolidated SHAP (average impact)
    shap_impacts = {}
    for r in results:
        for driver in r["shap_drivers"]:
            feature = driver["feature"]
            impact = driver["impact"]
            shap_impacts[feature] = shap_impacts.get(feature, 0) + impact

    avg_shap = [
        {"feature": feat, "impact": round(imp / len(results), 2)}
        for feat, imp in shap_impacts.items()
    ]
    avg_shap = sorted(avg_shap, key=lambda x: abs(x["impact"]), reverse=True)[:3]

    # Anomaly status
    is_anomaly = any(r["anomaly"]["is_anomaly"] for r in results)
    severities = [r["anomaly"]["severity"] for r in results if r["anomaly"]["is_anomaly"]]
    severity = "high" if "high" in severities else ("low" if "low" in severities else "normal")
    anomaly_messages = list(set(r["anomaly"]["message"] for r in results if r["anomaly"]["is_anomaly"]))

    if is_anomaly:
        anomaly_msg = " | ".join(anomaly_messages)
    else:
        anomaly_msg = "Demand within normal range across all periods."

    anomaly = {
        "is_anomaly": is_anomaly,
        "severity": severity,
        "message": anomaly_msg
    }

    # Unique advice
    advice_list = []
    for r in results:
        for adv in r["advice"]:
            if adv not in advice_list:
                advice_list.append(adv)

    explanation = f"Batch forecast completed for {len(results)} records. Total predicted sales: {predicted_sales} units."
    if is_anomaly:
        explanation += f" Anomaly warning: {anomaly_msg}"

    return {
        "predicted_sales": predicted_sales,
        "explanation": explanation,
        "anomaly": anomaly,
        "what_if": what_if,
        "shap_drivers": avg_shap,
        "advice": advice_list,
        "predictions": predictions
    }


# ── /api/forecast/upload endpoint ────────────────────────
@app.post("/api/forecast/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        return {"error": "Invalid file format. Please upload a CSV file."}

    try:
        contents = await file.read()
        if not contents:
            return {"error": "Uploaded file is empty."}

        # Run pandas parsing and execution pipeline in a background thread to prevent blocking the event loop
        def process_data():
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
            return run_forecast_pipeline(df)

        results = await asyncio.to_thread(process_data)
        return results
    except Exception as e:
        return {"error": f"Error processing CSV file: {str(e)}"}



# ── /meta endpoint ───────────────────────────────────────
@app.get("/meta")
def get_meta():
    return meta


# ── /health endpoint ─────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "LightGBM",
        "version": "1.0",
    }
