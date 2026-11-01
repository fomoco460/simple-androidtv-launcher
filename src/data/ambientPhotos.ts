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
export const SPACE_PHOTOS: AmbientPhoto[] = [
  { id: 'space-earthset-orion', name: 'Earthset from Orion', src: '/wallpapers/space/earthset-orion.jpg', tone: 'dark', set: 'space' },
  { id: 'space-crescent-earth', name: 'Crescent Earth', src: '/wallpapers/space/crescent-earth.jpg', tone: 'dark', set: 'space' },
  { id: 'space-artemis-earthrise', name: 'Artemis Era Earthrise', src: '/wallpapers/space/artemis-earthrise.jpg', tone: 'dark', set: 'space' },
  { id: 'space-goodnight-moon', name: 'Goodnight Moon', src: '/wallpapers/space/goodnight-moon.jpg', tone: 'dark', set: 'space' },
  { id: 'space-aurora-indian-ocean', name: 'Aurora over the Indian Ocean', src: '/wallpapers/space/aurora-indian-ocean.jpg', tone: 'dark', set: 'space' },
  { id: 'space-aurora-earthglow', name: 'Aurora and Earthglow', src: '/wallpapers/space/aurora-earthglow.jpg', tone: 'dark', set: 'space' },
  { id: 'space-aurora-australis', name: 'Aurora Australis', src: '/wallpapers/space/aurora-australis.jpg', tone: 'dark', set: 'space' },
  { id: 'space-blue-marble', name: 'Blue Marble', src: '/wallpapers/space/blue-marble.jpg', tone: 'dark', set: 'space' },
  { id: 'space-black-marble', name: 'Earth at Night', src: '/wallpapers/space/black-marble.jpg', tone: 'dark', set: 'space' },
  { id: 'space-saturn-backlit', name: 'Saturn, Backlit', src: '/wallpapers/space/saturn-backlit.jpg', tone: 'dark', set: 'space' },
  { id: 'space-cosmic-cliffs', name: 'Cosmic Cliffs', src: '/wallpapers/space/cosmic-cliffs.jpg', tone: 'dark', set: 'space' },
  { id: 'space-pillars-of-creation', name: 'Pillars of Creation', src: '/wallpapers/space/pillars-of-creation.jpg', tone: 'dark', set: 'space' },
];

export const CLEANFRAME_PHOTOS: AmbientPhoto[] = CLEAN_FRAME_WALLPAPERS.map((w) => ({
  id: w.id,
  name: w.name,
  src: w.src,
  tone: w.tone,
  set: 'cleanframe' as const,
}));

export const AMBIENT_PHOTOS: AmbientPhoto[] = [...CLEANFRAME_PHOTOS, ...SPACE_PHOTOS];
