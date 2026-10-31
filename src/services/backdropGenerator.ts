import { AppItem } from '../types';

/**
 * Backdrops are generated procedurally (see generateProceduralBackdrop). No third-party
 * brand artwork is bundled; apps use their own on-device icon/banner where available.
 */
export const BUILTIN_APP_BACKDROPS: Record<string, string> = {};

export type BackdropGeneratorStyle = 'hero' | 'static' | 'oled' | 'cinematic';

export interface BrandBackdropPreset {
  id: string;
  name: string;
  /** Short label shown on the preset tile */
  appKey: string;
  /** Unused for generated presets (the backdrop is generated per app); kept for compatibility */
  url: string;
  accent: string;
  style: BackdropGeneratorStyle;
  description: string;
}

export const BRAND_BACKDROP_PRESETS: BrandBackdropPreset[] = [
  { id: 'gen-sky-hero', name: 'Sky Hero', appKey: 'hero', url: '', accent: '#38BDF8', style: 'hero', description: 'Centered title card with a sky-blue halo' },
  { id: 'gen-crimson-hero', name: 'Crimson Hero', appKey: 'hero', url: '', accent: '#EF4444', style: 'hero', description: 'Centered title card with a crimson halo' },
  { id: 'gen-violet-hero', name: 'Violet Hero', appKey: 'hero', url: '', accent: '#8B5CF6', style: 'hero', description: 'Centered title card with a violet halo' },
  { id: 'gen-emerald-hero', name: 'Emerald Hero', appKey: 'hero', url: '', accent: '#10B981', style: 'hero', description: 'Centered title card with an emerald halo' },
  { id: 'gen-amber-hero', name: 'Amber Hero', appKey: 'hero', url: '', accent: '#F59E0B', style: 'hero', description: 'Centered title card with an amber halo' },
  { id: 'gen-cyan-oled', name: 'Cyan OLED', appKey: 'oled', url: '', accent: '#22D3EE', style: 'oled', description: 'Pure black with a thin cyan emblem' },
  { id: 'gen-white-oled', name: 'White OLED', appKey: 'oled', url: '', accent: '#E2E8F0', style: 'oled', description: 'Pure black with a minimal white emblem' },
  { id: 'gen-blue-cinematic', name: 'Blue Cinematic', appKey: 'cinematic', url: '', accent: '#3B82F6', style: 'cinematic', description: 'Volumetric blue horizon glow' },
  { id: 'gen-rose-cinematic', name: 'Rose Cinematic', appKey: 'cinematic', url: '', accent: '#F43F5E', style: 'cinematic', description: 'Volumetric rose horizon glow' },
  { id: 'gen-slate-static', name: 'Slate Static', appKey: 'static', url: '', accent: '#94A3B8', style: 'static', description: 'Retro CRT static with a soft glow' },
  { id: 'gen-lime-static', name: 'Lime Static', appKey: 'static', url: '', accent: '#84CC16', style: 'static', description: 'Retro CRT static with a lime glow' },
];


/**
 * In-memory cache for generated backdrops so they re-render instantaneously.
 */
const generatedBackdropCache: Record<string, string> = {};

/**
 * Helper to convert hex code to RGB numbers
 */
function hexToRgb(hex?: string): { r: number; g: number; b: number } {
  if (!hex) return { r: 56, g: 189, b: 248 };
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 56, g: 189, b: 248 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Generates an ultra-crisp, brand-representing title card SVG backdrop.
 * Matches the authentic look of Netflix & HBO title backdrops:
 * Centered brand emblem, radiant halo in brand accent, clean typography, dark obsidian cinema background.
 */
export function generateProceduralBackdrop(
  app: { name: string; accentColor?: string; category?: string; id?: string },
  style: BackdropGeneratorStyle = 'hero',
  seedVariation: number = 0
): string {
  const cacheKey = `${app.id || app.name}-${app.accentColor || ''}-${style}-${seedVariation}`;
  if (generatedBackdropCache[cacheKey]) {
    return generatedBackdropCache[cacheKey];
  }

  const { r, g, b } = hexToRgb(app.accentColor || '#38bdf8');
  const safeName = (app.name || 'Application').replace(/[<>&"]/g, '');
  const firstLetter = safeName.charAt(0).toUpperCase();

  let bodyContent = '';

  if (style === 'static') {
    // Retro CRT TV static noise texture with glowing center emblem (like HBO)
    let staticDots = '';
    const seed = (safeName.length * 41 + seedVariation * 19) % 500;
    for (let i = 0; i < 90; i++) {
      const x = (seed * (i + 1) * 73) % 1920;
      const y = (seed * (i + 1) * 47) % 1080;
      const w = 4 + (i % 6) * 3;
      const h = 2 + (i % 3);
      const alpha = (0.08 + (i % 5) * 0.05).toFixed(2);
      staticDots += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(255,255,255,${alpha})"/>`;
    }

    bodyContent = `
      <defs>
        <radialGradient id="staticHalo" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.22)"/>
          <stop offset="50%" stop-color="rgba(${r},${g},${b},0.12)"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="#121418"/>
      ${staticDots}
      <circle cx="960" cy="450" r="500" fill="url(#staticHalo)"/>
      <g transform="translate(960, 440) scale(1.6)" text-anchor="middle">
        <rect x="-65" y="-55" width="130" height="90" rx="20" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.4)" stroke-width="3" filter="drop-shadow(0 0 25px rgba(255,255,255,0.3))"/>
        <text x="0" y="6" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" letter-spacing="2">
          ${firstLetter}
        </text>
        <text x="0" y="80" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="800" letter-spacing="4">
          ${safeName.toUpperCase()}
        </text>
      </g>
    `;
  } else if (style === 'oled') {
    // Pure pitch black OLED background with minimal glowing brand emblem
    bodyContent = `
      <rect width="1920" height="1080" fill="#000000"/>
      <circle cx="960" cy="450" r="420" fill="radial-gradient(circle, rgba(${r},${g},${b},0.22) 0%, transparent 70%)"/>
      <g transform="translate(960, 440) scale(1.6)" text-anchor="middle">
        <rect x="-60" y="-50" width="120" height="85" rx="22" fill="#05070a" stroke="rgb(${r},${g},${b})" stroke-width="4" filter="drop-shadow(0 0 25px rgba(${r},${g},${b},0.6))"/>
        <text x="0" y="8" fill="rgb(${r},${g},${b})" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900">
          ${firstLetter}
        </text>
        <text x="0" y="80" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="800" letter-spacing="3">
          ${safeName}
        </text>
      </g>
    `;
  } else if (style === 'cinematic') {
    // Volumetric sweeping horizon with starlight
    bodyContent = `
      <defs>
        <radialGradient id="cineHalo" cx="50%" cy="46%" r="55%">
          <stop offset="0%" stop-color="rgba(${r},${g},${b},0.32)"/>
          <stop offset="50%" stop-color="rgba(${r * 0.6},${g * 0.6},${b * 0.8},0.1)"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="#060912"/>
      <circle cx="960" cy="460" r="580" fill="url(#cineHalo)"/>
      <g transform="translate(960, 440) scale(1.6)" text-anchor="middle">
        <circle cx="0" cy="-15" r="54" fill="rgba(${r},${g},${b},0.2)" stroke="rgb(${r},${g},${b})" stroke-width="4" filter="drop-shadow(0 0 25px rgba(${r},${g},${b},0.5))"/>
        <text x="0" y="3" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="900">
          ${firstLetter}
        </text>
        <text x="0" y="85" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="800" letter-spacing="3">
          ${safeName}
        </text>
      </g>
    `;
  } else {
    // Default 'hero': Centered bold title card matching Netflix style
    bodyContent = `
      <defs>
        <radialGradient id="brandHeroBg" cx="50%" cy="46%" r="58%">
          <stop offset="0%" stop-color="#0a1220"/>
          <stop offset="50%" stop-color="#050810"/>
          <stop offset="100%" stop-color="#010204"/>
        </radialGradient>
        <radialGradient id="brandHalo" cx="50%" cy="44%" r="42%">
          <stop offset="0%" stop-color="rgba(${r},${g},${b},0.32)"/>
          <stop offset="60%" stop-color="rgba(${r},${g},${b},0.07)"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#brandHeroBg)"/>
      <circle cx="960" cy="450" r="520" fill="url(#brandHalo)"/>
      <g transform="translate(960, 430) scale(1.6)" text-anchor="middle">
        <rect x="-65" y="-55" width="130" height="90" rx="24" fill="#080c14" stroke="rgb(${r},${g},${b})" stroke-width="4.5" filter="drop-shadow(0 0 28px rgba(${r},${g},${b},0.55))"/>
        <polygon points="-12,-16 18,0 -12,16" fill="rgb(${r},${g},${b})"/>
        <text x="0" y="82" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="900" letter-spacing="3">
          ${safeName}
        </text>
        <text x="0" y="108" fill="rgba(255,255,255,0.45)" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="5">
          ${(app.category || 'MEDIA').toUpperCase()}
        </text>
      </g>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    ${bodyContent}
    <!-- Top & bottom cinema letterbox gradients -->
    <rect width="1920" height="260" fill="linear-gradient(to bottom, rgba(2,3,6,0.85), transparent)"/>
    <rect y="780" width="1920" height="300" fill="linear-gradient(to top, rgba(2,3,6,0.92), transparent)"/>
  </svg>`;

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  generatedBackdropCache[cacheKey] = dataUri;
  return dataUri;
}

/**
 * Resolves the backdrop URL for an app.
 * Priority:
 * 1. User imported/custom backdrop for this app id (from settings.appBackdrops)
 * 2. Predefined app.backdropUrl
 * 3. Procedurally generated title card for the app
 */
export function getAppBackdrop(
  app: AppItem,
  customBackdrops?: Record<string, string>
): string {
  if (!app) return '';

  // 1. User custom/imported backdrop
  if (customBackdrops && customBackdrops[app.id]) {
    return customBackdrops[app.id];
  }

  // 2. Predefined backdropUrl on the item
  if (app.backdropUrl && app.backdropUrl.trim().length > 0) {
    return app.backdropUrl;
  }

  // 7. Auto-generate crisp SVG brand hero title card
  return generateProceduralBackdrop(app, 'hero');
}
