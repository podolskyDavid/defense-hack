from typing import Optional
import os

import pandas as pd
from io import StringIO
import psycopg

# Get database URL from environment variable, with a default fallback
DATABASE_URL = os.getenv('DATABASE_URL', 'postgres:///mag_mapping')


def export_measurements_to_csv(output_file='measurements.csv'):
    """
    Export all measurements to a CSV file

    Args:
        output_file: Path to the output CSV file
    """
    # Connect to database using with context manager for automatic cleanup
    with psycopg.connect(DATABASE_URL) as conn:
        # Query all data
        query = "SELECT * FROM measurements"

        # Use pandas to read SQL and write to CSV
        df = pd.read_sql_query(query, conn)
        df.to_csv(output_file, index=False)

        print(f"Data exported to {output_file}")


def download_measurements_to_csv(session_name: Optional[str] = None) -> str:
    """
    Generate CSV content of measurements, optionally filtered by session name

    Args:
        session_name: Optional session name to filter results

    Returns:
        String containing CSV data
    """
    # Connect to database using with context manager
    with psycopg.connect(DATABASE_URL) as conn:
        # Prepare query based on whether session_name is provided
        if session_name:
            query = "SELECT * FROM measurements WHERE session_name = %s"
            df = pd.read_sql_query(query, conn, params=(session_name,))
        else:
            query = "SELECT * FROM measurements"
            df = pd.read_sql_query(query, conn)

        # Create CSV in memory
        output = StringIO()
        df.to_csv(output, index=False)

        return output.getvalue()


if __name__ == "__main__":
    export_measurements_to_csv()