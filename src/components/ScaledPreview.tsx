import React, { useEffect, useRef, useState } from 'react';

/**
 * Shows its children exactly as they look full-screen, shrunk to fit a 16:9 box.
 * The children are laid out at the real window size and scaled down, so the preview
 * always matches the real screen (same icons, spacing and clock sizes). Not interactive.
 */
export const ScaledPreview: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.3);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const update = () => {
      const box = boxRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      setSize({ w, h });
      if (box && box.clientWidth > 0) setScale(box.clientWidth / w);
    };
    update();
    const ro = new ResizeObserver(update);
    if (boxRef.current) ro.observe(boxRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className={`relative w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/15 shadow-2xl pointer-events-none select-none ${className}`}
      style={{ aspectRatio: `${size.w} / ${size.h}` }}
      aria-hidden="true"
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
};
