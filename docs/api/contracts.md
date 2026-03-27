# API Contracts

## Local Engine API

Comunicação via Tauri IPC (invoke). Em desenvolvimento, mockado no frontend.

| Método | Rota | Request DTO | Response DTO |
|--------|------|-------------|--------------|
| POST | /projects | CreateProjectRequest | CreateProjectResponse |
| GET | /projects/:id | - | GetProjectResponse |
| POST | /projects/:id/transcribe | StartTranscriptionRequest | TranscriptionResponse |
| POST | /projects/:id/edit | ApplyEditRequest | ApiResponse |
| POST | /projects/:id/rebuild-timeline | RebuildTimelineRequest | RebuildTimelineResponse |
| POST | /projects/:id/apply-preset | ApplyPresetRequest | ApiResponse |
| POST | /projects/:id/export | StartExportRequest | ExportResponse |
| GET | /projects/:id/jobs | ListJobsRequest | ListJobsResponse |

## Cloud API

Comunicação via HTTPS com autenticação.

| Método | Rota | Request DTO | Response DTO |
|--------|------|-------------|--------------|
| GET | /presets | - | ListPresetsResponse |
| POST | /projects/:id/broll-cues | GenerateBrollCuesRequest | BrollCuesResponse |
| POST | /projects/:id/captions | GenerateCaptionsRequest | CaptionsResponse |

Todos os DTOs definidos em `packages/shared-contracts/index.ts`.
