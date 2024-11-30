import pandas as pd
import sqlite3


def export_measurements_to_csv(db_path='magnetic_data.db', output_file='measurements.csv'):
    # Connect to database
    conn = sqlite3.connect(db_path)

    # Query all data
    query = "SELECT * FROM measurements"

    # Use pandas to read SQL and write to CSV
    df = pd.read_sql_query(query, conn)
    df.to_csv(output_file, index=False)

    conn.close()
    print(f"Data exported to {output_file}")

if __name__ == "__main__":
    export_measurements_to_csv(db_path="/Users/david/WebstormProjects/defense-hack/server/magnetic_data.db")