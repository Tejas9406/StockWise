from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ConfigDict


class ForecastRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    destination_id: str = Field(..., description="Destination to forecast")
    product_id: str = Field(..., description="Product to forecast")
    horizon: int = Field(default=4, ge=1, le=52, description="Periods to forecast")
    history: Optional[List[Dict[str, Any]]] = Field(default=None, description="Optional history inline")
    model: Optional[str] = Field(default="baseline", description="Model name e.g. baseline")


class ForecastPoint(BaseModel):
    model_config = ConfigDict(extra="ignore")

    period: int = Field(..., description="Forecast period index (1-indexed)")
    mean: float = Field(..., description="Mean forecast")
    p10: float = Field(..., description="10th percentile")
    p90: float = Field(..., description="90th percentile")


class ForecastResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    destination_id: str = Field(..., description="Destination id")
    product_id: str = Field(..., description="Product id")
    horizon: int = Field(..., description="Forecast horizon")
    model: str = Field(..., description="Model used")
    forecast: List[ForecastPoint] = Field(default_factory=list, description="Forecast points")


class ForecastModelInterface(ABC):
    @abstractmethod
    def forecast(self, request: ForecastRequest) -> ForecastResult:
        """Return forecast for request."""
        raise NotImplementedError

    @abstractmethod
    def train(self, history: List[Dict[str, Any]]) -> None:
        """Optional training hook."""
        raise NotImplementedError
