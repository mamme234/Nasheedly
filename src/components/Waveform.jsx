import { useEffect, useRef } from 'react';
import { usePlayer } from '@/lib/playerStore';

// Real-time frequency visualization from the live audio element via Web Audio AnalyserNode.
export default function Waveform({ className = '', bars = 56, color = '#D4AF37', height = 64 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const ctxAudioRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const dataRef = useRef(null);
  const phaseRef = useRef(0);
  const { getAudioEl, isPlaying } = usePlayer();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight || height;
      canvas.width = w * dpr; canvas.height = h * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const ctx = canvas.getContext('2d');

    const ensureConnected = () => {
      const audio = getAudioEl();
      if (!audio || sourceRef.current) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        const ac = new AC();
        ctxAudioRef.current = ac;
        const src = ac.createMediaElementSource(audio);
        sourceRef.current = src;
        const analyser = ac.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        src.connect(analyser);
        analyser.connect(ac.destination);
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      } catch (_) { /* already connected */ }
    };

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const gap = 3 * dpr;
      const bw = (w - gap * (bars - 1)) / bars;
      const analyser = analyserRef.current;
      let active = false;
      if (analyser && dataRef.current && isPlaying) {
        if (ctxAudioRef.current?.state === 'suspended') ctxAudioRef.current.resume().catch(() => {});
        analyser.getByteFrequencyData(dataRef.current);
        active = true;
      }
      phaseRef.current += 0.05;
      for (let i = 0; i < bars; i++) {
        let amp;
        if (active && dataRef.current) {
          amp = dataRef.current[i % dataRef.current.length] / 255;
        } else {
          amp = isPlaying ? 0.25 + 0.2 * Math.abs(Math.sin(phaseRef.current + i * 0.4)) : 0.08;
        }
        const barH = Math.max(2 * dpr, amp * h * 0.9);
        const x = i * (bw + gap);
        const y = (h - barH) / 2;
        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, '#F7E08F');
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, '#A67C00');
        ctx.fillStyle = grad;
        const r = Math.min(bw / 2, 3 * dpr);
        ctx.beginPath();
        ctx.roundRect(x, y, bw, barH, r);
        ctx.fill();
      }
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [isPlaying, getAudioEl, bars, color, height]);

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height }} />;
}