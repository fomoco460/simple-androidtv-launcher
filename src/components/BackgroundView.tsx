import React, { useEffect, useRef } from 'react';
import { BackgroundPreset } from '../types';
import { CLEAN_FRAME_WALLPAPERS } from '../data/cleanFrameWallpapers';
import { SPACE_PHOTOS } from '../data/ambientPhotos';

interface BackgroundViewProps {
  preset: BackgroundPreset;
  customUrl?: string;
  activeBackdropUrl?: string;
  /** Draw animated themes once instead of animating (gallery thumbnails). */
  still?: boolean;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
  baseAlpha: number;
}

export const BackgroundView: React.FC<BackgroundViewProps> = ({
  preset,
  customUrl,
  activeBackdropUrl,
  still = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dual-layer state for seamless crossfading between backdrops without black flicker
  const [currentBackdrop, setCurrentBackdrop] = React.useState<string | undefined>(activeBackdropUrl);
  const [previousBackdrop, setPreviousBackdrop] = React.useState<string | undefined>(undefined);
  const [fadeActive, setFadeActive] = React.useState<boolean>(false);

  useEffect(() => {
    if (activeBackdropUrl !== currentBackdrop) {
      setPreviousBackdrop(currentBackdrop);
      setCurrentBackdrop(activeBackdropUrl);
      setFadeActive(false);

      const raf = requestAnimationFrame(() => {
        setFadeActive(true);
      });

      const timer = setTimeout(() => {
        setPreviousBackdrop(undefined);
      }, 500);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [activeBackdropUrl, currentBackdrop]);

  // Find CleanFrame wallpaper if preset starts with 'cf-'
  const cleanFrameWp = preset.startsWith('cf-')
    ? CLEAN_FRAME_WALLPAPERS.find((w) => w.presetId === preset)
    : null;

  // NASA photo wallpapers use preset ids like 'space-earthset-orion'
  const spacePhoto = preset.startsWith('space-') ? SPACE_PHOTOS.find((p) => p.id === preset) : null;

  // Starfield canvas for Desert stars, Deep space, and Nordic aurora
  useEffect(() => {
    if (preset !== 'desert-stars' && preset !== 'deep-space' && preset !== 'nordic-aurora') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const starCount = preset === 'deep-space' ? 320 : 180;
    const stars: Star[] = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.78),
      size: Math.random() * 1.8 + 0.4,
      alpha: Math.random(),
      speed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      baseAlpha: Math.random() * 0.6 + 0.3,
    }));

    let step = 0;
    const render = () => {
      step += 0.01;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.alpha += star.speed;
        if (star.alpha > 1 || star.alpha < 0.15) {
          star.speed = -star.speed;
        }

        ctx.fillStyle = `rgba(240, 246, 255, ${Math.min(1, Math.max(0.1, star.alpha))})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        if (star.size > 1.4) {
          ctx.fillStyle = `rgba(200, 225, 255, ${star.alpha * 0.25})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (preset === 'nordic-aurora') {
        const auroraGradient = ctx.createLinearGradient(0, height * 0.15, width, height * 0.5);
        const shift = Math.sin(step * 0.5) * 40;
        auroraGradient.addColorStop(0, 'rgba(16, 185, 129, 0)');
        auroraGradient.addColorStop(0.3, 'rgba(45, 212, 191, 0.12)');
        auroraGradient.addColorStop(0.6, `rgba(14, 165, 233, ${0.1 + Math.sin(step) * 0.04})`);
        auroraGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

        ctx.fillStyle = auroraGradient;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.2 + shift);
        ctx.bezierCurveTo(
          width * 0.3, height * 0.15 - shift,
          width * 0.7, height * 0.4 + shift,
          width, height * 0.25 - shift
        );
        ctx.lineTo(width, height * 0.55);
        ctx.lineTo(0, height * 0.55);
        ctx.closePath();
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    if (still) cancelAnimationFrame(animationFrameId);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [preset, still]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      {/* BASE WALLPAPER LAYER */}
      {cleanFrameWp || spacePhoto ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${(cleanFrameWp ?? spacePhoto)!.src})` }}
        />
      ) : preset === 'custom' && customUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${customUrl})` }}
        />
      ) : preset === 'desert-stars' ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#060810] via-[#091122] to-[#1a1418]">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              background:
                'radial-gradient(ellipse 65% 90% at 75% 25%, rgba(130, 160, 210, 0.18) 0%, rgba(60, 80, 120, 0.05) 50%, transparent 80%)',
            }}
          />
          <div
            className="absolute bottom-0 inset-x-0 h-[45%] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(194, 98, 42, 0.22) 0%, rgba(135, 62, 30, 0.12) 40%, transparent 75%)',
            }}
          />
          <svg
            className="absolute bottom-0 left-0 w-full h-[32%] text-[#0d090d] preserve-3d"
            viewBox="0 0 1440 320"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 160 C 320 120, 680 200, 1040 140 C 1240 105, 1380 130, 1440 145 L 1440 320 L 0 320 Z"
              fill="rgba(28, 18, 24, 0.65)"
            />
            <path
              d="M0 210 C 240 170, 520 250, 820 180 C 1100 120, 1320 220, 1440 210 L 1440 320 L 0 320 Z"
              fill="rgba(19, 13, 18, 0.88)"
            />
            <path
              d="M0 255 C 380 230, 720 290, 1120 235 C 1300 210, 1400 240, 1440 250 L 1440 320 L 0 320 Z"
              fill="#0a0709"
            />
          </svg>
        </div>
      ) : preset === 'nordic-aurora' ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#020914] via-[#051a24] to-[#040e13]">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 40% 30%, rgba(16, 185, 129, 0.25) 0%, rgba(14, 165, 233, 0.12) 45%, transparent 75%)',
            }}
          />
          <svg
            className="absolute bottom-0 left-0 w-full h-[28%] text-[#030a0f]"
            viewBox="0 0 1440 280"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 140 C 360 80, 720 160, 1080 100 C 1260 70, 1380 90, 1440 95 L 1440 280 L 0 280 Z"
              fill="rgba(4, 18, 22, 0.85)"
            />
            <path
              d="M0 190 C 280 140, 580 210, 920 160 C 1180 120, 1360 170, 1440 165 L 1440 280 L 0 280 Z"
              fill="#02080c"
            />
          </svg>
        </div>
      ) : preset === 'misty-pines' ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c141d] via-[#12222e] to-[#0a1118]">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(ellipse 60% 70% at 50% 30%, rgba(148, 163, 184, 0.15) 0%, transparent 70%)',
            }}
          />
          <svg
            className="absolute bottom-0 left-0 w-full h-[38%] text-[#060c12]"
            viewBox="0 0 1440 380"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 200 L 80 140 L 160 210 L 260 110 L 380 230 L 480 130 L 600 240 L 720 150 L 840 230 L 960 120 L 1080 210 L 1200 130 L 1320 220 L 1440 150 L 1440 380 L 0 380 Z"
              fill="rgba(10, 20, 28, 0.7)"
            />
            <path
              d="M0 260 L 120 180 L 220 270 L 340 160 L 460 270 L 580 190 L 700 280 L 820 170 L 940 260 L 1060 180 L 1180 270 L 1300 190 L 1440 270 L 1440 380 L 0 380 Z"
              fill="#050a0f"
            />
          </svg>
        </div>
      ) : preset === 'cyber-dusk' ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d071a] via-[#1a0f2e] to-[#08030e]">
          <div
            className="absolute inset-0 opacity-35"
            style={{
              background:
                'radial-gradient(circle at 60% 30%, rgba(217, 70, 239, 0.22) 0%, rgba(99, 102, 241, 0.15) 40%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-0 inset-x-0 h-48 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(236, 72, 153, 0.1) 0%, transparent 100%)',
            }}
          />
        </div>
      ) : preset === 'deep-space' ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#020307] via-[#050711] to-[#010204]">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 70% 35%, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.12) 40%, transparent 75%)',
            }}
          />
        </div>
      ) : (
        /* sunset-dunes */
        <div className="absolute inset-0 bg-gradient-to-b from-[#180a0a] via-[#2d1217] to-[#12080d]">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 20%, rgba(249, 115, 22, 0.22) 0%, rgba(225, 29, 72, 0.1) 50%, transparent 80%)',
            }}
          />
        </div>
      )}

      {/* Render Canvas for animated particles / stars (only when active on base ambient presets) */}
      {(preset === 'desert-stars' || preset === 'deep-space' || preset === 'nordic-aurora') && !cleanFrameWp && !spacePhoto && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}

      {/* DYNAMIC APP BACKDROP OVERLAYS (seamless dual-layer crossfade when highlighting apps) */}
      {previousBackdrop && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-500 ease-out opacity-100"
          style={{
            backgroundImage: `url("${previousBackdrop}")`,
          }}
        />
      )}
      {currentBackdrop && (
        <div
          className={`absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-500 ease-out ${
            fadeActive ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url("${currentBackdrop}")`,
          }}
        />
      )}

      {/* Cinematic dark vignettes protecting text readability and floating dock */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.45) 85%, rgba(0, 0, 0, 0.75) 100%)',
        }}
      />

      {/* Bottom gradient to guarantee dock icon contrast */}
      <div
        className="absolute inset-x-0 bottom-0 h-56 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(4, 7, 12, 0.85) 0%, rgba(4, 7, 12, 0.4) 55%, transparent 100%)',
        }}
      />

      {/* Top gradient to guarantee clock & controls contrast */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(4, 7, 12, 0.65) 0%, rgba(4, 7, 12, 0.2) 60%, transparent 100%)',
        }}
      />
    </div>
  );
};
