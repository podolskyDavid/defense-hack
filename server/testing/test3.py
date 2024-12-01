import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from scipy.spatial.transform import Rotation as R
from scipy.signal import butter, filtfilt
from filterpy.kalman import KalmanFilter
from filterpy.common import Q_discrete_white_noise

# Constants
G = 9.81  # Gravitational acceleration in m/s²
ZUPT_THRESHOLD = 0.1  # Threshold for zero velocity update
ZUPT_WINDOW = 5  # Window size for ZUPT detection


class IMUPathTracker:
    def __init__(self, csv_file):
        """Initialize the IMU path tracker."""
        self.data = pd.read_csv(csv_file)
        self.process_timestamps()
        self.initialize_kalman_filter()

    def process_timestamps(self):
        """Convert timestamps to seconds and calculate time deltas."""
        self.data['time'] = (self.data['timestamp'] - self.data['timestamp'].iloc[0]) / 1000.0
        self.data['dt'] = np.diff(self.data['time'], prepend=self.data['time'].iloc[0])

    def initialize_kalman_filter(self):
        """Initialize the Kalman filter for position and velocity estimation."""
        # State vector: [x, y, z, vx, vy, vz]
        self.kf = KalmanFilter(dim_x=6, dim_z=3)

        # Initialize state transition matrix
        self.kf.F = np.eye(6)

        # Initialize measurement function (we only measure acceleration)
        self.kf.H = np.zeros((3, 6))
        self.kf.H[:, 3:] = np.eye(3)

        # Initialize covariance matrices
        self.kf.R = np.eye(3) * 0.1  # Measurement noise
        self.kf.P = np.eye(6) * 1000  # Initial state uncertainty

        # Initialize state
        self.kf.x = np.zeros(6)

    def butterworth_filter(self, data, cutoff, fs, order=4):
        """Apply Butterworth low-pass filter to the data."""
        nyq = 0.5 * fs
        normal_cutoff = cutoff / nyq
        b, a = butter(order, normal_cutoff, btype='low', analog=False)
        return filtfilt(b, a, data, axis=0)

    def detect_stationary_periods(self, acc_magnitude):
        """Detect periods when the device is stationary using acceleration magnitude."""
        acc_std = pd.Series(acc_magnitude).rolling(window=ZUPT_WINDOW).std()
        return acc_std < ZUPT_THRESHOLD

    def process_orientation(self):
        """Process orientation data using rotation matrices."""
        # Convert orientation angles to rotation matrices
        orientations = np.column_stack([
            self.data['orientation_pitch'],
            self.data['orientation_roll'],
            self.data['orientation_yaw']
        ])

        # Create rotation objects
        rotations = R.from_euler('xyz', orientations)
        return rotations

    def remove_gravity(self, acc_data, rotations):
        """Remove gravity from accelerometer readings using orientation data."""
        # Convert accelerations from g's to m/s²
        acc_ms2 = acc_data * G

        # Rotate accelerations to global frame and remove gravity
        acc_global = np.zeros_like(acc_ms2)
        gravity = np.array([0, 0, -G])

        for i in range(len(acc_ms2)):
            # Rotate acceleration to global frame
            acc_global[i] = rotations[i].apply(acc_ms2[i])
            # Remove gravity
            acc_global[i] -= gravity

        return acc_global

    def apply_kalman_filter(self, acc_global):
        """Apply Kalman filter to estimate position and velocity."""
        positions = np.zeros((len(acc_global), 3))
        velocities = np.zeros((len(acc_global), 3))

        for i in range(len(acc_global)):
            dt = self.data['dt'].iloc[i]

            # Update state transition matrix for current dt
            self.kf.F[0:3, 3:6] = np.eye(3) * dt

            # Update process noise
            q = Q_discrete_white_noise(dim=2, dt=dt, var=0.1, block_size=3)
            self.kf.Q = q

            # Predict
            self.kf.predict()

            # Update with acceleration measurements
            z = acc_global[i]
            self.kf.update(z)

            # Store results
            positions[i] = self.kf.x[0:3]
            velocities[i] = self.kf.x[3:6]

            # Apply ZUPT if detected
            if self.detect_stationary_periods(np.linalg.norm(acc_global[i])).any():
                self.kf.x[3:6] = 0  # Reset velocities
                velocities[i] = 0

        return positions, velocities

    def apply_loop_closure(self, positions):
        """Apply loop closure correction to the trajectory."""
        # Calculate error between start and end points
        error = positions[-1] - positions[0]

        # Create correction factors
        t = np.linspace(0, 1, len(positions))
        corrections = np.outer(t, error)

        # Apply corrections
        corrected_positions = positions - corrections
        return corrected_positions

    def process(self):
        """Process the IMU data and reconstruct the path."""
        # Extract accelerometer data
        acc_data = np.column_stack([
            self.data['acceleration_x'],
            self.data['acceleration_y'],
            self.data['acceleration_z']
        ])

        # Process orientations
        rotations = self.process_orientation()

        # Remove gravity and convert to global frame
        acc_global = self.remove_gravity(acc_data, rotations)

        # Apply Butterworth filter to smooth accelerations
        sample_rate = 1.0 / np.mean(self.data['dt'])
        acc_filtered = self.butterworth_filter(acc_global, cutoff=2.0, fs=sample_rate)

        # Apply Kalman filter
        positions, velocities = self.apply_kalman_filter(acc_filtered)

        # Apply loop closure
        corrected_positions = self.apply_loop_closure(positions)

        return corrected_positions, velocities

    def plot_results(self, positions, velocities):
        """Plot the reconstructed path and motion data."""
        # Create figure with subplots
        fig = plt.figure(figsize=(15, 10))

        # 3D trajectory plot
        ax1 = fig.add_subplot(221, projection='3d')
        ax1.plot(positions[:, 0], positions[:, 1], positions[:, 2])
        ax1.scatter(positions[0, 0], positions[0, 1], positions[0, 2],
                    color='green', label='Start')
        ax1.scatter(positions[-1, 0], positions[-1, 1], positions[-1, 2],
                    color='red', label='End')
        ax1.set_xlabel('X (m)')
        ax1.set_ylabel('Y (m)')
        ax1.set_zlabel('Z (m)')
        ax1.set_title('3D Trajectory')
        ax1.legend()

        # Top view (X-Y plane)
        ax2 = fig.add_subplot(222)
        ax2.plot(positions[:, 0], positions[:, 1])
        ax2.scatter(positions[0, 0], positions[0, 1], color='green', label='Start')
        ax2.scatter(positions[-1, 0], positions[-1, 1], color='red', label='End')
        ax2.set_xlabel('X (m)')
        ax2.set_ylabel('Y (m)')
        ax2.set_title('Top View')
        ax2.legend()

        # Z position over time
        ax3 = fig.add_subplot(223)
        ax3.plot(self.data['time'], positions[:, 2])
        ax3.set_xlabel('Time (s)')
        ax3.set_ylabel('Z (m)')
        ax3.set_title('Vertical Position')

        # Velocity magnitudes
        ax4 = fig.add_subplot(224)
        velocity_magnitude = np.linalg.norm(velocities, axis=1)
        ax4.plot(self.data['time'], velocity_magnitude)
        ax4.set_xlabel('Time (s)')
        ax4.set_ylabel('Velocity (m/s)')
        ax4.set_title('Velocity Magnitude')

        plt.tight_layout()
        plt.show()


def main():
    # Initialize and process data
    tracker = IMUPathTracker('/Users/david/Downloads/mag_mapping_public_measurements.csv')
    positions, velocities = tracker.process()

    # Plot results
    tracker.plot_results(positions, velocities)

    # Print some statistics
    print("\nTrajectory Statistics:")
    print(f"Total distance: {np.sum(np.linalg.norm(np.diff(positions, axis=0), axis=1)):.2f} meters")
    print(f"Maximum velocity: {np.max(np.linalg.norm(velocities, axis=1)):.2f} m/s")
    print(f"Average velocity: {np.mean(np.linalg.norm(velocities, axis=1)):.2f} m/s")
    print(f"Loop closure error (before correction): {np.linalg.norm(positions[-1] - positions[0]):.2f} meters")


if __name__ == "__main__":
    main()