# Command System

## Visão Geral

O editor utiliza o padrão Command para todas as ações de edição, permitindo undo/redo confiável e rastreamento de histórico.

## Tipos de Comando

| Tipo | Descrição |
|------|-----------|
| `REMOVE_WORD` | Marca uma palavra como removida na transcrição |
| `REMOVE_SEGMENT` | Marca todas as palavras de um segmento como removidas |
| `RESTORE_WORD` | Restaura uma palavra removida |
| `APPLY_PRESET` | Aplica um preset de edição ao projeto |
| `UPDATE_CAPTIONS` | Atualiza o caption track inteiro |
| `UPDATE_CAPTION_STYLE` | Altera estilo visual das legendas |
| `REBUILD_TIMELINE` | Reconstrói a semantic timeline |

## Interface do Comando

```typescript
interface Command {
  id: string;
  type: CommandType;
  label: string;        // Descrição legível para UI
  timestamp: number;
  execute: (project: VideoProject) => VideoProject;
  undo: (project: VideoProject) => VideoProject;
}
```

## Undo/Redo

- **Undo stack**: comandos executados (mais recente no topo)
- **Redo stack**: comandos desfeitos
- Novo comando limpa o redo stack
- Limite configurável (`maxSize`, default: 100)

### Atalhos

- `⌘Z` — Undo
- `⌘⇧Z` — Redo

## Fluxo

```
Ação do usuário
  → Factory cria Command
    → store.executeCommand(cmd)
      → cmd.execute(project) → novo projeto
      → pushCommand(history, cmd)
      → markDirty() → autosave debounce
```

## Arquivos

- `src/apps/desktop/core/command-system.ts` — Commands e history
- `src/apps/desktop/store/project-store.ts` — Integração com Zustand
- `src/apps/desktop/hooks/useKeyboardShortcuts.ts` — Atalhos
- `src/apps/desktop/components/UndoRedoIndicator.tsx` — Feedback visual

## Testes

`src/test/command-system.test.ts`
