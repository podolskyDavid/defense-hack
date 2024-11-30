from datetime import datetime

from fastapi import FastAPI, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3

from utils.export_to_csv import export_measurements_to_csv, download_measurements_to_csv

app = FastAPI()

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Data models
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
    timestamp: int  # Unix timestamp in milliseconds (e.g., from Date.now())
    session_name: str
    magnetic: MagneticData
    acceleration: AccelerationData
    location: LocationData


# Initialize database
def init_db():
    conn = sqlite3.connect('/Users/david/WebstormProjects/defense-hack/server/magnetic_data.db')
    c = conn.cursor()

    # Drop existing table if you need to update the schema
    # c.execute('DROP TABLE IF EXISTS measurements')

    c.execute('''
        CREATE TABLE IF NOT EXISTS measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    conn.close()


@app.on_event("startup")
async def startup_event():
    init_db()


# Single measurement endpoint
@app.post("/api/measurement")
async def add_measurement(sample: MagneticSample):
    conn = sqlite3.connect('magnetic_data.db')
    c = conn.cursor()

    c.execute("""
        INSERT INTO measurements (
            timestamp, session_name,
            magnetic_x, magnetic_y, magnetic_z, magnetic_magnitude,
            pitch, roll,
            acceleration_x, acceleration_y, acceleration_z,
            latitude, longitude, accuracy,
            altitude, altitude_accuracy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    measurement_id = c.lastrowid
    conn.commit()
    conn.close()

    return {"id": measurement_id}


# Batch measurements endpoint
@app.post("/api/measurements/batch")
async def add_measurements(samples: List[MagneticSample]):
    conn = sqlite3.connect('magnetic_data.db')
    c = conn.cursor()

    for sample in samples:
        c.execute("""
            INSERT INTO measurements (
                timestamp, session_name,
                magnetic_x, magnetic_y, magnetic_z, magnetic_magnitude,
                pitch, roll,
                acceleration_x, acceleration_y, acceleration_z,
                latitude, longitude, accuracy,
                altitude, altitude_accuracy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    conn.close()

    return {"message": f"Added {len(samples)} measurements"}


@app.get("/api/export")
async def export_data(session_name: Optional[str] = Query(None, description="Filter by session name")):
    try:
        # Get CSV content with optional session filter
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