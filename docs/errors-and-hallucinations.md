# Erros e Alucinações — Registro

Este documento registra padrões de erro a serem evitados durante o desenvolvimento do FlowCut.

## Regras

1. **Nunca vender mock como real** — Todo dado fictício deve ser explicitamente marcado. Nunca afirmar que "o whisper está funcionando" quando o dado é mock.

2. **Nunca implementar FFmpeg/Whisper no frontend** — Processamento de mídia acontece no local-engine (Tauri sidecar) ou cloud-api. O frontend só exibe resultados.

3. **Nunca misturar regra de negócio na API** — A camada de API valida input e delega. Regras ficam em Service/Domain.

4. **Nunca criar entidades fora da Factory** — Mesmo em testes, usar Factory para garantir invariantes.

5. **Nunca simplificar FlowCut para dashboard SaaS** — FlowCut é uma ferramenta de edição de vídeo. Cada tela deve refletir o workflow de edição.

6. **Nunca transformar presets em temas visuais** — Presets configuram o engine de corte (removeFiller, silenceThreshold). Temas visuais são outra coisa.

7. **Nunca empurrar estado para localStorage** — State management via Zustand. Persistência via Repository (futuro SQLite).

8. **Nunca acoplar Desktop ao Engine** — Comunicação sempre via contratos (DTOs). Desktop não importa nada do local-engine diretamente.

## Checklist de PR

- [ ] Nenhum mock vendido como real?
- [ ] Nenhuma regra de negócio na API?
- [ ] Entidades criadas via Factory?
- [ ] Imports respeitam a separação de camadas?
- [ ] Placeholders marcados com ⚠?
