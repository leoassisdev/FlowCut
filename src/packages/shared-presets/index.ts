/**
 * @package shared-presets
 * Built-in StylePresets for FlowCut.
 * These are domain-level editing presets — NOT visual themes.
 * They configure how the auto-cut engine processes a video.
 */

import type { StylePreset } from '../shared-types';

export const PRESET_PODCAST: StylePreset = {
  id: 'preset-podcast',
  name: 'Podcast Clean',
  description: 'Remove filler words and long silences. Optimized for talking-head podcast recordings.',
  category: 'podcast',
  config: {
    removeFiller: true,
    removeSilence: true,
    silenceThresholdMs: 800,
    maxPauseDurationMs: 300,
    autoZoom: false,
    captionStyle: 'minimal',
    targetPlatform: 'youtube',
  },
};

export const PRESET_YOUTUBE: StylePreset = {
  id: 'preset-youtube',
  name: 'YouTube Engaging',
  description: 'Aggressive cuts, zoom on emphasis, designed for high-retention YouTube content.',
  category: 'youtube',
  config: {
    removeFiller: true,
    removeSilence: true,
    silenceThresholdMs: 400,
    maxPauseDurationMs: 150,
    autoZoom: true,
    captionStyle: 'bold-highlight',
    targetPlatform: 'youtube',
  },
};

export const PRESET_SHORT: StylePreset = {
  id: 'preset-short',
  name: 'Short / Reels',
  description: 'Vertical reframe, karaoke captions, fast pace for TikTok / Reels / Shorts.',
  category: 'short',
  config: {
    removeFiller: true,
    removeSilence: true,
    silenceThresholdMs: 300,
    maxPauseDurationMs: 100,
    autoZoom: true,
    captionStyle: 'karaoke',
    targetPlatform: 'short',
  },
};

export const PRESET_PRESENTATION: StylePreset = {
  id: 'preset-presentation',
  name: 'Presentation Polish',
  description: 'Light cleanup preserving natural pauses. Ideal for lectures, talks and webinars.',
  category: 'presentation',
  config: {
    removeFiller: true,
    removeSilence: false,
    silenceThresholdMs: 1500,
    maxPauseDurationMs: 800,
    autoZoom: false,
    captionStyle: 'subtitle',
    targetPlatform: 'youtube',
  },
};

export const ALL_PRESETS: StylePreset[] = [
  PRESET_PODCAST,
  PRESET_YOUTUBE,
  PRESET_SHORT,
  PRESET_PRESENTATION,
];
