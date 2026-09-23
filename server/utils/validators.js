import { z } from 'zod';

export const ttsSchema = z.object({
  text: z.string().min(1).max(5000),
  language: z.string().default('en'),
  voice: z.string().default('en_US-lessac-medium'),
  speed: z.coerce.number().min(0.5).max(2).default(1)
});

export const videoSchema = z.object({
  script: z.string().min(1).max(5000),
  language: z.string().default('en'),
  voice: z.string().default('en_US-lessac-medium'),
  platform: z.enum(['youtube','youtube_shorts','instagram_reels','instagram_square','tiktok']).default('youtube'),
  template: z.string().default('minimal'),
  music: z.string().optional(),
  musicVolume: z.coerce.number().min(0).max(1).default(0.3),
  sfx: z.array(z.object({ id: z.string(), at: z.number() })).default([]),
  subtitles: z.boolean().default(true),
  subtitleStyle: z.object({
    fontSize: z.number().optional(),
    color: z.string().optional(),
    background: z.string().optional(),
    position: z.string().optional()
  }).optional()
});

export const thumbnailSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(100).optional(),
  template: z.string().default('youtube'),
  background: z.string().optional(),
  textColor: z.string().optional()
});

export const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: z.string().min(2).max(10),
  sourceLang: z.string().default('en')
});

export const projectSchema = z.object({
  title: z.string().min(1).max(120),
  script: z.string().max(10000).optional(),
  language: z.string().optional(),
  voice: z.string().optional(),
  platform: z.string().optional(),
  aspectRatio: z.string().optional(),
  template: z.string().optional(),
  music: z.string().optional(),
  soundEffects: z.array(z.any()).optional(),
  subtitles: z.any().optional(),
  thumbnail: z.any().optional(),
  status: z.string().optional()
});
