import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from scipy.spatial.transform import Rotation as R

# Constants
G = 9.81  # Gravitational acceleration in m/s²
DT = 0.1  # Nominal time step
ZUPT_THRESHOLD = 0.1  # Threshold for zero velocity update


def madgwick_update(q, acc, gyro, dt, beta=0.1):
    """
    Implementation of Madgwick filter for orientation tracking
    """
    # Normalize accelerometer measurement
    if np.all(acc == 0):
        return q
    acc = acc / np.linalg.norm(acc)

    # Current orientation quaternion elements
    q1, q2, q3, q4 = q

    # Gradient descent algorithm corrective step
    F = np.array([
        2 * (q2 * q4 - q1 * q3) - acc[0],
        2 * (q1 * q2 + q3 * q4) - acc[1],
        2 * (0.5 - q2 ** 2 - q3 ** 2) - acc[2]
    ])

    J = np.array([
        [-2 * q3, 2 * q4, -2 * q1, 2 * q2],
        [2 * q2, 2 * q1, 2 * q4, 2 * q3],
        [0, -4 * q2, -4 * q3, 0]
    ])

    step = J.T @ F
    step = step / np.linalg.norm(step)

    # Rate of change of quaternion from gyroscope
    q_dot = 0.5 * np.array([
        -q2 * gyro[0] - q3 * gyro[1] - q4 * gyro[2],
        q1 * gyro[0] + q3 * gyro[2] - q4 * gyro[1],
        q1 * gyro[1] - q2 * gyro[2] + q4 * gyro[0],
        q1 * gyro[2] + q2 * gyro[1] - q3 * gyro[0]
    ])

    # Compute and integrate final quaternion rate
    q_new = q + (q_dot - beta * step) * dt
    return q_new / np.linalg.norm(q_new)  # normalize quaternion


def process_imu_data(filename):
    # Read the CSV file
    data = pd.read_csv(filename, header=None)

    # Extract columns
    timestamps = data[0].values
    acc = data[[1, 2, 3]].values  # x, y, z accelerometer readings
    gyro = data[[4, 5, 6]].values  # x, y, z gyroscope readings

    # Initialize arrays for storing results
    n_samples = len(timestamps)
    position = np.zeros((n_samples, 3))
    velocity = np.zeros((n_samples, 3))
    orientation_q = np.zeros((n_samples, 4))
    orientation_q[0] = [1, 0, 0, 0]  # Initial quaternion

    # Process data
    for i in range(1, n_samples):
        dt = (timestamps[i] - timestamps[i - 1]) / 1000  # Convert to seconds

        # Update orientation using Madgwick filter
        orientation_q[i] = madgwick_update(
            orientation_q[i - 1],
            acc[i],
            gyro[i],
            dt
        )

        # Convert acceleration to m/s² and rotate to global frame
        acc_local = acc[i] * G

        # Create rotation matrix from quaternion
        r = R.from_quat([*orientation_q[i, 1:], orientation_q[i, 0]])  # scipy uses [x,y,z,w]
        acc_global = r.apply(acc_local)

        # Remove gravity
        acc_global[2] -= G

        # Zero velocity update
        if np.linalg.norm(acc_global) < ZUPT_THRESHOLD:
            velocity[i] = 0
        else:
            # Integrate acceleration to get velocity
            velocity[i] = velocity[i - 1] + acc_global * dt

        # Integrate velocity to get position
        position[i] = position[i - 1] + velocity[i] * dt

    # Apply loop closure correction
    error = position[-1] - position[0]
    correction = np.outer(np.linspace(0, 1, n_samples), error)
    position_corrected = position - correction

    return timestamps, position_corrected


def plot_3d_trajectory(position):
    fig = plt.figure(figsize=(10, 10))
    ax = fig.add_subplot(111, projection='3d')

    # Plot the trajectory
    ax.plot(position[:, 0], position[:, 1], position[:, 2])

    # Mark start and end points
    ax.scatter(position[0, 0], position[0, 1], position[0, 2], color='green', s=100, label='Start')
    ax.scatter(position[-1, 0], position[-1, 1], position[-1, 2], color='red', s=100, label='End')

    # Set labels and title
    ax.set_xlabel('X (m)')
    ax.set_ylabel('Y (m)')
    ax.set_zlabel('Z (m)')
    ax.set_title('3D Trajectory')

    # Make the plot aspect ratio equal
    max_range = np.array([
        position[:, 0].max() - position[:, 0].min(),
        position[:, 1].max() - position[:, 1].min(),
        position[:, 2].max() - position[:, 2].min()
    ]).max() / 2.0

    mid_x = (position[:, 0].max() + position[:, 0].min()) * 0.5
    mid_y = (position[:, 1].max() + position[:, 1].min()) * 0.5
    mid_z = (position[:, 2].max() + position[:, 2].min()) * 0.5

    ax.set_xlim(mid_x - max_range, mid_x + max_range)
    ax.set_ylim(mid_y - max_range, mid_y + max_range)
    ax.set_zlim(mid_z - max_range, mid_z + max_range)

    ax.legend()

    # Enable interactive rotation
    plt.show()


def main():
    # Process the data
    timestamps, position = process_imu_data('/Users/david/Downloads/data.csv')

    # Print some statistics
    print("Data statistics:")
    print(f"Time span: {(timestamps[-1] - timestamps[0]) / 1000:.2f} seconds")
    print(f"Number of samples: {len(timestamps)}")
    print("\nTrajectory bounds:")
    print(f"X: [{position[:, 0].min():.2f}, {position[:, 0].max():.2f}] m")
    print(f"Y: [{position[:, 1].min():.2f}, {position[:, 1].max():.2f}] m")
    print(f"Z: [{position[:, 2].min():.2f}, {position[:, 2].max():.2f}] m")

    # Plot the trajectory
    plot_3d_trajectory(position)


if __name__ == "__main__":
    main()