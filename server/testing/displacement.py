import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.animation import FuncAnimation
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AccelerationProcessor:
    def __init__(self, csv_file_path):
        """Initialize the processor with the CSV file path."""
        self.csv_file_path = csv_file_path
        self.df = None

    def load_data(self):
        """Load and validate the CSV data."""
        try:
            self.df = pd.read_csv(self.csv_file_path)
            required_columns = ['timestamp', 'acceleration_x', 'acceleration_y', 'acceleration_z']

            # Validate required columns
            missing_columns = [col for col in required_columns if col not in self.df.columns]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")

            # Remove any NaN values
            self.df = self.df.dropna(subset=required_columns)

            logger.info(f"Successfully loaded {len(self.df)} rows of data")
            return True

        except Exception as e:
            logger.error(f"Error loading CSV file: {str(e)}")
            return False

    def process_acceleration(self):
        """Process acceleration data using improved integration methods."""
        if self.df is None:
            raise ValueError("Data not loaded. Call load_data() first.")

        try:
            # Convert timestamp to seconds and ensure it's monotonically increasing
            self.df['time_sec'] = (self.df['timestamp'] - self.df['timestamp'].iloc[0]) / 1000
            self.df = self.df.sort_values('time_sec').reset_index(drop=True)

            # Calculate time differences
            dt = self.df['time_sec'].diff().fillna(0).values

            # Initialize arrays for velocity and position
            velocities = np.zeros((len(self.df), 3))
            positions = np.zeros((len(self.df), 3))

            # Get acceleration data as numpy arrays for faster processing
            acc_x = self.df['acceleration_x'].values
            acc_y = self.df['acceleration_y'].values
            acc_z = self.df['acceleration_z'].values

            # Integrate acceleration to velocity using forward Euler method
            for i in range(1, len(self.df)):
                velocities[i] = velocities[i - 1] + np.array([acc_x[i], acc_y[i], acc_z[i]]) * dt[i]
                positions[i] = positions[i - 1] + velocities[i] * dt[i]

            # Add results to DataFrame
            self.df['velocity_x'], self.df['velocity_y'], self.df['velocity_z'] = velocities[:, 0], velocities[:,
                                                                                                    1], velocities[:, 2]
            self.df['position_x'], self.df['position_y'], self.df['position_z'] = positions[:, 0], positions[:,
                                                                                                   1], positions[:, 2]

            # Apply a simple moving average to smooth the data
            window_size = min(5, len(self.df) // 2)  # Ensure window size isn't too large for the data
            self.df[['position_x', 'position_y', 'position_z']] = self.df[
                ['position_x', 'position_y', 'position_z']].rolling(
                window=window_size,
                center=True,
                min_periods=1  # Allow partial windows
            ).mean()

            logger.info("Successfully processed acceleration data")
            return self.df[['time_sec', 'position_x', 'position_y', 'position_z']]

        except Exception as e:
            logger.error(f"Error processing acceleration data: {str(e)}")
            raise


class TrajectoryVisualizer:
    def __init__(self, data):
        """Initialize the visualizer with processed position data."""
        self.data = data
        self.fig = None
        self.ax = None
        self.scatter = None
        self.line = None
        self.animation = None

    def setup_plot(self):
        """Set up the plot with proper styling and limits."""
        self.fig, self.ax = plt.subplots(figsize=(10, 8))

        # Set limits with some padding
        pad = 0.1
        x_range = self.data['position_x'].max() - self.data['position_x'].min()
        y_range = self.data['position_y'].max() - self.data['position_y'].min()

        if x_range == 0: x_range = 1  # Handle case where all x values are the same
        if y_range == 0: y_range = 1  # Handle case where all y values are the same

        self.ax.set_xlim(
            self.data['position_x'].min() - x_range * pad,
            self.data['position_x'].max() + x_range * pad
        )
        self.ax.set_ylim(
            self.data['position_y'].min() - y_range * pad,
            self.data['position_y'].max() + y_range * pad
        )

        # Style the plot
        self.ax.set_xlabel('X Position')
        self.ax.set_ylabel('Y Position')
        self.ax.set_title('Object Trajectory')
        self.ax.grid(True, linestyle='--', alpha=0.7)

        # Create empty scatter plot for current position
        self.scatter = self.ax.scatter([], [], c='red', s=100, label='Current Position')
        # Create empty line plot for trajectory
        self.line, = self.ax.plot([], [], 'b-', alpha=0.5, label='Trajectory')

        self.ax.legend()

    def animate(self, frame):
        """Animation function for updating the plot."""
        # Ensure frame index is valid
        frame = min(frame, len(self.data) - 1)

        # Update trajectory line
        self.line.set_data(
            self.data['position_x'][:frame + 1],
            self.data['position_y'][:frame + 1]
        )

        # Update current position
        self.scatter.set_offsets([
            [self.data['position_x'].iloc[frame],
             self.data['position_y'].iloc[frame]]
        ])

        return self.scatter, self.line

    def create_animation(self, interval=50):
        """Create and display the animation."""
        if self.fig is None:
            self.setup_plot()

        self.animation = FuncAnimation(
            self.fig,
            self.animate,
            frames=len(self.data),
            interval=interval,
            blit=True,
            repeat=False
        )

        plt.show()


def main(csv_file_path):
    """Main function to process and visualize acceleration data."""
    try:
        # Process acceleration data
        processor = AccelerationProcessor(csv_file_path)
        if not processor.load_data():
            return

        positions_df = processor.process_acceleration()

        # Visualize trajectory
        visualizer = TrajectoryVisualizer(positions_df)
        visualizer.create_animation()

    except Exception as e:
        logger.error(f"Error in main function: {str(e)}")
        raise


if __name__ == "__main__":
    csv_file_path = '/Users/david/Downloads/data.csv'  # Replace with your actual CSV file path
    main(csv_file_path)