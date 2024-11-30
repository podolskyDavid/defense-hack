interface ControlPanelProps {
  gridSize: number;
  setGridSize: (size: number) => void;
  radius: number;
  setRadius: (radius: number) => void;
}

export function ControlPanel({
                               gridSize,
                               setGridSize,
                               radius,
                               setRadius
                             }: ControlPanelProps) {
  return (
    <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md p-4 rounded-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white">
            Grid Size
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-white text-sm">{gridSize}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-white">
            Interpolation Radius (m)
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-white text-sm">{radius}m</span>
        </div>
      </div>
    </div>
  );
}
