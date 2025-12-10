import { useState, useEffect, memo, useRef } from "react";
import "./App.css";
import DrawingCanvas from "./components/DrawingCanvas";
import AudioEngine from "./components/audioEngine";
import ColorPicker from "./components/colorPicker";
import AudioVisualizer from "./components/UI/AudioVisualizer";

const INTERNAL_WIDTH = 800;
const INTERNAL_HEIGHT = 400;
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

// --- 1. HELPER COMPONENTS ---

// used React.memo here because the App component re-renders 60 times a second. Memoizing the buttons prevents them from re-rendering unnecessarily, keeping the UI responsive
const NeonButton = memo(({ tool, label, icon, isSelected, onClick }) => (
  <button
    className={`neon-btn ${isSelected ? "active" : ""}`}
    onClick={() => onClick(tool)}
  >
    <span style={{ fontSize: "16px" }}>{icon}</span> <span>{label}</span>
  </button>
));

const PlayButton = memo(({ isPlaying, onClick }) => (
  <button
    className={`play-btn ${!isPlaying ? "paused" : ""}`}
    onClick={onClick}
  >
    {isPlaying ? (
      <>
        <span>⏸</span> Pause
      </>
    ) : (
      <>
        <span>▶</span> Resume
      </>
    )}
  </button>
));

// Colorpicker would be expensive to render, so I memoized this to prevent lag during audio playback.
const MemoizedColorPicker = memo(ColorPicker);

// --- 2. CONTENT MENUS ---

const InstrumentsMenu = memo(
  ({ selectedTool, setSelectedTool, onUndo, onClear, closeMobileMenu }) => {
    const handleToolClick = (tool) => {
      setSelectedTool(tool);
      if (closeMobileMenu) closeMobileMenu();
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <h4 className="panel-header">Instruments</h4>

        <NeonButton
          tool="FREEHAND"
          label="FREEHAND"
          icon="✎"
          isSelected={selectedTool === "FREEHAND"}
          onClick={handleToolClick}
        />
        <NeonButton
          tool="LINE"
          label="LINE"
          icon="\"
          isSelected={selectedTool === "LINE"}
          onClick={handleToolClick}
        />
        <NeonButton
          tool="ELLIPSE"
          label="CIRCLE"
          icon="〇"
          isSelected={selectedTool === "ELLIPSE"}
          onClick={handleToolClick}
        />
        <NeonButton
          tool="SQUIGGLE"
          label="SQUIGGLE"
          icon="〰"
          isSelected={selectedTool === "SQUIGGLE"}
          onClick={handleToolClick}
        />

        <div className="divider" />

        <NeonButton
          tool="ERASER"
          label="Erase"
          icon="⌫"
          isSelected={selectedTool === "ERASER"}
          onClick={handleToolClick}
        />

        <div className="action-row">
          <button className="action-btn undo-btn" onClick={onUndo}>
            ↵ UNDO
          </button>
          <button className="action-btn clear-btn" onClick={onClear}>
            CLEAR CANVAS
          </button>
        </div>
      </div>
    );
  }
);

const InfoMenu = memo(({ isPlaying, setIsPlaying, analyserRef }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    {setIsPlaying && (
      <div style={{ marginBottom: "20px" }}>
        <PlayButton
          isPlaying={isPlaying}
          onClick={() => setIsPlaying(!isPlaying)}
        />
      </div>
    )}

    <div className="tutorial-section">
      <h4>Sound Guide</h4>
      <div className="tutorial-row">
        <span>Width</span> <span>Duration</span>
      </div>
      <div className="tutorial-row">
        <span>Height</span> <span>Pitch</span>
      </div>
      <div className="tutorial-row">
        <span className="highlight-red">Red</span> <span>Distortion</span>
      </div>
      <div className="tutorial-row">
        <span className="highlight-blue">Blue</span> <span>Depth/Filter</span>
      </div>
    </div>

    {/* I added this live visualizer to fill white space and make the UI more engaging */}
    <AudioVisualizer analyserRef={analyserRef} isActive={isPlaying} />
  </div>
));

// --- 3. MAIN APP COMPONENT ---

const App = () => {
  // State for application logic
  const [finishedDrawings, setFinishedDrawings] = useState([]);
  const [currentDrawing, setCurrentDrawing] = useState(null);
  const [selectedColor, setSelectedColor] = useState("#0000FF");
  const [selectedTool, setSelectedTool] = useState("FREEHAND");
  const [playheadX, setPlayheadX] = useState(0);
  const [loopDuration, setLoopDuration] = useState(4);
  const [isPlaying, setIsPlaying] = useState(true);

  // State for responsive mobile layout
  const [showTools, setShowTools] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // I used a Ref for the analyser node so I can share the audio data between the AudioEngine (which generates sound) and the Visualizer (which displays it) without triggering re-renders.
  const analyserRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const responsiveWidth = Math.min(windowWidth - 40, 800);

  // --- LOGIC ---
  const addDrawing = (drawing) => {
    // Calculate bounding box to determine start time (x) and pitch (y)
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    drawing.points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const width = maxX - minX;
    const height = maxY - minY;

    // store positions as 0.0-1.0 percentages so the loop still works if user resizes the window or canvas
    const relativeStart = minX / INTERNAL_WIDTH;
    const relativeWidth = width / INTERNAL_WIDTH;

    // Map Y-axis to musical scale
    const avgY = (minY + maxY) / 2;
    const normalizedY = 1 - avgY / INTERNAL_HEIGHT;
    const scaleIndex = Math.floor(normalizedY * SCALE.length);
    const clampedIndex = Math.max(0, Math.min(SCALE.length - 1, scaleIndex));
    const frequency = SCALE[clampedIndex];

    // Volume logic based on shape size
    let volume = 0.5;
    if (drawing.type === "ELLIPSE") {
      const area = width * height;
      const maxArea = INTERNAL_WIDTH * 0.5 * (INTERNAL_HEIGHT * 0.5);
      volume = 0.5 + (area / maxArea) * 2.5;
    } else {
      volume = 0.8;
    }

    // Map color channels to audio effects
    const r = parseInt(selectedColor.substring(1, 3), 16);
    const b = parseInt(selectedColor.substring(5, 7), 16);
    const distortion = r / 255;
    const timbre = b / 255;

    const newDrawing = {
      id: Date.now(),
      type: drawing.type,
      color: selectedColor,
      points: drawing.points,
      minX,
      maxX,
      minY,
      maxY,
      relativeStart,
      relativeWidth,
      frequency,
      instrument: drawing.type,
      volume,
      distortion,
      timbre,
    };

    setFinishedDrawings((prev) => [...prev, newDrawing]);
  };

  const undoLastDrawing = () =>
    setFinishedDrawings((prev) => prev.slice(0, -1));

  const handleErase = (clickCoords) => {
    // Reverse array to delete the top shape first
    const reversedDrawings = [...finishedDrawings].reverse();
    const drawingToDelete = reversedDrawings.find((d) => {
      const padding = 20;
      return (
        clickCoords.x >= d.minX - padding &&
        clickCoords.x <= d.maxX + padding &&
        clickCoords.y >= d.minY - padding &&
        clickCoords.y <= d.maxY + padding
      );
    });
    if (drawingToDelete) {
      setFinishedDrawings((prev) =>
        prev.filter((d) => d.id !== drawingToDelete.id)
      );
    }
  };

  const clearDrawings = () => {
    setFinishedDrawings([]);
    setCurrentDrawing(null);
  };

  return (
    <div className="app-container">
      <div className="header-section">
        <h1>SoundScapes</h1>
        <p>
          Experience drawing through a <strong>synesthesia lens</strong>. Pick
          your shape, lock in your color, and sketch your rhythm on the
          timeline.
          <br />
          <p>Make sure your volume is ON & begin creating below!</p>
        </p>
      </div>

      <div
        className="mobile-play-btn-container"
        style={{ display: windowWidth < 1000 ? "block" : "none" }}
      >
        <PlayButton
          isPlaying={isPlaying}
          onClick={() => setIsPlaying(!isPlaying)}
        />
      </div>

      <div className="main-grid">
        {/* LEFT COL */}
        <div className="panel info-col">
          <InfoMenu
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            analyserRef={analyserRef}
          />
        </div>

        {/* CENTER COL */}
        <div className="center-col-wrapper" style={{ display: "contents" }}>
          <div className="color-picker-container">
            <MemoizedColorPicker
              onColorChange={setSelectedColor}
              width={responsiveWidth}
              height={80}
            />
          </div>

          <div className="canvas-container">
            <DrawingCanvas
              width={INTERNAL_WIDTH}
              height={INTERNAL_HEIGHT}
              currentDrawing={currentDrawing}
              finishedDrawings={finishedDrawings}
              setCurrentDrawing={setCurrentDrawing}
              onDrawingComplete={addDrawing}
              selectedColor={selectedColor}
              selectedTool={selectedTool}
              playheadX={playheadX}
              onErase={handleErase}
            />
          </div>

          <div className="time-ruler-container">
            <div className="ticks-row">
              {[...Array(Math.floor(loopDuration) + 1)].map((_, i) => (
                <span key={i} className="tick-label">
                  | {i}s
                </span>
              ))}
            </div>
            <div className="time-slider-box">
              <span className="time-label">LOOP: {loopDuration}s</span>
              <input
                className="slider-input"
                type="range"
                min="2"
                max="6"
                step="0.5"
                value={loopDuration}
                onChange={(e) => setLoopDuration(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COL */}
        <div className="panel instruments-col">
          <InstrumentsMenu
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            onUndo={undoLastDrawing}
            onClear={clearDrawings}
          />
        </div>
      </div>

      {/* --- MOBILE MODALS --- */}
      <button className="fab fab-left" onClick={() => setShowInfo(true)}>
        ⓘ
      </button>
      <button className="fab fab-right" onClick={() => setShowTools(true)}>
        ✎
      </button>

      {showInfo && (
        <div className="modal-overlay" onClick={() => setShowInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowInfo(false)}>
              ×
            </button>
            <h3 style={{ marginTop: 0, color: "#FFDBBB" }}>Guide</h3>
            <InfoMenu
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              analyserRef={analyserRef}
            />
          </div>
        </div>
      )}

      {showTools && (
        <div className="modal-overlay" onClick={() => setShowTools(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowTools(false)}>
              ×
            </button>
            <InstrumentsMenu
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              onUndo={undoLastDrawing}
              onClear={clearDrawings}
              closeMobileMenu={() => setShowTools(false)}
            />
          </div>
        </div>
      )}

      <AudioEngine
        finishedDrawings={finishedDrawings}
        setPlayheadX={setPlayheadX}
        canvasWidth={INTERNAL_WIDTH}
        loopDuration={loopDuration}
        isPlaying={isPlaying}
        analyserRef={analyserRef}
      />
    </div>
  );
};

export default App;
