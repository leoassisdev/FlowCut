import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Film, CheckCircle, AlertCircle, Loader2, FolderOpen } from 'lucide-react';
import { useProjectStore } from '@/apps/desktop/store/project-store';
import { exportVideo, pickExportPath } from '@/apps/desktop/services/tauri-bridge';
import type { TimelineCutInput } from '@/apps/desktop/services/tauri-bridge';

// ─── Perfis de Export ─────────────────────────────────────────────────────────

const EXPORT_PROFILES = [
  { id: 'youtube-1080p', label: 'YouTube 1080p',   format: 'mp4', suffix: '_1080p',   quality: 'high'   as const, desc: '1920×1080 · H.264 · Alta qualidade' },
  { id: 'reels-9-16',   label: 'Reels / TikTok',  format: 'mp4', suffix: '_reels',    quality: 'high'   as const, desc: '1080×1920 · H.264 · Vertical' },
  { id: 'medium',       label: 'Web / Preview',    format: 'mp4', suffix: '_web',      quality: 'medium' as const, desc: '1280×720 · H.264 · Tamanho reduzido' },
  { id: 'ultra',        label: 'Master / Ultra',   format: 'mp4', suffix: '_ultra',    quality: 'ultra'  as const, desc: '1920×1080 · H.264 · Máxima qualidade' },
];

type ExportStatus = 'idle' | 'picking' | 'exporting' | 'done' | 'error';

export default function ExportPage() {
  const navigate = useNavigate();
  const { project } = useProjectStore();
  const [selectedProfile, setSelectedProfile] = useState(0);
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportedSize, setExportedSize] = useState<number | null>(null);
  const [exportedDuration, setExportedDuration] = useState<number | null>(null);

  const profile = EXPORT_PROFILES[selectedProfile];

  const handleExport = async () => {
    if (!project?.sourceVideo || !project.semanticTimeline) {
      setErrorMsg('Projeto sem vídeo ou timeline. Importe um vídeo primeiro.');
      setStatus('error');
      return;
    }

    // Pega só os cortes do tipo 'keep'
    const keepCuts = project.semanticTimeline.cuts.filter((c) => c.type === 'keep');
    if (keepCuts.length === 0) {
      setErrorMsg('Nenhum segmento para exportar. Rebuild a timeline primeiro.');
      setStatus('error');
      return;
    }

    setStatus('picking');
    setErrorMsg(null);

    // Sugere nome do arquivo baseado no projeto
    const suggestedName = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}${profile.suffix}.mp4`;

    // Abre save dialog nativo
    const savePath = await pickExportPath(suggestedName);
    if (!savePath) {
      setStatus('idle');
      return; // usuário cancelou
    }

    setStatus('exporting');

    // Monta os cortes para o Rust
    const cuts: TimelineCutInput[] = keepCuts.map((cut) => ({
      start_ms: cut.startMs,
      end_ms: cut.endMs,
    }));

    const result = await exportVideo({
      source_video_path: project.sourceVideo.filePath,
      cuts,
      output_path: savePath,
      width: project.sourceVideo.width,
      height: project.sourceVideo.height,
      fps: project.sourceVideo.fps,
      quality: profile.quality,
    });

    if (!result) {
      setErrorMsg('Export falhou. Verifique o terminal para detalhes.');
      setStatus('error');
      return;
    }

    setOutputPath(result.output_path);
    setExportedSize(result.size_bytes);
    setExportedDuration(result.duration_ms);
    setStatus('done');
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0e0e0f] p-8 font-mono">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center text-[#444] hover:text-[#888] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[14px] uppercase tracking-widest text-[#666]">Export</h1>
        </div>

        {/* Projeto */}
        {project ? (
          <div className="bg-[#0c0c0e] border border-[#1a1a20] rounded p-4 flex items-center gap-3">
            <Film className="w-4 h-4 text-[#4f6ef7] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[#aaa] truncate">{project.name}</p>
              <p className="text-[11px] text-[#333] mt-0.5">
                {project.sourceVideo?.fileName} ·{' '}
                {project.sourceVideo?.width}×{project.sourceVideo?.height} ·{' '}
                {project.sourceVideo ? formatDuration(project.sourceVideo.durationMs) : '--'}
              </p>
            </div>
            <span className="text-[9px] px-2 py-1 bg-[#111116] border border-[#1a1a20] text-[#444] rounded tracking-wider">
              {project.state}
            </span>
          </div>
        ) : (
          <div className="bg-[#0c0c0e] border border-[#1a1a20] rounded p-4">
            <p className="text-[12px] text-[#444]">Nenhum projeto carregado.</p>
          </div>
        )}

        {/* Timeline summary */}
        {project?.semanticTimeline && (
          <div className="bg-[#0c0c0e] border border-[#1a1a20] rounded p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-[#333] mb-2">Timeline</p>
            <div className="flex gap-6">
              <div>
                <p className="text-[11px] text-[#555]">Segmentos mantidos</p>
                <p className="text-[18px] text-[#aaa] font-bold">
                  {project.semanticTimeline.cuts.filter(c => c.type === 'keep').length}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#555]">Duração final</p>
                <p className="text-[18px] text-[#aaa] font-bold">
                  {formatDuration(project.semanticTimeline.totalDurationMs)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#555]">Removido</p>
                <p className="text-[18px] text-[#4faa6f] font-bold">
                  {Math.round((1 - project.semanticTimeline.totalDurationMs / (project.semanticTimeline.originalDurationMs || 1)) * 100)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Perfis */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-[#333]">Export Profile</p>
          <div className="grid grid-cols-2 gap-2">
            {EXPORT_PROFILES.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfile(idx)}
                className={`text-left p-3 rounded border transition-all ${
                  idx === selectedProfile
                    ? 'border-[#4f6ef7]/50 bg-[#4f6ef7]/5 text-[#aaa]'
                    : 'border-[#1a1a20] bg-[#0c0c0e] text-[#555] hover:border-[#2a2a35] hover:text-[#888]'
                }`}
              >
                <p className="text-[12px] font-medium">{p.label}</p>
                <p className="text-[10px] mt-0.5 opacity-60">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {status === 'error' && errorMsg && (
          <div className="flex items-start gap-2 bg-[#1a0e0e] border border-[#3a1a1a] rounded p-3">
            <AlertCircle className="w-3.5 h-3.5 text-[#cc4444] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#cc4444] leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Done */}
        {status === 'done' && outputPath && (
          <div className="bg-[#0e1a0e] border border-[#1a3a1a] rounded p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#4faa6f]" />
              <p className="text-[12px] text-[#4faa6f] font-medium">Export concluído</p>
            </div>
            <p className="text-[11px] text-[#444] break-all">{outputPath}</p>
            <div className="flex gap-4 mt-2">
              {exportedSize && (
                <p className="text-[10px] text-[#333]">
                  Tamanho: <span className="text-[#555]">{formatSize(exportedSize)}</span>
                </p>
              )}
              {exportedDuration && (
                <p className="text-[10px] text-[#333]">
                  Duração: <span className="text-[#555]">{formatDuration(exportedDuration)}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => { setStatus('idle'); setOutputPath(null); }}
              className="mt-2 text-[10px] text-[#4f6ef7] hover:underline"
            >
              Exportar novamente
            </button>
          </div>
        )}

        {/* Export button */}
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={status === 'exporting' || status === 'picking' || !project}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4f6ef7] hover:bg-[#6b86f8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] tracking-wider uppercase rounded transition-all"
          >
            {status === 'exporting' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : status === 'picking' ? (
              <FolderOpen className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {status === 'exporting' ? 'Exporting...'
              : status === 'picking' ? 'Choose location...'
              : 'Export Video'}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-[#1e1e28] text-[#555] hover:text-[#888] hover:border-[#2a2a35] text-[12px] tracking-wider uppercase rounded transition-all"
          >
            Back
          </button>
        </div>

      </div>
    </div>
  );
}
