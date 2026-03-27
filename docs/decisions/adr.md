# Decisões Arquiteturais

## ADR-001: Separação Desktop / Local Engine / Cloud API

**Decisão**: Manter 3 apps separados mesmo que rodem no mesmo dispositivo.

**Razão**: O local-engine pode ser reimplementado em Rust (Tauri sidecar) sem impactar a UI. O cloud-api pode escalar independentemente.

## ADR-002: Factory como única porta de criação

**Decisão**: Nenhum módulo cria entidades diretamente — sempre via Factory.

**Razão**: Garante invariantes na criação. Facilita testes e auditoria.

## ADR-003: Domain sem dependência de framework

**Decisão**: Entidades de domínio são TypeScript puro.

**Razão**: Permite reusar domain em qualquer contexto (React, Tauri, Node, Deno).

## ADR-004: Presets como configuração de engine, não tema visual

**Decisão**: StylePreset configura comportamento do auto-cut (removeFiller, silenceThreshold, etc), não aparência.

**Razão**: A edição semântica é sobre manipulação de conteúdo, não estilo visual. Estilo visual fica em CaptionStyle, ExportProfile, etc.

## ADR-005: Mocks explícitos

**Decisão**: Todo mock é marcado com `MOCK` ou `PLACEHOLDER` no código.

**Razão**: Transparência total sobre o que funciona e o que não funciona.
