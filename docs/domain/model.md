# Modelo de Domínio FlowCut

## Entidades Principais

### VideoProject
Raiz agregada. Contém referência a todas as outras entidades.
- Estado gerenciado por PipelineState (23 estados)
- Imutável externamente — todas as mutações via Service

### SourceVideo
Metadados do vídeo original importado. Imutável após importação.

### Transcript → TranscriptSegment → WordToken
Hierarquia de transcrição. Cada word tem timecodes e pode ser marcado como removido.

### EditDecision
Registro imutável de cada ação de edição (event sourcing-ready).

### SemanticTimeline → TimelineCut
Timeline reconstruída a partir das edit decisions. Cada cut é keep, remove, broll ou pause.

### StylePreset
Preset de edição (NÃO é tema visual). Configura comportamento do auto-cut engine.

### BrollCue
Sugestão de b-roll gerada por IA, vinculada a um corte na timeline.

### CaptionTrack
Legendas geradas com estilo e animação configuráveis.

### ReframePlan → ReframeKeyframe
Plano de reframe para diferentes aspect ratios (face-tracking, speaker-tracking).

### AudioPostPlan
Configuração de pós-produção de áudio (normalização, denoise, compressor).

### ExportProfile
Perfil de exportação (formato, resolução, codec, bitrate).

### ProcessingJob
Representa um job assíncrono no pipeline (transcode, transcribe, export, etc).

### ProjectSnapshot
Snapshot do projeto para undo/redo e versionamento.

## Pipeline States

```
DRAFT → IMPORTED → PROXY_GENERATED → AUDIO_EXTRACTED → TRANSCRIBING → TRANSCRIBED
→ ALIGNING_WORDS → ALIGNED → AUTO_CUT_ANALYZING → AUTO_CUT_READY → EDITING
→ PRESET_APPLIED → BROLL_PLANNING → BROLL_READY → CAPTIONS_GENERATING → CAPTIONS_READY
→ REFRAMING → REFRAMED → POST_PRODUCTION_READY → EXPORTING → EXPORTED
```

Qualquer estado pode transicionar para `FAILED` ou `CANCELLED`.
