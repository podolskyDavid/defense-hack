from datetime import datetime
import os

from fastapi import FastAPI, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import psycopg

from utils.export_to_csv import export_measurements_to_csv, download_measurements_to_csv

# Get database URL from environment variable, with a default value
DATABASE_URL = os.getenv("DATABASE_URL", "postgres:///mag_mapping")

app = FastAPI()

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Data models remain the same
class LocationData(BaseModel):
    latitude: float
    longitude: float
    accuracy: float | None = None
    altitude: float | None = None
    altitudeAccuracy: float | None = None


class AccelerationData(BaseModel):
    x: float
    y: float
    z: float


class MagneticData(BaseModel):
    x: float
    y: float
    z: float
    magnitude: float
    pitch: float
    roll: float


class MagneticSample(BaseModel):
    timestamp: int  # Unix timestamp in milliseconds
    session_name: str
    magnetic: MagneticData
    acceleration: AccelerationData
    location: LocationData


# Initialize database
def init_db():
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute('''
                CREATE TABLE IF NOT EXISTS measurements (
                    id SERIAL PRIMARY KEY,
                    timestamp BIGINT,
                    session_name TEXT,
                    magnetic_x REAL,
                    magnetic_y REAL,
                    magnetic_z REAL,
                    magnetic_magnitude REAL,
                    pitch REAL,
                    roll REAL,
                    acceleration_x REAL,
                    acceleration_y REAL,
                    acceleration_z REAL,
                    latitude REAL,
                    longitude REAL,
                    accuracy REAL,
                    altitude REAL,
                    altitude_accuracy REAL
                )
            ''')
        conn.commit()


@app.on_event("startup")
async def startup_event():
    init_db()


# Single measurement endpoint
@app.post("/api/measurement")
async def add_measurement(sample: MagneticSample):
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO measurements (
                    timestamp, session_name,
                    magnetic_x, magnetic_y, magnetic_z, magnetic_magnitude,
                    pitch, roll,
                    acceleration_x, acceleration_y, acceleration_z,
                    latitude, longitude, accuracy,
                    altitude, altitude_accuracy
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                sample.timestamp,
                sample.session_name,
                sample.magnetic.x,
                sample.magnetic.y,
                sample.magnetic.z,
                sample.magnetic.magnitude,
                sample.magnetic.pitch,
                sample.magnetic.roll,
                sample.acceleration.x,
                sample.acceleration.y,
                sample.acceleration.z,
                sample.location.latitude,
                sample.location.longitude,
                sample.location.accuracy,
                sample.location.altitude,
                sample.location.altitudeAccuracy
            ))
            measurement_id = cur.fetchone()[0]
            conn.commit()

    return {"id": measurement_id}


@app.post("/api/measurements/batch")
async def add_measurements(samples: List[MagneticSample]):
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            for sample in samples:
                cur.execute("""
                    INSERT INTO measurements (
                        timestamp, session_name,
                        magnetic_x, magnetic_y, magnetic_z, magnetic_magnitude,
                        pitch, roll,
                        acceleration_x, acceleration_y, acceleration_z,
                        latitude, longitude, accuracy,
                        altitude, altitude_accuracy
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    sample.timestamp,
                    sample.session_name,
                    sample.magnetic.x,
                    sample.magnetic.y,
                    sample.magnetic.z,
                    sample.magnetic.magnitude,
                    sample.magnetic.pitch,
                    sample.magnetic.roll,
                    sample.acceleration.x,
                    sample.acceleration.y,
                    sample.acceleration.z,
                    sample.location.latitude,
                    sample.location.longitude,
                    sample.location.accuracy,
                    sample.location.altitude,
                    sample.location.altitudeAccuracy
                ))
            conn.commit()

    return {"message": f"Added {len(samples)} measurements"}


@app.get("/api/export")
async def export_data(session_name: Optional[str] = Query(None, description="Filter by session name")):
    try:
        # Use the utility function to get CSV content
        csv_content = download_measurements_to_csv(session_name=session_name)

        # Generate filename with timestamp and optional session name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"measurements_{timestamp}.csv"
        if session_name:
            filename = f"measurements_{session_name}_{timestamp}.csv"

        # Create response with CSV content
        response = Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        return response

    except Exception as e:
        return {"error": str(e)}, 500