# Fluxos Principais

## 1. Importar e Transcrever

```
Usuário seleciona arquivo → Desktop chama local-engine/import
→ Engine gera proxy → Engine extrai áudio → Engine inicia whisper.cpp
→ Transcrição retornada → WhisperX alinha palavras → Desktop exibe transcript
```

## 2. Editar por Texto

```
Usuário clica em palavra → Desktop marca word como isRemoved
→ Usuário clica "Reconstruir" → Desktop envia edit decisions para Engine
→ Engine recalcula SemanticTimeline → Desktop renderiza nova timeline
```

## 3. Aplicar Preset

```
Usuário seleciona preset → Desktop envia preset para Engine
→ Engine analisa transcript com regras do preset (filler, silence, etc)
→ Engine gera EditDecisions automáticas → Reconstrói timeline → Retorna
```

## 4. Exportar

```
Usuário seleciona perfil de exportação → Desktop envia para Engine
→ Engine monta comando FFmpeg a partir da SemanticTimeline
→ FFmpeg renderiza → Job com progresso → Arquivo final
```

## 5. B-Roll (Cloud)

```
Desktop envia transcript para Cloud API → IA analisa e sugere keywords
→ Cloud retorna BrollCues → Desktop exibe sugestões na timeline
→ Usuário aprova/rejeita → Cues aprovados viram cortes do tipo 'broll'
```
