import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Film, Loader2, AlertCircle } from 'lucide-react';
import flowcutIcon from '@/assets/flowcut-icon.png';
import { pickVideoFile, checkFfmpeg } from '@/apps/desktop/services/tauri-bridge';
import { useProjectStore } from '@/apps/desktop/store/project-store';

const MOCK_RECENT = [
  { id: 'project-1', name: 'Tutorial IA Edição',  state: 'ALIGNED',     duration: '3:05',  updatedAt: '2 horas atrás' },
  { id: 'project-2', name: 'Podcast Ep. 42',       state: 'TRANSCRIBED', duration: '45:12', updatedAt: 'ontem' },
  { id: 'project-3', name: 'Reels Produto',        state: 'EXPORTED',    duration: '0:58',  updatedAt: '3 dias atrás' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { importVideoFromPath, importError } = useProjectStore();
  const [isImporting, setIsImporting] = useState(false);
  const [ffmpegError, setFfmpegError] = useState<string | null>(null);

  const handleNewProject = async () => {
    setIsImporting(true);
    setFfmpegError(null);

    try {
      // 1. Verifica se ffmpeg/ffprobe estão instalados
      const ffmpeg = await checkFfmpeg();
      if (!ffmpeg.ready) {
        setFfmpegError(`ffmpeg not found. Run in terminal: ${ffmpeg.install_hint}`);
        return;
      }

      // 2. Abre file picker nativo do macOS
      const file = await pickVideoFile();
      if (!file) return; // usuário cancelou

      // 3. Lê metadados reais via ffprobe e cria projeto
      await importVideoFromPath(file.path);

      // 4. Navega para o editor
      navigate('/editor/new');
    } catch (error) {
      console.error('[HomePage] handleNewProject error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e0f] flex flex-col items-center justify-center p-8 font-mono">
      <div className="max-w-xl w-full space-y-10">

        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <img src={flowcutIcon} alt="FlowCut" className="w-16 h-16 rounded-xl" />
          <h1 className="text-2xl font-bold tracking-tight text-white">FlowCut</h1>
          <p className="text-[12px] text-[#444] text-center max-w-sm leading-relaxed tracking-wide">
            Semantic video editor. Import, transcribe, edit by text, export.
          </p>
        </div>

        {/* Error banners */}
        {(ffmpegError || importError) && (
          <div className="flex items-start gap-2 bg-[#1a0e0e] border border-[#3a1a1a] rounded p-3">
            <AlertCircle className="w-3.5 h-3.5 text-[#cc4444] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#cc4444] leading-relaxed font-mono">
              {ffmpegError || importError}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleNewProject}
            disabled={isImporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4f6ef7] hover:bg-[#6b86f8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] tracking-wider uppercase rounded transition-all"
          >
            {isImporting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Plus className="w-3.5 h-3.5" />
            }
            {isImporting ? 'Reading metadata...' : 'New Project'}
          </button>

          <button
            onClick={() => navigate('/editor/project-1')}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#1e1e28] text-[#555] hover:text-[#888] hover:border-[#2a2a35] text-[12px] tracking-wider uppercase rounded transition-all"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open Project
          </button>
        </div>

        {/* ffmpeg requirement hint */}
        <p className="text-center text-[10px] text-[#1e1e24] tracking-widest">
          Requires ffmpeg · brew install ffmpeg
        </p>

        {/* Recent Projects */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-[#2a2a35] mb-2">Recent Projects</p>
          <div className="space-y-1">
            {MOCK_RECENT.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-[#0c0c0e] border border-[#141418] rounded cursor-pointer hover:border-[#1e1e28] transition-colors group"
                onClick={() => navigate(`/editor/${project.id}`)}
              >
                <div className="w-8 h-8 bg-[#111116] border border-[#1a1a20] rounded flex items-center justify-center flex-shrink-0">
                  <Film className="w-3.5 h-3.5 text-[#2a2a35]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#888] group-hover:text-[#aaa] transition-colors truncate">
                    {project.name}
                  </p>
                  <p className="text-[10px] text-[#333]">{project.duration} · {project.updatedAt}</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 bg-[#111116] border border-[#1a1a20] text-[#333] rounded font-mono tracking-wider">
                  {project.state}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
