# FlowCut

> Edição semântica de vídeos falados para macOS.

## Status: 🏗️ Fundação Arquitetural + Editor Core

Estrutura profissional com contratos, tipos, mocks e placeholders. **Nenhuma funcionalidade de mídia real implementada.**

| Status | Significado |
|--------|-------------|
| ✅ Implementado | Tipos, contratos, presets, telas, store, pipeline states |
| ✅ Implementado | State machine do editor, command system com undo/redo |
| ✅ Implementado | Autosave com snapshots, job queue com cancel/retry |
| ✅ Implementado | Painel de legendas, diagnostics/logging, keyboard shortcuts |
| ✅ Implementado | Testes para state machine, commands, undo/redo, autosave, logger |
| 🔶 Mock | Transcrição, remoção de palavras, timeline, exportação simulada |
| ⬜ Scaffold | local-engine, cloud-api (API/Services/Domain/Factory/Repo/Mapper/Schemas/Integrations/Core) |
| 🚫 Não implementado | FFmpeg, whisper.cpp, WhisperX, MediaPipe, export real |

## Como rodar

```bash
npm install && npm run dev
```

## Testes

```bash
npm test
```

## Arquitetura Core

### State Machine do Editor

Estados: `IDLE → LOADING → READY → EDITING → PREVIEWING → EXPORTING → ERROR`

Transições tipadas com guards. Separado do estado do pipeline do projeto.

Ver `src/apps/desktop/core/editor-state-machine.ts` e `docs/architecture/state-machine.md`.

### Command System (Undo/Redo)

Todas as ações de edição passam por comandos com `execute()` e `undo()`:
- `REMOVE_WORD` / `REMOVE_SEGMENT`
- `APPLY_PRESET`
- `UPDATE_CAPTIONS` / `UPDATE_CAPTION_STYLE`

Stack de undo/redo com limite configurável. Atalhos: `⌘Z` / `⌘⇧Z`.

Ver `src/apps/desktop/core/command-system.ts` e `docs/architecture/command-system.md`.

### Autosave

- Dirty state tracking com debounce de 3s
- Snapshots em memória (MOCK — sem persistência real)
- Restore de snapshot com reset do command history
- Indicador visual no toolbar

### Job Queue

- Fila mockada com processamento sequencial
- Progresso simulado, cancelamento e retry
- Logs por job expansíveis
- Subscriber pattern para UI reativa

### Keyboard Shortcuts

| Atalho | Ação |
|--------|------|
| `⌘Z` | Desfazer |
| `⌘⇧Z` | Refazer |
| `⌘S` | Salvar snapshot |
| `⌘⇧R` | Reconstruir timeline |
| `Space` | Play/Pause (mock) |

## Docs

Ver `docs/architecture/`, `docs/domain/`, `docs/api/`, `docs/flows/`, `docs/decisions/`, `docs/errors-and-hallucinations.md`
