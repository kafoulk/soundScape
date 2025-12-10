import { useRef, useEffect } from 'react';

// --- CUSTOM CURSOR: ERASER ICON ---
const eraserCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="white" stroke="black" stroke-width="2" d="M20 20H7L3 16c-1-1-1-3 0-4l9-9 10 10-2 7z"/></svg>') 0 20, auto`;

const DrawingCanvas = ({ 
  width, 
  height, 
  currentDrawing, 
  finishedDrawings, 
  setCurrentDrawing, 
  onDrawingComplete, 
  selectedColor,
  selectedTool,
  playheadX,
  onErase 
}) => {
  const canvasRef = useRef(null);

  // --- RENDERING HELPERS ---
  const drawLine = (ctx, points) => {
    if (points.length < 1) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  };

  const drawEllipse = (ctx, start, end) => {
    ctx.beginPath();
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const drawSquiggle = (ctx, start, end) => {
    ctx.beginPath();
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(angle);
    ctx.moveTo(0, 0);

    const frequency = 0.2; 
    const amplitude = 10;  
    for (let i = 0; i <= distance; i += 5) {
        ctx.lineTo(i, Math.sin(i * frequency) * amplitude);
    }

    ctx.restore();
    ctx.stroke();
  };

  const drawShape = (ctx, drawing) => {
    ctx.strokeStyle = drawing.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!drawing.points || drawing.points.length < 1) return;

    const start = drawing.points[0];
    const end = drawing.points[drawing.points.length - 1];

    if (drawing.type === "FREEHAND") {
        drawLine(ctx, drawing.points);
    } else if (drawing.type === "LINE") {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    } else if (drawing.type === "ELLIPSE") {
        drawEllipse(ctx, start, end);
    } else if (drawing.type === "SQUIGGLE") {
        drawSquiggle(ctx, start, end);
    }
  };


  // --- MAIN RENDER EFFECT ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, width, height);

    finishedDrawings.forEach(d => drawShape(ctx, d));

    if (currentDrawing) {
        drawShape(ctx, currentDrawing);
    }

    if (playheadX !== undefined) {
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // VISUAL DEBUG
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    const label = selectedTool === "ERASER" ? "ERASER MODE (Click to Delete)" : `Tool: ${selectedTool}`;
    ctx.fillText(label, 10, 20);

  }, [finishedDrawings, currentDrawing, width, height, playheadX, selectedTool]);


  // --- COORDINATES ---
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    return { x: mouseX * scaleX, y: mouseY * scaleY };
  };

  // --- MOUSE HANDLERS ---
  const handleMouseDown = (e) => {
    const coords = getCoordinates(e);
    
    if (selectedTool === "ERASER") {
        if (onErase) onErase(coords);
        return; 
    }

    setCurrentDrawing({ 
        type: selectedTool, 
        color: selectedColor, 
        points: [coords] 
    });
  };

  const handleMouseMove = (e) => {
    if (selectedTool === "ERASER") return;

    if (!currentDrawing) return;
    const coords = getCoordinates(e);

    if (selectedTool === "FREEHAND") {
        setCurrentDrawing(prev => ({ ...prev, points: [...prev.points, coords] }));
    } else {
        setCurrentDrawing(prev => ({ ...prev, points: [prev.points[0], coords] }));
    }
  };

  const handleMouseUp = () => {
    if (selectedTool === "ERASER") return;

    if (currentDrawing && currentDrawing.points.length > 1) {
        onDrawingComplete(currentDrawing);
    }
    setCurrentDrawing(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ 
        border: '2px solid #333', 
        backgroundColor: '#fff', 
        cursor: selectedTool === "ERASER" ? eraserCursor : 'crosshair', 
        touchAction: 'none',
        display: 'block' 
      }}
    />
  );
};

export default DrawingCanvas;