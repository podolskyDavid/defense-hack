class RealTimeIntegrator:
    def _init_(self, time_step):
        self.time_step = time_step
        self.current_velocity = (0, 0, 0)  # Initial velocity
        self.current_position = (0, 0, 0)  # Initial position

    def update(self, acceleration):
        ax, ay, az = acceleration
        vx, vy, vz = self.current_velocity
        px, py, pz = self.current_position

        # Update velocity
        new_vx = vx + ax * self.time_step
        new_vy = vy + ay * self.time_step
        new_vz = vz + az * self.time_step

        # Update position
        new_px = px + new_vx * self.time_step + 0.5 * ax * self.time_step**2
        new_py = py + new_vy * self.time_step + 0.5 * ay * self.time_step**2
        new_pz = pz + new_vz * self.time_step + 0.5 * az * self.time_step**2

        # Save the new state
        self.current_velocity = (new_vx, new_vy, new_vz)
        self.current_position = (new_px, new_py, new_pz)

        # Return the updated state
        return self.current_position


# Initialize the integrator with a time step
time_step = 0.1
integrator = RealTimeIntegrator(time_step)

# Acceleration data (simulating real-time input)
acceleration_data = [
    (0, 0, 0.0),
    (1, 0, 0.0),
    (0, 1, 0.0),
    (-1, 0, 0.0),
    (0, -1, 0.0),
    (0, 0, 0.0)
]

# Perform real-time integration
for acceleration in acceleration_data:
    position = integrator.update(acceleration)
    print("New Position:", position)