# State Machine do Editor

## Visão Geral

O editor usa uma state machine explícita e tipada para gerenciar estados da UI, separada do estado do pipeline do projeto (`PipelineState`).

## Estados

| Estado | Descrição |
|--------|-----------|
| `IDLE` | Nenhum projeto carregado |
| `LOADING` | Carregando projeto |
| `READY` | Projeto carregado, pronto para edição |
| `EDITING` | Editando ativamente (transcript, presets, etc.) |
| `PREVIEWING` | Reproduzindo preview |
| `EXPORTING` | Export em andamento |
| `ERROR` | Erro recuperável |

## Transições

```
IDLE → LOADING (LOAD_PROJECT)
LOADING → READY (PROJECT_LOADED)
LOADING → ERROR (LOAD_FAILED)
READY → EDITING (START_EDITING)
READY → PREVIEWING (START_PREVIEW)
READY → EXPORTING (START_EXPORT) [guard: hasProject]
EDITING → PREVIEWING (START_PREVIEW)
EDITING → EXPORTING (START_EXPORT) [guard: hasProject]
EDITING → READY (RESET)
PREVIEWING → EDITING (STOP_PREVIEW | START_EDITING)
EXPORTING → READY (EXPORT_COMPLETE)
EXPORTING → ERROR (EXPORT_FAILED)
ERROR → READY (RECOVER)
ERROR → IDLE (RESET)
```

## Guards

- `START_EXPORT` requer `context.hasProject === true`

## Contexto

```typescript
interface EditorContext {
  hasProject: boolean;
  error: string | null;
  projectId: string | null;
}
```

## Separação de Responsabilidades

- **EditorState**: estado da UI do editor (IDLE, EDITING, etc.)
- **PipelineState**: estado do processamento do projeto (DRAFT, TRANSCRIBED, etc.)
- **CommandHistory**: histórico de ações para undo/redo
- **AutosaveState**: dirty flag, snapshots
- **JobQueue**: fila de processamento com status individual

## Arquivo

`src/apps/desktop/core/editor-state-machine.ts`

## Testes

`src/test/editor-state-machine.test.ts`
