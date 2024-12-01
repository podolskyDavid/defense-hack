import numpy as np
import pandas as pd
from scipy.signal import medfilt
from scipy.interpolate import interp1d, griddata
from filterpy.kalman import KalmanFilter
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D


class IMUPathTrackerImproved:
    def __init__(self, csv_file):
        # Physical constraints
        self.MAX_VELOCITY = 3.0  # m/s
        self.MAX_VERTICAL_VELOCITY = 1.5  # m/s
        self.MAX_ACCELERATION = 10.0  # m/s²
        self.G = 9.81

        # Load and preprocess data
        self.data = pd.read_csv(csv_file)
        self.process_timestamps()

    def process_timestamps(self):
        """Convert timestamps to seconds and calculate time deltas."""
        self.data['time'] = (self.data['timestamp'] - self.data['timestamp'].iloc[0]) / 1000.0
        self.data['dt'] = np.diff(self.data['time'], prepend=self.data['time'].iloc[0])

    def median_filter_signals(self, window_size=5):
        """Apply median filter to accelerometer and orientation data."""
        for col in ['acceleration_x', 'acceleration_y', 'acceleration_z',
                    'orientation_pitch', 'orientation_roll', 'orientation_yaw',
                    'magnetic_magnitude']:  # Added magnetic_magnitude to filtered signals
            self.data[col] = medfilt(self.data[col], window_size)

    def detect_stationary_periods(self, acc_magnitude, window_size=5, threshold=0.1):
        """Detect when the device is stationary using acceleration variance."""
        acc_std = pd.Series(acc_magnitude).rolling(window=window_size).std()
        is_stationary = acc_std < threshold
        return is_stationary

    def bidirectional_kalman_filter(self, acc_global):
        """Apply Kalman filtering in both forward and backward directions."""
        # Initialize Kalman filter
        kf = KalmanFilter(dim_x=6, dim_z=3)  # State: [x, y, z, vx, vy, vz]
        dt = np.mean(self.data['dt'])

        # State transition matrix
        kf.F = np.array([
            [1, 0, 0, dt, 0, 0],
            [0, 1, 0, 0, dt, 0],
            [0, 0, 1, 0, 0, dt],
            [0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 1]
        ])

        # Measurement matrix (we observe accelerations)
        kf.H = np.array([
            [0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 1]
        ])

        # Measurement noise
        kf.R = np.eye(3) * 0.1

        # Process noise
        q = 0.1
        kf.Q = np.array([
            [dt ** 4 / 4, 0, 0, dt ** 3 / 2, 0, 0],
            [0, dt ** 4 / 4, 0, 0, dt ** 3 / 2, 0],
            [0, 0, dt ** 4 / 4, 0, 0, dt ** 3 / 2],
            [dt ** 3 / 2, 0, 0, dt ** 2, 0, 0],
            [0, dt ** 3 / 2, 0, 0, dt ** 2, 0],
            [0, 0, dt ** 3 / 2, 0, 0, dt ** 2]
        ]) * q

        # Initial state covariance
        kf.P *= 1000

        # Forward pass
        positions_fwd = np.zeros((len(acc_global), 3))
        velocities_fwd = np.zeros((len(acc_global), 3))

        for i in range(len(acc_global)):
            kf.predict()
            kf.update(acc_global[i])

            # Apply physical constraints
            velocities = kf.x[3:6]
            speed = np.linalg.norm(velocities)
            if speed > self.MAX_VELOCITY:
                velocities *= self.MAX_VELOCITY / speed
                kf.x[3:6] = velocities

            # Constrain vertical velocity
            if abs(kf.x[5]) > self.MAX_VERTICAL_VELOCITY:
                kf.x[5] = np.sign(kf.x[5]) * self.MAX_VERTICAL_VELOCITY

            positions_fwd[i] = kf.x[0:3].flatten()
            velocities_fwd[i] = kf.x[3:6].flatten()

        # Backward pass
        kf.x = np.zeros(6)
        kf.P *= 1000

        positions_bwd = np.zeros((len(acc_global), 3))
        velocities_bwd = np.zeros((len(acc_global), 3))

        for i in range(len(acc_global) - 1, -1, -1):
            kf.predict()
            kf.update(acc_global[i])
            positions_bwd[i] = kf.x[0:3].flatten()
            velocities_bwd[i] = kf.x[3:6].flatten()

        # Combine forward and backward passes with weighted average
        alpha = np.linspace(0, 1, len(acc_global))
        positions = alpha[:, np.newaxis] * positions_fwd + (1 - alpha[:, np.newaxis]) * positions_bwd
        velocities = alpha[:, np.newaxis] * velocities_fwd + (1 - alpha[:, np.newaxis]) * velocities_bwd

        return positions, velocities

    def remove_outliers(self, positions, window_size=5, threshold=3):
        """Remove position outliers using median filtering and interpolation."""
        cleaned_positions = np.zeros_like(positions)

        for i in range(3):  # For each dimension (x, y, z)
            # Calculate median and MAD
            rolling_median = pd.Series(positions[:, i]).rolling(window_size, center=True).median()
            rolling_mad = pd.Series(np.abs(positions[:, i] - rolling_median)).rolling(window_size, center=True).median()

            # Identify outliers
            outliers = np.abs(positions[:, i] - rolling_median) > (threshold * rolling_mad)

            # Interpolate outliers
            good_indices = ~outliers
            interpolator = interp1d(np.where(good_indices)[0], positions[good_indices, i],
                                    kind='linear', fill_value='extrapolate')
            cleaned_positions[:, i] = interpolator(np.arange(len(positions)))

        return cleaned_positions

    def process_path(self):
        """Process IMU data to reconstruct the path with improved filtering."""
        # 1. Apply median filter to raw signals
        self.median_filter_signals()

        # 2. Convert accelerations to m/s² and remove gravity
        acc_data = np.column_stack([
            self.data['acceleration_x'],
            self.data['acceleration_y'],
            self.data['acceleration_z']
        ]) * self.G

        # 3. Detect stationary periods
        acc_magnitude = np.linalg.norm(acc_data, axis=1)
        is_stationary = self.detect_stationary_periods(acc_magnitude)

        # 4. Apply bidirectional Kalman filter
        positions, velocities = self.bidirectional_kalman_filter(acc_data)

        # 5. Remove outliers
        cleaned_positions = self.remove_outliers(positions)

        # 6. Apply zero velocity during stationary periods
        velocities[is_stationary] = 0

        # 7. Apply loop closure
        error = cleaned_positions[-1] - cleaned_positions[0]
        correction = np.outer(np.linspace(0, 1, len(cleaned_positions)), error)
        final_positions = cleaned_positions - correction

        return final_positions, velocities

    def create_magnetic_heatmap(self, positions, resolution=100):
        """Create interpolated magnetic field heatmap."""
        # Define grid
        x_min, x_max = positions[:, 0].min(), positions[:, 0].max()
        y_min, y_max = positions[:, 1].min(), positions[:, 1].max()

        # Add padding to the grid
        padding = 0.1 * max(x_max - x_min, y_max - y_min)
        x_min -= padding
        x_max += padding
        y_min -= padding
        y_max += padding

        xi = np.linspace(x_min, x_max, resolution)
        yi = np.linspace(y_min, y_max, resolution)
        xi_mg, yi_mg = np.meshgrid(xi, yi)

        # Interpolate magnetic magnitude values
        mag_interpolated = griddata(
            (positions[:, 0], positions[:, 1]),
            self.data['magnetic_magnitude'],
            (xi_mg, yi_mg),
            method='cubic',
            fill_value=np.nan
        )

        return xi_mg, yi_mg, mag_interpolated

    def plot_results(self, positions, velocities):
        """Plot the results with enhanced visualization including magnetic heatmap."""
        fig = plt.figure(figsize=(20, 15))

        # 3D trajectory (top left)
        ax1 = fig.add_subplot(231, projection='3d')
        ax1.plot(positions[:, 0], positions[:, 1], positions[:, 2])
        ax1.scatter(positions[0, 0], positions[0, 1], positions[0, 2],
                    color='green', s=100, label='Start')
        ax1.scatter(positions[-1, 0], positions[-1, 1], positions[-1, 2],
                    color='red', s=100, label='End')
        ax1.set_xlabel('X (m)')
        ax1.set_ylabel('Y (m)')
        ax1.set_zlabel('Z (m)')
        ax1.set_title('3D Trajectory')
        ax1.legend()

        # Top view with time progression (top middle)
        ax2 = fig.add_subplot(232)
        scatter = ax2.scatter(positions[:, 0], positions[:, 1],
                              c=self.data['time'], cmap='viridis',
                              s=30, alpha=0.6)
        ax2.plot(positions[:, 0], positions[:, 1], alpha=0.3, color='blue')
        ax2.scatter(positions[0, 0], positions[0, 1], color='green',
                    s=100, label='Start')
        ax2.scatter(positions[-1, 0], positions[-1, 1], color='red',
                    s=100, label='End')
        plt.colorbar(scatter, label='Time (s)')
        ax2.set_xlabel('X (m)')
        ax2.set_ylabel('Y (m)')
        ax2.set_title('Top View (X-Y Plane)')
        ax2.grid(True)
        ax2.legend()

        # Magnetic field heatmap (top right)
        ax3 = fig.add_subplot(233)
        xi_mg, yi_mg, mag_interpolated = self.create_magnetic_heatmap(positions)
        im = ax3.pcolormesh(xi_mg, yi_mg, mag_interpolated, cmap='magma', shading='auto')
        ax3.plot(positions[:, 0], positions[:, 1], 'w-', alpha=0.5, linewidth=2)
        ax3.scatter(positions[0, 0], positions[0, 1], color='green',
                    s=100, label='Start')
        ax3.scatter(positions[-1, 0], positions[-1, 1], color='red',
                    s=100, label='End')
        plt.colorbar(im, label='Magnetic Magnitude')
        ax3.set_xlabel('X (m)')
        ax3.set_ylabel('Y (m)')
        ax3.set_title('Magnetic Field Heatmap')
        ax3.grid(True)
        ax3.legend()

        # Height profile (bottom left)
        ax4 = fig.add_subplot(234)
        ax4.plot(self.data['time'], positions[:, 2])
        ax4.set_xlabel('Time (s)')
        ax4.set_ylabel('Height (m)')
        ax4.set_title('Height Profile')
        ax4.grid(True)

        # Velocity profile (bottom middle)
        ax5 = fig.add_subplot(235)
        velocity_magnitude = np.linalg.norm(velocities, axis=1)
        ax5.plot(self.data['time'], velocity_magnitude)
        ax5.set_xlabel('Time (s)')
        ax5.set_ylabel('Velocity (m/s)')
        ax5.set_title('Velocity Magnitude')
        ax5.grid(True)

        # Magnetic magnitude profile (bottom right)
        ax6 = fig.add_subplot(236)
        ax6.plot(self.data['time'], self.data['magnetic_magnitude'])
        ax6.set_xlabel('Time (s)')
        ax6.set_ylabel('Magnetic Magnitude')
        ax6.set_title('Magnetic Magnitude vs Time')
        ax6.grid(True)

        plt.tight_layout()
        plt.show()

def main():
    # Initialize tracker
    tracker = IMUPathTrackerImproved('/Users/david/Downloads/data.csv')

    # Process the path
    positions, velocities = tracker.process_path()

    # Plot results
    tracker.plot_results(positions, velocities)

    # Print statistics
    print("\nPath Statistics:")
    print(f"Total distance: {np.sum(np.linalg.norm(np.diff(positions, axis=0), axis=1)):.2f} m")
    print(f"Maximum velocity: {np.max(np.linalg.norm(velocities, axis=1)):.2f} m/s")
    print(f"Average velocity: {np.mean(np.linalg.norm(velocities, axis=1)):.2f} m/s")
    print(f"Maximum height: {np.max(positions[:, 2]):.2f} m")
    print(f"Loop closure error: {np.linalg.norm(positions[-1] - positions[0]):.2f} m")
    print(f"Maximum magnetic magnitude: {np.max(tracker.data['magnetic_magnitude']):.2f}")
    print(f"Minimum magnetic magnitude: {np.min(tracker.data['magnetic_magnitude']):.2f}")

if __name__ == "__main__":
    main()