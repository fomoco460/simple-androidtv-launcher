import React from 'react';
import { Play, Film, Tv, Music, Radio, Settings, ShoppingBag, Clapperboard, Video, Gamepad2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppItem, IconStylePreset } from '../types';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Generic fallback glyphs. No third-party brand artwork is bundled: on a real device the
 * launcher shows each app's own icon (from PackageManager); these are only used when that
 * isn't available (e.g. browser preview). Keys are internal icon identifiers.
 */
const glyph =
  (Icon: LucideIcon, bg: string): React.FC<IconProps> =>
  ({ className = 'w-6 h-6' }) => (
    <div
      className={`${className} flex items-center justify-center`}
      style={{ background: bg, borderRadius: '22%' }}
    >
      <Icon className="w-3/5 h-3/5 text-white" strokeWidth={2} />
    </div>
  );

export const BrandIcons: Record<string, React.FC<IconProps>> = {
  netflix: glyph(Film, '#7F1D1D'),
  youtube: glyph(Play, '#991B1B'),
  smarttube: glyph(Video, '#9F1239'),
  disney: glyph(Clapperboard, '#1E3A8A'),
  max: glyph(Clapperboard, '#5B21B6'),
  prime: glyph(Tv, '#0C4A6E'),
  apple: glyph(Tv, '#334155'),
  spotify: glyph(Music, '#14532D'),
  plex: glyph(Play, '#78350F'),
  hulu: glyph(Tv, '#14532D'),
  twitch: glyph(Gamepad2, '#4C1D95'),
  tubi: glyph(Film, '#713F12'),
  crunchyroll: glyph(Film, '#9A3412'),
  kodi: glyph(Radio, '#155E75'),
  settings: glyph(Settings, '#334155'),
  tivimate: glyph(Radio, '#164E63'),
  playstore: glyph(ShoppingBag, '#1E3A8A'),
  xfinity: glyph(Tv, '#312E81'),
  generic: glyph(Play, '#1E293B'),
};

interface AppIconProps {
  app: AppItem;
  styleMode?: IconStylePreset;
  className?: string;
  imgClassName?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  app,
  styleMode = 'stock',
  className = 'w-8 h-8',
  imgClassName = 'w-full h-full object-contain rounded-lg',
}) => {
  // If app has native Android icon from PackageManager, display real stock icon directly!
  if (app.iconUrl && styleMode === 'stock') {
    return (
      <div className={`flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
        <img
          src={app.iconUrl}
          alt={app.name}
          className={imgClassName}
          onError={(e) => {
            // If native base64 fails to load, gracefully hide img and show vector fallback
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Otherwise, use official stock brand vector
  const IconComponent = BrandIcons[app.iconType] || BrandIcons.generic;
  return (
    <div className={`flex items-center justify-center shrink-0 ${className}`}>
      <IconComponent className="w-full h-full" />
    </div>
  );
};
