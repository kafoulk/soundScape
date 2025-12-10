import { useRef, useEffect } from 'react';

// --- HELPER: WHITE NOISE ---
const createNoiseBuffer = (ctx) => {
    const bufferSize = ctx.sampleRate * 2.0; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
};

// --- HELPER: DISTORTION CURVE ---
const makeDistortionCurve = (amount) => {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
};

// --- SOUND DESIGN CORE ---
const startSound = (ctx, masterGain, instrument, freq, volume = 1.0, buffers, distortionAmount = 0, timbreValue = 0) => {
    if (ctx.state === 'suspended' || ctx.state === 'closed') return null;

    const now = ctx.currentTime;
    const voiceGain = ctx.createGain();
    voiceGain.connect(masterGain);
    voiceGain.gain.setValueAtTime(volume, now);

    // 1. DRUMS (ELLIPSE)
    if (instrument === "ELLIPSE") {
        if (freq < 350) { 
            // KICK DRUM
            if (buffers.kick) {
                // use the kick.mp3 if loaded, otherwise fallback to synth
                const source = ctx.createBufferSource();
                source.buffer = buffers.kick;
                source.playbackRate.value = 0.5 + (freq / 350); 

                const filter = ctx.createBiquadFilter();
                filter.type = "lowpass";
                filter.frequency.value = 200 + (Math.pow(timbreValue, 2) * 15000); 

                if (distortionAmount > 0.1) {
                    const distNode = ctx.createWaveShaper();
                    distNode.curve = makeDistortionCurve(distortionAmount * 400); 
                    distNode.oversample = '4x';
                    source.connect(filter);
                    filter.connect(distNode);
                    distNode.connect(voiceGain);
                } else {
                    source.connect(filter);
                    filter.connect(voiceGain);
                }
                source.start(now);
                return { osc: source, gain: voiceGain };
            } else {
                
                const osc = ctx.createOscillator();
                const kickGain = ctx.createGain(); 
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);

                kickGain.gain.setValueAtTime(volume * 1.2, now);
                kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                
                osc.connect(kickGain);
                kickGain.connect(masterGain); // Connect to master, but don't return master!
                
                osc.start(now);
                osc.stop(now + 0.5);
                
                // BUG FIX: Return 'kickGain', not 'masterGain'
                return { osc, gain: kickGain }; 
            }
        } else {
            // SNARE / HAT
            const source = ctx.createBufferSource();
            source.buffer = buffers.noise; 
            const filter = ctx.createBiquadFilter();
            const hatGain = ctx.createGain();
            
            filter.type = "highpass";
            filter.frequency.value = 4000 + (timbreValue * 6000); 
            
            hatGain.gain.setValueAtTime(1.0, now);
            const hatDecay = 0.15 - (distortionAmount * 0.1); 
            hatGain.gain.exponentialRampToValueAtTime(0.01, now + Math.max(0.02, hatDecay));
            
            source.connect(filter);
            filter.connect(hatGain);
            hatGain.connect(voiceGain); // Connect to the main voice gain
            
            source.start(now);
            source.stop(now + 0.2);
            return { osc: source, gain: voiceGain };
        }
    } 
    // 2. ACID BASS (SQUIGGLE)
    else if (instrument === "SQUIGGLE") {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const distNode = ctx.createWaveShaper();
        osc.type = 'sawtooth';
        osc.frequency.value = freq / 2; 
        filter.type = "lowpass";
        filter.Q.value = 1 + (timbreValue * 20); 
        filter.frequency.setValueAtTime(400, now); 
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.1); 
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.4); 
        distNode.curve = makeDistortionCurve(10 + (distortionAmount * 100)); 
        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.02); 
        voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5); 
        osc.connect(distNode);
        distNode.connect(filter);
        filter.connect(voiceGain);
        osc.start(now);
        return { osc, gain: voiceGain };
    }
    // 3. DUB STAB (LINE)
    else if (instrument === "LINE") {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        filter.type = "bandpass";
        filter.Q.value = 1 + (timbreValue * 5); 
        const filterFreq = 800 + (distortionAmount * 1000);
        filter.frequency.value = filterFreq;
        voiceGain.gain.setValueAtTime(0, now);
        voiceGain.gain.linearRampToValueAtTime(volume, now + 0.01); 
        voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3); 
        osc.connect(filter);
        filter.connect(voiceGain);
        osc.start(now);
        return { osc, gain: voiceGain };
    }
    // 4. Synth (FREEHAND)
    else {
        const osc = ctx.createOscillator();
        const synthGain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.detune.value = distortionAmount * 50; 
        const quietVolume = volume * 0.08;
        synthGain.gain.setValueAtTime(0, now);
        synthGain.gain.linearRampToValueAtTime(quietVolume, now + 0.05);
        const sustain = 0.1 + (timbreValue * 0.5);
        synthGain.gain.linearRampToValueAtTime(quietVolume, now + sustain);
        osc.connect(synthGain);
        synthGain.connect(voiceGain);
        osc.start(now);
        return { osc, gain: voiceGain };
    }
};

// --- MAIN COMPONENT ---
const AudioEngine = ({ finishedDrawings, setPlayheadX, canvasWidth, loopDuration, isPlaying, analyserRef }) => {
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null); 
  const buffersRef = useRef({ kick: null, noise: null }); 
  const requestRef = useRef(null); 
  const activeVoices = useRef({}); 

  // --- REFS ---
  const drawingsRef = useRef(finishedDrawings);
  const durationRef = useRef(loopDuration);
  const widthRef = useRef(canvasWidth);

  useEffect(() => { drawingsRef.current = finishedDrawings; }, [finishedDrawings]);
  useEffect(() => { durationRef.current = loopDuration; }, [loopDuration]);
  useEffect(() => { widthRef.current = canvasWidth; }, [canvasWidth]);

  // --- PLAY/PAUSE ---
  useEffect(() => {
    const ctx = audioContextRef.current;
    if (ctx && ctx.state !== 'closed') {
        if (isPlaying) {
            if (ctx.state === 'suspended') ctx.resume();
        } else {
            if (ctx.state === 'running') ctx.suspend();
        }
    }
  }, [isPlaying]);

  // --- AUDIO CONTEXT SETUP & MAIN LOOP ---
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioContextRef.current;

    masterGainRef.current = ctx.createGain();
    masterGainRef.current.gain.value = 0.8; 

    // Visualizer Setup
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512; 
    
    masterGainRef.current.connect(analyser);
    analyser.connect(ctx.destination);

    if (analyserRef) {
        analyserRef.current = analyser;
    }
    
    buffersRef.current.noise = createNoiseBuffer(ctx);
    fetch('/kick.wav')
        .then(res => res.ok ? res.arrayBuffer() : Promise.reject())
        .then(buf => ctx.decodeAudioData(buf))
        .then(audioBuf => { buffersRef.current.kick = audioBuf; })
        .catch(() => console.warn("Using fallback kick."));
    
    const animate = () => {
        const currentDrawings = drawingsRef.current;
        const currentDuration = durationRef.current || 4.0;
        const currentWidth = widthRef.current;

        if (!ctx || ctx.state === 'closed') return;
        if (ctx.state === 'suspended') {
            requestRef.current = requestAnimationFrame(animate);
            return;
        }

        const loopTime = ctx.currentTime % currentDuration;
        const now = ctx.currentTime;

        if (setPlayheadX) setPlayheadX((loopTime / currentDuration) * currentWidth);

        // CHECK FOR NEW SOUNDS
        currentDrawings.forEach(drawing => {
            const absStart = drawing.relativeStart * currentDuration;
            const absDuration = drawing.relativeWidth * currentDuration;
            const absEnd = absStart + absDuration;
            const isInside = loopTime >= absStart && loopTime < absEnd;
            const isPlayingVoice = activeVoices.current[drawing.id];

            if (isInside && !isPlayingVoice) {
                const voice = startSound(ctx, masterGainRef.current, drawing.instrument, drawing.frequency, drawing.volume, buffersRef.current, drawing.distortion, drawing.timbre);
                if (voice) activeVoices.current[drawing.id] = voice;
            } 
            else if (!isInside && isPlayingVoice) {
                const voice = activeVoices.current[drawing.id];
                // SAFE CHECK
                if(voice && voice.gain && voice.gain.gain) {
                    voice.gain.gain.cancelScheduledValues(now);
                    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
                    voice.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                }
                if(voice && voice.osc) { try { voice.osc.stop(now + 0.05); } catch(e){} }
                delete activeVoices.current[drawing.id];
            }
        });

        // GARBAGE COLLECTION
        Object.keys(activeVoices.current).forEach(voiceId => {
            if (!currentDrawings.some(d => d.id == Number(voiceId))) {
                const voice = activeVoices.current[voiceId];
                if (voice && voice.gain && voice.gain.gain) {
                     voice.gain.gain.cancelScheduledValues(now);
                     voice.gain.gain.linearRampToValueAtTime(0, now + 0.05);
                }
                if (voice && voice.osc) { try { voice.osc.stop(now + 0.05); } catch(e){} }
                delete activeVoices.current[voiceId];
            }
        });

        requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
        cancelAnimationFrame(requestRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return null;
};

export default AudioEngine;