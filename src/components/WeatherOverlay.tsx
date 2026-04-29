import React, { useEffect, useRef } from 'react';

interface WeatherOverlayProps {
  weatherType: string;
  intensity: number;
}

export default function WeatherOverlay({ weatherType, intensity }: WeatherOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    
    // Config based on weather type
    const isRain = weatherType === 'Rain' || weatherType === 'Storm';
    const isSnow = weatherType === 'Snow';
    const isFog = weatherType === 'Fog';
    const isDust = weatherType === 'Windy' || weatherType === 'Dust'; // Adding dust interpretation for windy

    if (!isRain && !isSnow && !isFog && !isDust) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Init particles
    const particleCount = Math.floor((isRain ? 200 : isSnow ? 150 : isFog ? 40 : 100) * (intensity + 0.2));
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: isRain ? Math.random() * 20 + 10 : 0,
        speedY: isRain ? Math.random() * 15 + 10 : isSnow ? Math.random() * 2 + 1 : isFog ? Math.random() * 0.5 - 0.25 : Math.random() * 2 - 1,
        speedX: weatherType === 'Storm' ? Math.random() * 5 + 5 : weatherType === 'Windy' ? Math.random() * 8 + 4 : isSnow ? Math.random() * 2 - 1 : isFog ? Math.random() * 1 - 0.5 : Math.random() * 1 - 0.5,
        radius: isSnow ? Math.random() * 3 + 1 : isFog ? Math.random() * 150 + 50 : isDust ? Math.random() * 2 + 0.5 : 1,
        opacity: Math.random() * 0.5 + 0.1,
        oscillationSpeed: Math.random() * 0.02,
        oscillationPhase: Math.random() * Math.PI * 2
      });
    }

    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (isFog) {
        ctx.globalCompositeOperation = 'lighter';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      particles.forEach((p, i) => {
        ctx.beginPath();
        if (isRain) {
          ctx.strokeStyle = `rgba(174, 194, 224, ${p.opacity})`;
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.speedX * 1.5, p.y + p.length);
          ctx.stroke();
        } else if (isSnow) {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.arc(p.x + Math.sin(time * p.oscillationSpeed + p.oscillationPhase) * 20, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (isFog) {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          grad.addColorStop(0, `rgba(200, 210, 220, ${p.opacity * 0.2})`);
          grad.addColorStop(1, 'rgba(200, 210, 220, 0)');
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (isDust) {
           ctx.fillStyle = `rgba(180, 160, 120, ${p.opacity})`;
           ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
           ctx.fill();
        }

        p.x += p.speedX;
        p.y += p.speedY;

        // Reset particle
        if (p.y > canvas.height + 100 || p.x > canvas.width + 100 || p.x < -100) {
          p.y = isFog ? Math.random() * canvas.height : -20;
          p.x = weatherType === 'Storm' || weatherType === 'Windy' ? Math.random() * canvas.width - canvas.width*0.5 : Math.random() * canvas.width;
        }
      });

      // Global tint for extreme weather
      if (weatherType === 'Storm') {
        if (Math.random() > 0.99) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillRect(0,0, canvas.width, canvas.height);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render(0);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [weatherType, intensity]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-10 opacity-70"
    />
  );
}
