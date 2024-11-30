# Define the time step
time_step = 0.1

# Acceleration data (x, y, z), including gravity
acceleration_data = [
    (0, 0, 9.8),
    (1, 0, 9.8),
    (0, 1, 9.8),
    (-1, 0, 9.8),
    (0, -1, 9.8),
    (0, 0, 9.8),
]

# Function to remove gravity from acceleration data
def remove_gravity(acc_data):
    return [(ax, ay, az - 9.8) for ax, ay, az in acc_data]

# Remove gravity from the acceleration data
acceleration_data = remove_gravity(acceleration_data)

# Function to integrate acceleration to compute velocity
def integrate_acceleration(acc_data, dt):
    velocity = [(0, 0, 0)]  # Initial velocity
    for ax, ay, az in acc_data:
        vx, vy, vz = velocity[-1]
        new_vx = vx + ax * dt
        new_vy = vy + ay * dt
        new_vz = vz + az * dt
        velocity.append((new_vx, new_vy, new_vz))
    return velocity

# Integrate acceleration to compute velocity data
velocity_data = integrate_acceleration(acceleration_data, time_step)

# Function to integrate velocity and acceleration to compute position
def integrate_velocity_and_acceleration(vel_data, acc_data, dt):
    position = [(0, 0, 0)]  # Initial position
    for (vx, vy, vz), (ax, ay, az) in zip(vel_data, acc_data):
        px, py, pz = position[-1]
        # Update position using velocity and acceleration
        new_px = px + vx * dt + 0.5 * ax * dt**2
        new_py = py + vy * dt + 0.5 * ay * dt**2
        new_pz = pz + vz * dt + 0.5 * az * dt**2
        position.append((new_px, new_py, new_pz))
    return position

# Integrate velocity and acceleration to compute position data
position_data = integrate_velocity_and_acceleration(velocity_data, acceleration_data, time_step)

# Print the results
print("Acceleration Data (after removing gravity):", acceleration_data)
print("Velocity Data:", velocity_data)
print("Position Data:", position_data)