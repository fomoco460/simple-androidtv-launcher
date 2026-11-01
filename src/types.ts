import type { SoundTheme, SoundVolume } from './services/sound';
export type CleanFramePresetId =
  | 'cf-misty'
  | 'cf-cove'
  | 'cf-forest'
  | 'cf-valley'
  | 'cf-night'
  | 'cf-peaks'
  | 'cf-bridge'
  | 'cf-ridge'
  | 'cf-golden'
  | 'cf-summit'
  | 'cf-goldcoast'
  | 'cf-sydney'
  | 'cf-amber'
  | 'cf-mint'
  | 'cf-alpine';

export type BackgroundPreset = 
  | 'desert-stars'
  | 'nordic-aurora'
  | 'misty-pines'
  | 'cyber-dusk'
  | 'deep-space'
  | 'sunset-dunes'
  | CleanFramePresetId
  | 'custom';


export type AppsDisplayPreset = 'icons-and-text' | 'icons-only' | 'text-only';

export type IconStylePreset = 'stock' | 'minimal';

export type FontPreset = 'Manrope' | 'Outfit' | 'Plus Jakarta Sans' | 'Robotech GP' | 'System';



export type HomeControlsPreset = 'text' | 'icons' | 'both';

export type UiScalePreset =
  | 'auto'
  | '75'
  | '80'
  | '85'
  | '90'
  | '100'
  | '110'
  | '120'
  | '135'
  | '150'
  | '175';

export interface LauncherSettings {
  background: BackgroundPreset;
  customBgUrl: string;
  iconStyle?: IconStylePreset; // 'stock' by default
  apps: AppsDisplayPreset;
  font: FontPreset;
  homeControls: HomeControlsPreset;
  uiScale?: UiScalePreset; // TV 10-foot scale for 4K TV / living room viewing distance
  soundTheme: SoundTheme;
  soundVolume: SoundVolume;
  clockFormat?: 'auto' | '12h' | '24h';
  showDate: boolean;
  showWeather?: boolean;
  tempUnit?: 'F' | 'C';
  weatherCity?: string;
  weatherLat?: number;
  weatherLon?: number;
  activeView: 'home' | 'appearance' | 'all-apps' | 'install-apk';
  dynamicAppBackgrounds?: boolean; // Changes background to app's backdrop when highlighted
  appBackdrops?: Record<string, string>; // Custom user-imported or auto-generated backdrops per app id
}

export interface AppItem {
  id: string;
  name: string;
  iconType: string;
  iconUrl?: string; // Real Android native icon data URI or official stock image URL
  accentColor: string;
  url: string;
  intentUrl?: string;
  inDock: boolean;
  category: 'streaming' | 'music' | 'media' | 'utility';
  description?: string;
  backdropUrl?: string; // Predefined or custom backdrop image/canvas data URI
}
