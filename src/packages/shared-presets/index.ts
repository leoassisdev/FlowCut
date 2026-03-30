/**
 * @package shared-presets
 * Built-in StylePresets for FlowCut.
 * These are domain-level editing presets — NOT visual themes.
 * They configure how the auto-cut engine processes a video.
 */

import type { StylePreset } from '../shared-types';

export const PRESET_PODCAST: StylePreset = {
  id: 'preset-podcast',
  name: 'Podcast Limpo',
  description: 'Remove palavras de preenchimento e silêncios longos. Otimizado para gravações de podcast.',
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
  name: 'YouTube Dinâmico',
  description: 'Cortes agressivos, zoom em ênfases. Projetado para alta retenção no YouTube.',
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
  name: 'Reels / TikTok',
  description: 'Reenquadramento vertical, legendas karaokê, ritmo rápido para TikTok e Reels.',
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
  name: 'Apresentação Polida',
  description: 'Limpeza leve preservando pausas naturais. Ideal para aulas, palestras e webinars.',
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
