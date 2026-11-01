import { CLEAN_FRAME_WALLPAPERS } from './cleanFrameWallpapers';

export interface AmbientPhoto {
  /** Same id as the matching wallpaper preset (cf-... or space-...). */
  id: string;
  name: string;
  src: string;
  thumb: string;
  tone: 'light' | 'dark';
  set: 'cleanframe' | 'space';
}

/**
 * NASA imagery. NASA content is generally not subject to copyright in the United States;
 * credit lines are in public/wallpapers/space/CREDITS.txt.
 */
export const SPACE_PHOTOS: AmbientPhoto[] = [
  { id: 'space-earthset-orion', name: 'Earthset from Orion', src: '/wallpapers/space/earthset-orion.jpg', thumb: '/wallpapers/space/earthset-orion-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-crescent-earth', name: 'Crescent Earth', src: '/wallpapers/space/crescent-earth.jpg', thumb: '/wallpapers/space/crescent-earth-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-artemis-earthrise', name: 'Artemis Era Earthrise', src: '/wallpapers/space/artemis-earthrise.jpg', thumb: '/wallpapers/space/artemis-earthrise-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-goodnight-moon', name: 'Goodnight Moon', src: '/wallpapers/space/goodnight-moon.jpg', thumb: '/wallpapers/space/goodnight-moon-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-aurora-indian-ocean', name: 'Aurora over the Indian Ocean', src: '/wallpapers/space/aurora-indian-ocean.jpg', thumb: '/wallpapers/space/aurora-indian-ocean-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-aurora-earthglow', name: 'Aurora and Earthglow', src: '/wallpapers/space/aurora-earthglow.jpg', thumb: '/wallpapers/space/aurora-earthglow-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-aurora-australis', name: 'Aurora Australis', src: '/wallpapers/space/aurora-australis.jpg', thumb: '/wallpapers/space/aurora-australis-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-blue-marble', name: 'Blue Marble', src: '/wallpapers/space/blue-marble.jpg', thumb: '/wallpapers/space/blue-marble-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-black-marble', name: 'Earth at Night', src: '/wallpapers/space/black-marble.jpg', thumb: '/wallpapers/space/black-marble-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-saturn-backlit', name: 'Saturn, Backlit', src: '/wallpapers/space/saturn-backlit.jpg', thumb: '/wallpapers/space/saturn-backlit-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-cosmic-cliffs', name: 'Cosmic Cliffs', src: '/wallpapers/space/cosmic-cliffs.jpg', thumb: '/wallpapers/space/cosmic-cliffs-thumb.jpg', tone: 'dark', set: 'space' },
  { id: 'space-pillars-of-creation', name: 'Pillars of Creation', src: '/wallpapers/space/pillars-of-creation.jpg', thumb: '/wallpapers/space/pillars-of-creation-thumb.jpg', tone: 'dark', set: 'space' },
];

export const CLEANFRAME_PHOTOS: AmbientPhoto[] = CLEAN_FRAME_WALLPAPERS.map((w) => ({
  id: w.presetId,
  name: w.name,
  src: w.src,
  thumb: w.thumb,
  tone: w.tone,
  set: 'cleanframe' as const,
}));

export const AMBIENT_PHOTOS: AmbientPhoto[] = [...CLEANFRAME_PHOTOS, ...SPACE_PHOTOS];

/** Default lists: every photo by day, only the dark ones at night. */
export const ALL_PHOTO_IDS = AMBIENT_PHOTOS.map((p) => p.id);
export const DEFAULT_NIGHT_IDS = AMBIENT_PHOTOS.filter((p) => p.tone === 'dark').map((p) => p.id);
