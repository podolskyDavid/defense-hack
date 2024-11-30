# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import sqlite3
import time

from utils.export_to_csv import export_measurements_to_csv

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


class MagneticData(BaseModel):
    x: float
    y: float
    z: float
    magnitude: float
    pitch: float
    roll: float


class MagneticSample(BaseModel):
    magnetic: MagneticData
    location: LocationData


# Initialize database
def init_db():
    conn = sqlite3.connect('magnetic_data.db')
    c = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER DEFAULT (strftime('%s', 'now')), 
            magnetic_x REAL,
            magnetic_y REAL,
            magnetic_z REAL,
            magnetic_magnitude REAL,
            pitch REAL,
            roll REAL,
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
            magnetic_x, magnetic_y, magnetic_z, magnetic_magnitude,
            pitch, roll,
            latitude, longitude, accuracy,
            altitude, altitude_accuracy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sample.magnetic.x,
        sample.magnetic.y,
        sample.magnetic.z,
        sample.magnetic.magnitude,
        sample.magnetic.pitch,
        sample.magnetic.roll,
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
                magnetic_x, magnetic_y, magnetic_z, magnetic_magnitude,
                pitch, roll,
                latitude, longitude, accuracy,
                altitude, altitude_accuracy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            sample.magnetic.x,
            sample.magnetic.y,
            sample.magnetic.z,
            sample.magnetic.magnitude,
            sample.magnetic.pitch,
            sample.magnetic.roll,
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
async def export_data():
    export_measurements_to_csv()
    return {"message": "Data exported to measurements.csv"}