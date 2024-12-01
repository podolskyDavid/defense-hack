import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import logging

import pandas as pd
import numpy as np
from scipy.signal import butter, filtfilt
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ImprovedAccelerationProcessor:
    def __init__(self, csv_file_path):
        self.csv_file_path = csv_file_path
        self.df = None
        self.calibration_samples = 100  # Number of initial samples for calibration
        self.gravity = 9.81  # m/s²
        self.zupt_threshold = 0.05  # Threshold for zero-velocity detection
        self.zupt_window = 5  # Window size for zero-velocity detection

    def load_data(self):
        try:
            self.df = pd.read_csv(self.csv_file_path)
            logger.info(f"Successfully loaded {len(self.df)} rows of data")
            return True
        except Exception as e:
            logger.error(f"Error loading CSV file: {str(e)}")
            return False

    def calibrate_sensor(self):
        """Calibrate initial orientation and sensor bias"""
        # Use initial samples to determine gravity direction and sensor bias
        initial_data = self.df.head(self.calibration_samples)

        # Calculate mean acceleration components during calibration
        acc_mean = initial_data[['acceleration_x', 'acceleration_y', 'acceleration_z']].mean()

        # Estimate gravity direction
        total_acc = np.sqrt(np.sum(acc_mean ** 2))
        gravity_direction = acc_mean / total_acc

        # Store calibration results
        self.gravity_direction = gravity_direction
        self.bias = acc_mean - gravity_direction * self.gravity

        logger.info(f"Calibration completed. Gravity direction: {gravity_direction}")
        return gravity_direction, self.bias

    def apply_high_pass_filter(self, data, cutoff=0.1, fs=100):
        """Apply high-pass filter to remove low-frequency drift"""
        nyquist = fs * 0.5
        normal_cutoff = cutoff / nyquist
        b, a = butter(2, normal_cutoff, btype='high')
        return filtfilt(b, a, data)

    def detect_stationary_periods(self):
        """Detect periods where the device is stationary"""
        acc_magnitude = np.sqrt(
            self.df['acceleration_x'] ** 2 +
            self.df['acceleration_y'] ** 2 +
            self.df['acceleration_z'] ** 2
        )

        # Calculate acceleration variance in sliding windows
        acc_variance = acc_magnitude.rolling(window=self.zupt_window).var()

        # Mark stationary periods where variance is below threshold
        return acc_variance < self.zupt_threshold

    def remove_gravity(self, gravity_direction):
        """Remove gravitational acceleration from measurements"""
        acc_columns = ['acceleration_x', 'acceleration_y', 'acceleration_z']
        acc_data = self.df[acc_columns].values

        # Remove gravity component along estimated direction
        gravity_removal = acc_data - np.outer(
            np.ones(len(acc_data)),
            gravity_direction * self.gravity
        )

        # Update DataFrame with gravity-corrected accelerations
        for i, col in enumerate(acc_columns):
            self.df[f'{col}_corrected'] = gravity_removal[:, i]

    def process_acceleration(self):
        if self.df is None:
            raise ValueError("Data not loaded. Call load_data() first.")

        try:
            # Convert timestamp to seconds and sort
            self.df['time_sec'] = (self.df['timestamp'] - self.df['timestamp'].iloc[0]) / 1000
            self.df = self.df.sort_values('time_sec').reset_index(drop=True)

            # Perform initial calibration
            gravity_direction, bias = self.calibrate_sensor()

            # Remove gravity and apply bias correction
            self.remove_gravity(gravity_direction)

            # Apply high-pass filter to corrected accelerations
            for axis in ['x', 'y', 'z']:
                self.df[f'acceleration_{axis}_filtered'] = self.apply_high_pass_filter(
                    self.df[f'acceleration_{axis}_corrected']
                )

            # Detect stationary periods for ZUPT
            is_stationary = self.detect_stationary_periods()

            # Calculate time differences
            dt = self.df['time_sec'].diff().fillna(0).values

            # Initialize arrays
            velocities = np.zeros((len(self.df), 3))
            positions = np.zeros((len(self.df), 3))

            # Integration loop with ZUPT correction
            for i in range(1, len(self.df)):
                if is_stationary[i]:
                    # Apply zero-velocity update
                    velocities[i] = 0
                else:
                    # Update velocities using filtered acceleration
                    velocities[i] = velocities[i - 1] + np.array([
                        self.df[f'acceleration_{axis}_filtered'].iloc[i]
                        for axis in ['x', 'y', 'z']
                    ]) * dt[i]

                # Update positions
                positions[i] = positions[i - 1] + velocities[i] * dt[i]

            # Add results to DataFrame
            for i, axis in enumerate(['x', 'y', 'z']):
                self.df[f'velocity_{axis}'] = velocities[:, i]
                self.df[f'position_{axis}'] = positions[:, i]

            logger.info("Successfully processed acceleration data with improvements")
            return self.df[['time_sec', 'position_x', 'position_y', 'position_z']]

        except Exception as e:
            logger.error(f"Error processing acceleration data: {str(e)}")
            raise


def main(csv_file_path):
    try:
        # Process acceleration data
        processor = AccelerationProcessor(csv_file_path)
        if not processor.load_data():
            return

        # Get processed position data
        positions_df = processor.process_acceleration()

        # Create and show animation
        visualizer = TrajectoryVisualizer(positions_df)
        visualizer.create_animation()

    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")
        raise


if __name__ == "__main__":
    csv_file_path = '/Users/david/Downloads/data.csv'  # Replace with your actual CSV file path
    main(csv_file_path)