import { useRef, useEffect } from 'react';

// Custom SVG cursor for the Eraser tool to improve UX.
const eraserCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="%23FFC0CB" stroke="black" stroke-width="1.5" d="M16.24 3.56l4.95 4.95c.78.78.78 2.05 0 2.83L9.9 22.62c-.78.78-2.05.78-2.83 0L2.12 17.67c-.78-.78-.78-2.05 0-2.83L13.41 3.56c.78-.78 2.05-.78 2.83 0z"/></svg>') 2 22, auto`;

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
  // use a Ref to access the actual DOM <canvas> element directly.
  const canvasRef = useRef(null);

  // --- RENDERING HELPERS ---
  // These small helper functions keep the main draw loop clean and modular.

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
    // use the standard ellipse method which allows for different X and Y radii.
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const drawSquiggle = (ctx, start, end) => {
    ctx.beginPath();
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // save/restore the context state here because I'm rotating the entire canvas grid to draw the sine wave along the angle of the mouse drag.
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
  // This useEffect triggers whenever the drawings change or the playhead moves. Clear the entire canvas and redraw everything every frame to ensure smooth animation.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear previous frame
    ctx.clearRect(0, 0, width, height);

    // Draw persistent shapes
    finishedDrawings.forEach(d => drawShape(ctx, d));

    // Draw the shape currently being dragged/drawn
    if (currentDrawing) {
        drawShape(ctx, currentDrawing);
    }

    // Draw the red playhead line if the audio engine is running
    if (playheadX !== undefined) {
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Debug info for user feedback
    ctx.fillStyle = "#888";
    ctx.font = "10px Arial";
    const label = selectedTool === "ERASER" ? "ERASER MODE (Click to Delete)" : "";
    ctx.fillText(label, 10, 15);

  }, [finishedDrawings, currentDrawing, width, height, playheadX, selectedTool]);


  // --- COORDINATE NORMALIZATION ---
  // This fixes offsets caused by CSS scaling or padding. It ensures the mouse position aligns  with the drawing tip.
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
    
    // If Eraser is active, don't start a new drawing stroke. Instead, pass the click coordinates up to App.js to check for deletions.
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

    // For Freehand, append every point to create a path. For Shapes (Line, Ellipse), only update the END point, creating a "rubber band" effect
    if (selectedTool === "FREEHAND") {
        setCurrentDrawing(prev => ({ ...prev, points: [...prev.points, coords] }));
    } else {
        setCurrentDrawing(prev => ({ ...prev, points: [prev.points[0], coords] }));
    }
  };

  const handleMouseUp = () => {
    if (selectedTool === "ERASER") return;

    // Commit the drawing to the 'finishedDrawings' state in App.js
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
        // swap the cursor to give immediate visual feedback about the active tool
        cursor: selectedTool === "ERASER" ? eraserCursor : 'crosshair', 
        touchAction: 'none',
        display: 'block' 
      }}
    />
  );
};

export default DrawingCanvas;