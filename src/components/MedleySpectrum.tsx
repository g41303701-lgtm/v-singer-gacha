"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface MedleySpectrumProps {
  analyserNode: AnalyserNode | null;
  isMuted?: boolean;
}

const BAR_COUNT = 64; 

export default function MedleySpectrum({ analyserNode, isMuted }: MedleySpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const freqDataRef = useRef<Uint8Array | null>(null);
  
  // スムーズなスケール変化のためのRef
  const scaleRef = useRef(0);

  useEffect(() => {
    if (analyserNode) {
      analyserNode.fftSize = 256; 
      freqDataRef.current = new Uint8Array(analyserNode.frequencyBinCount);
    } else {
      freqDataRef.current = null;
    }
  }, [analyserNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI 対応
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // ミュート状態に合わせてスケールを線形補間 (Lerp)
      // 毎フレーム現在の値から目標値へ10%ずつ近づける
      const targetScale = isMuted ? 0 : 1;
      scaleRef.current += (targetScale - scaleRef.current) * 0.1;

      // We continue the loop even when isMuted is true to allow for smooth transitions
      let freqData: Uint8Array;
      if (analyserNode && freqDataRef.current) {
        analyserNode.getByteFrequencyData(freqDataRef.current as any);
        freqData = freqDataRef.current;
      } else {
        freqData = new Uint8Array(256);
      }

      const cx = w / 2;
      const cy = h / 2;
      
      const radiusOption = Math.min(cx, cy);
      const innerRadius = radiusOption * 0.50; 
      const maxExtrusion = radiusOption * 0.30;

      const barW = Math.max(2, (2 * Math.PI * innerRadius) / BAR_COUNT * 0.6);
      const hueOffset = (Date.now() / 40) % 360;

      for (let i = 0; i < BAR_COUNT; i++) {
        const dataIndex = Math.floor((i / BAR_COUNT) * (freqData.length * 0.6));
        const value = freqData[dataIndex] || 0;
        const normalized = value / 255;
        const scale = Math.pow(normalized, 2.5);
        
        // スケールRefを適用して、高さが0に向かって沈むようにする
        const baseHeight = 2 * scaleRef.current;
        const barH = baseHeight + (scale * maxExtrusion * scaleRef.current);

        const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;

        const x1 = cx + Math.cos(angle) * innerRadius;
        const y1 = cy + Math.sin(angle) * innerRadius;
        const x2 = cx + Math.cos(angle) * (innerRadius + barH);
        const y2 = cy + Math.sin(angle) * (innerRadius + barH);

        const hue = (hueOffset + (i / BAR_COUNT) * 360) % 360;
        const color = `hsla(${hue}, 80%, 60%, ${0.4 + normalized * 0.6})`;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = barW;
        ctx.lineCap = "butt";
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, [analyserNode, isMuted]);

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: isMuted ? 0 : 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="w-full h-full block"
      style={{ imageRendering: "auto" }}
      aria-hidden="true"
    />
  );
}
