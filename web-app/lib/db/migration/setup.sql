CREATE TABLE measurements
(
    id                SERIAL PRIMARY KEY,
    timestamp         BIGINT NOT NULL,
    session_name      TEXT   NOT NULL,
    magnetic_x        REAL   NOT NULL,
    magnetic_y        REAL   NOT NULL,
    magnetic_z        REAL   NOT NULL,
    magnetic_magnitude REAL   NOT NULL,
    acceleration_x    REAL   NOT NULL,
    acceleration_y    REAL   NOT NULL,
    acceleration_z    REAL   NOT NULL,
    orientation_pitch REAL   NOT NULL,
    orientation_roll  REAL   NOT NULL,
    orientation_yaw   REAL   NOT NULL,
    latitude          REAL   NOT NULL,
    longitude         REAL   NOT NULL,
    accuracy          REAL   NOT NULL,
    altitude          REAL   NOT NULL,
    altitude_accuracy REAL   NOT NULL
);

-- Add an index on session_name for faster queries
CREATE INDEX idx_measurements_session ON measurements (session_name);

-- Add an index on timestamp for faster sorting
CREATE INDEX idx_measurements_timestamp ON measurements (timestamp);