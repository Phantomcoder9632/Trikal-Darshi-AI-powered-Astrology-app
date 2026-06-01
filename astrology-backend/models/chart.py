from datetime import date, time, datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

class ChartRequest(BaseModel):
    """
    Validation schema for creating a new birth chart.
    """
    full_name: str = Field(..., min_length=1, max_length=200, examples=["Arjun Sharma"])
    date_of_birth: date = Field(..., examples=["1990-07-15"])
    time_of_birth: time = Field(..., examples=["14:30:00"])
    city_of_birth: str = Field(..., min_length=1, max_length=200, examples=["Mumbai"])
    current_city: str = Field(..., min_length=1, max_length=200, examples=["Bangalore"])
    latitude: float = Field(..., ge=-90.0, le=90.0, examples=[19.0760])
    longitude: float = Field(..., ge=-180.0, le=180.0, examples=[72.8777])
    timezone: str = Field("Asia/Kolkata", examples=["Asia/Kolkata"])
    birth_time_confidence: str = Field("exact", examples=["exact", "approximate"])
    ayanamsha: str = Field("LAHIRI", examples=["LAHIRI", "RAMAN", "KP", "FAGAN_BRADLEY", "TRUE_CITRA"])
    data_source: str = Field("astrologyapi", examples=["astrologyapi", "ephemeris"])

    @field_validator("date_of_birth")
    @classmethod
    def dob_cannot_be_in_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Date of birth cannot be in the future.")
        return v

class ChartResponse(BaseModel):
    """
    Complete birth chart details returned after creation or retrieval.
    """
    id: UUID
    full_name: str
    date_of_birth: date
    time_of_birth: time
    city_of_birth: str
    current_city: str
    latitude: float
    longitude: float
    timezone: str
    birth_time_confidence: str
    ayanamsha: str
    data_source: str
    raw_chart_data: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChartSummary(BaseModel):
    """
    Lightweight summary for listing multiple charts.
    """
    id: UUID
    full_name: str
    date_of_birth: date
    city_of_birth: str
    created_at: datetime

    class Config:
        from_attributes = True

class InterpretationRequest(BaseModel):
    """
    Validation schema to trigger or regenerate a tab reading.
    """
    chart_id: UUID
    tab_number: int = Field(..., ge=1, le=8, description="Vedic interpretation tab index from 1 to 8")
    tab_name: str = Field(..., min_length=1, max_length=100, examples=["Personality & Life Path"])
    regenerate: bool = Field(False, description="Set to true to force regenerate with DeepSeek even if cached in DB")

class InterpretationResponse(BaseModel):
    """
    Interpretation text returned for a tab.
    """
    id: UUID
    chart_id: UUID
    tab_number: int
    tab_name: str
    content: str
    model_used: str
    generated_at: datetime

    class Config:
        from_attributes = True
