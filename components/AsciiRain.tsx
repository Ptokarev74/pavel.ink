"use client";

import { useEffect, useRef } from "react";

export default function AsciiRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let lastDrawTime = 0;
    const fps = 30;
    const frameInterval = 1000 / fps;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initDrops();
    };

    // Characters for the rain effect
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*+-/";
    const fontSize = 16;
    let columns = 0;
    let drops: number[] = [];

    const initDrops = () => {
      columns = Math.floor(canvas.width / fontSize) + 1;
      drops = [];
      for (let x = 0; x < columns; x++) {
        // Randomize initial positions so they don't all start at the top together
        drops[x] = Math.random() * -100;
      }
    };

    const draw = (time: number) => {
      animationFrameId = requestAnimationFrame(draw);

      if (time - lastDrawTime < frameInterval) return;
      lastDrawTime = time;

      // Semi-transparent black for the trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cyber green for the text
      ctx.fillStyle = "#00ff88";
      ctx.font = `${fontSize}px "Courier New", monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Only draw if the drop is visible on screen
        if (drops[i] * fontSize >= 0) {
          const text = chars.charAt(Math.floor(Math.random() * chars.length));
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        }

        // Send drop back to top randomly after it crosses the screen
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        
        drops[i]++;
      }
    };

    resize();
    window.addEventListener("resize", resize);
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen opacity-50">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
