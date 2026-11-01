import { CLEAN_FRAME_WALLPAPERS } from './cleanFrameWallpapers';

export interface AmbientPhoto {
  id: string;
  name: string;
  src: string;
  tone: 'light' | 'dark';
  set: 'cleanframe' | 'space';
}

/**
 * NASA imagery. NASA content is generally not subject to copyright in the United States;
 * credit lines are in public/wallpapers/space/CREDITS.txt.
 */
export const SPACE_PHOTOS: AmbientPhoto[] = [];

export const CLEANFRAME_PHOTOS: AmbientPhoto[] = CLEAN_FRAME_WALLPAPERS.map((w) => ({
  id: w.id,
  name: w.name,
  src: w.src,
  tone: w.tone,
  set: 'cleanframe' as const,
}));

export const AMBIENT_PHOTOS: AmbientPhoto[] = [...CLEANFRAME_PHOTOS, ...SPACE_PHOTOS];
