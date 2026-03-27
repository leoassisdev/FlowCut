# Arquitetura FlowCut

## Visão Geral

FlowCut segue uma arquitetura de 3 camadas:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Desktop    │ ←→  │ Local Engine  │ ←→  │  Cloud API   │
│   (React)    │     │ (Tauri/Rust)  │     │  (HTTP)      │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Desktop (apps/desktop)
- UI em React + Tailwind
- State management com Zustand
- Comunicação com local-engine via Tauri IPC
- Comunicação com cloud-api via HTTP

### Local Engine (apps/local-engine)
- Roda localmente como sidecar do Tauri
- Gerencia FFmpeg, whisper.cpp, WhisperX
- Persistência local (SQLite)
- Pipeline de processamento de mídia

### Cloud API (apps/cloud-api)
- Serviços que requerem GPU/cloud
- Sugestões de B-Roll via IA
- Transcrição cloud (alternativa ao local)
- Auth e billing

## Padrões obrigatórios

### Camada de API
- Recebe Request DTO, valida com Zod, delega para Service
- NUNCA contém regra de negócio

### Camada de Service
- Orquestra use cases
- Chama Domain, Factory, Repository, Integrations

### Domain
- Entidades puras TypeScript
- Contém regras de negócio e invariantes
- NÃO depende de framework

### Factory
- ÚNICA porta de criação de entidades
- Garante que entidades nascem válidas

### Repository
- Apenas persistência (CRUD)
- Interface → implementação (inversão de dependência)

### Mapper
- Converte Entity → Response DTO
- Garante que estrutura interna não vaza

### Integrations
- Isola providers externos (FFmpeg, Whisper, APIs)
- Cada integration wraps uma dependência específica
