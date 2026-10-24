import pandas as pd
import numpy as np
from datetime import datetime

def build_timeseries_features(sales_data: list, window_days: int = 7):
    """
    Constructs time-series features with lags and rolling statistics
    from raw point-of-sale daily records.
    """
    if not sales_data or len(sales_data) == 0:
        return pd.DataFrame(), pd.Series()

    df = pd.DataFrame([{"date": pd.to_datetime(d.date), "quantity": float(d.quantity)} for d in sales_data])
    # Group by date to handle multiple records per day
    df = df.groupby("date")["quantity"].sum().reset_index()
    df = df.sort_values("date").reset_index(drop=True)

    # 1. Calendar Features
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["is_weekend"] = df["day_of_week"].apply(lambda x: 1 if x >= 5 else 0)

    # 2. Lag Features
    df["sales_lag_1"] = df["quantity"].shift(1)
    df["sales_lag_7"] = df["quantity"].shift(7)

    # 3. Rolling Statistics
    df["rolling_mean_7"] = df["quantity"].shift(1).rolling(window=window_days, min_periods=1).mean()
    df["rolling_std_7"] = df["quantity"].shift(1).rolling(window=window_days, min_periods=1).std().fillna(0)

    # Fill NaN lags with available rolling mean or forward fill
    df["sales_lag_1"] = df["sales_lag_1"].fillna(df["quantity"].mean())
    df["sales_lag_7"] = df["sales_lag_7"].fillna(df["sales_lag_1"])
    df["rolling_mean_7"] = df["rolling_mean_7"].fillna(df["quantity"].mean())

    feature_cols = [
        "sales_lag_1",
        "sales_lag_7",
        "rolling_mean_7",
        "rolling_std_7",
        "day_of_week",
        "day_of_month",
        "is_weekend",
    ]

    return df, feature_cols

def chronological_split(df: pd.DataFrame, train_ratio: float = 0.70, val_ratio: float = 0.15):
    """
    Splits time-series chronologically into Train, Validation, and Test sets.
    NEVER randomly shuffles time-series data.
    """
    n = len(df)
    if n < 5:
        return df, df, df

    train_end = max(1, int(n * train_ratio))
    val_end = max(train_end + 1, int(n * (train_ratio + val_ratio)))

    train_df = df.iloc[:train_end]
    val_df = df.iloc[train_end:val_end]
    test_df = df.iloc[val_end:]

    if len(test_df) == 0:
        test_df = val_df

    return train_df, val_df, test_df
