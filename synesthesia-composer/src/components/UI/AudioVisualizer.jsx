import { useRef, useEffect } from 'react';

const AudioVisualizer = ({ analyserRef, isActive }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const analyser = analyserRef.current;

        // If audio isn't ready or paused, clear canvas and stop
        if (!analyser || !isActive) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        // Setup data storage for frequency analysis
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const themeColor = '#FFDBBB';

        const draw = () => {
            // Get current frequency data
            analyser.getByteFrequencyData(dataArray);

            // Clear canvas for next frame
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw settings
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            // Loop through data and draw bars
            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height * 0.9; 

                // Create gradient for bars
                const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, themeColor);
                gradient.addColorStop(1, '#333');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(canvas.width / 2 + x, canvas.height - barHeight / 2 - canvas.height/2, barWidth, barHeight);
                ctx.fillRect(canvas.width / 2 - x - barWidth, canvas.height - barHeight / 2 - canvas.height/2, barWidth, barHeight);
                 
                x += barWidth + 1;
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [analyserRef, isActive]);

    return (
        <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginTop: '20px',
            width: '100%',
            minHeight: '150px', 
            background: '#1a1a1a',
            borderRadius: '4px',
            border: '1px solid #333',
            padding: '5px'
        }}>
            <canvas 
                ref={canvasRef} 
                width="140" 
                height="140"
                style={{ display: 'block' }} 
            />
             <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginTop: '5px' }}>
                Visualizer
            </span>
        </div>
    );
};

export default AudioVisualizer;