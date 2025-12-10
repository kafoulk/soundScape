import { useState, useEffect, useRef } from 'react';

const hsbToHex = (h, s, b) => {
    h = h / 360;
    s = s / 100;
    b = b / 100;
    let r, g, bb; 

    if (s === 0) {
        r = g = bb = b; 
    } else {
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = b * (1 - s);
        const q = b * (1 - f * s);
        const t = b * (1 - (1 - f) * s);
        
        switch (i % 6) {
            case 0: r = b; g = t; bb = p; break;
            case 1: r = q; g = b; bb = p; break;
            case 2: r = p; g = b; bb = t; break;
            case 3: r = p; g = q; bb = b; break;
            case 4: r = t; g = p; bb = b; break;
            case 5: r = b; g = p; bb = q; break;
            default: r = g = bb = 0; break;
        }
    }
    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(bb)}`;
};

// ColorPicker Component
const ColorPicker = ({ onColorChange, width = 800, height = 300 }) => {
    const pickerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: width / 2, y: height / 2 }); 

    const getColorFromPosition = (x, y) => {
        const h = (x / width) * 360;
        const normalizedY = y / height;
        let s, b;
        if (normalizedY <= 0.5) {
            b = 100;
            s = normalizedY * 2 * 100; 
        } else {
            s = 100;
            b = 100 - ((normalizedY - 0.5) * 2 * 100); 
        }
        const hex = hsbToHex(h, s, b);
        onColorChange(hex);
        return { x, y };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const rect = pickerRef.current.getBoundingClientRect();
        let x = Math.max(0, Math.min(e.clientX - rect.left, width));
        let y = Math.max(0, Math.min(e.clientY - rect.top, height));
        setCursorPos(getColorFromPosition(x, y));
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        const rect = pickerRef.current.getBoundingClientRect();
        let x = Math.max(0, Math.min(e.clientX - rect.left, width));
        let y = Math.max(0, Math.min(e.clientY - rect.top, height));
        setCursorPos(getColorFromPosition(x, y));
    };

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]); 

    return (
        <div 
            ref={pickerRef}
            onMouseDown={handleMouseDown}
            style={{
                width: width,
                height: height,
                borderRadius: '8px',
                position: 'relative',
                cursor: 'crosshair',
                backgroundImage: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
                boxShadow: '0 0 15px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.5)',
                border: '1px solid #333'
            }}
        >
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 1) 100%)`
            }} />
            <div style={{
                position: 'absolute', left: cursorPos.x - 8, top: cursorPos.y - 8,
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2px solid white', boxShadow: '0 0 4px black', pointerEvents: 'none'
            }} />
        </div>
    );
};

export default ColorPicker;