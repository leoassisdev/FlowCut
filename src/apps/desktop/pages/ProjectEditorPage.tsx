import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useProjectStore } from '@/apps/desktop/store/project-store';
import { useKeyboardShortcuts } from '@/apps/desktop/hooks/useKeyboardShortcuts';
import PreviewPlayer from '@/apps/desktop/components/PreviewPlayer';
import TranscriptPanel from '@/apps/desktop/components/TranscriptPanel';
import SemanticTimelinePanel from '@/apps/desktop/components/SemanticTimelinePanel';
import PresetsPanel from '@/apps/desktop/components/PresetsPanel';
import CaptionPanel from '@/apps/desktop/components/CaptionPanel';
import JobsPanelEnhanced from '@/apps/desktop/components/JobsPanelEnhanced';
import EditorToolbar from '@/apps/desktop/components/EditorToolbar';
import AIAssistant from '@/apps/desktop/components/AIAssistant';
import type { SourceVideo } from '@/packages/shared-types';
import { Home, FolderOpen, Sliders, Film, Download, Settings, GripVertical, GripHorizontal, AudioWaveform, Info, Volume2, Scissors } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home',     icon: Home,       label: 'Home' },
  { id: 'projects', icon: FolderOpen, label: 'Projects' },
  { id: 'presets',  icon: Sliders,    label: 'Presets' },
  { id: 'media',    icon: Film,       label: 'Media' },
  { id: 'exports',  icon: Download,   label: 'Exports' },
];

const RIGHT_TABS = [
  { id: 'info',     label: 'Info' },
  { id: 'autocut',  label: 'Auto-Cut' },
  { id: 'presets',  label: 'Presets' },
  { id: 'captions', label: 'Legendas' },
  { id: 'jobs',     label: 'Jobs' },
];

export default function ProjectEditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading, loadProject, undo, redo, setIsPlaying, requestSeek, restoreTimeline } = useProjectStore();
  const navigate = useNavigate();
  
  const [rightTab, setRightTab] = useState('info');
  // O bottomTab agora é estritamente para as visualizações inferiores
  const [bottomTab, setBottomTab] = useState<'timeline' | 'logs'>('timeline');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('projects');

  const [level, setLevel] = useState(0);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  useKeyboardShortcuts();

  useEffect(() => {
    if (projectId && projectId !== 'new') loadProject(projectId);
  }, [projectId]);

  useEffect(() => {
    const handleAudioLevel = (e: Event) => {
      const customEvent = e as CustomEvent;
      setLevel(customEvent.detail);
    };
    window.addEventListener('v-audio-level', handleAudioLevel);
    return () => window.removeEventListener('v-audio-level', handleAudioLevel);
  }, []);

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
      
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
      }
      
      if (e.code === 'Space') {
        e.preventDefault();
        const state = useProjectStore.getState();
        const selectedId = state.selectedCutId;
        
        if (e.shiftKey && selectedId) {
          e.preventDefault();
          const cut = state.project?.semanticTimeline?.cuts.find(c => c.id === selectedId);
          if (cut) {
             // Manda a agulha pro começo do clipe
             requestSeek(cut.startMs);
             // Manda o sinal de Play
             setIsPlaying(true);
             return;
          }
        } else {
          state.setIsPlaying(!state.isPlaying);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [undo, redo, requestSeek, setIsPlaying]);

  const handleNavClick = useCallback((id: string) => {
    if (id === 'home') { navigate('/'); return; }
    setActiveNav(id);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="h-screen bg-[#0e0e0f] flex items-center justify-center">
        <div className="space-y-3 w-48">
          <div className="h-1 bg-[#1e1e22] rounded overflow-hidden"><div className="h-full w-2/3 bg-[#4f6ef7] rounded animate-pulse" /></div>
          <p className="text-[11px] text-[#555] font-mono tracking-widest text-center uppercase">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen bg-[#0e0e0f] flex items-center justify-center">
        <div className="text-center space-y-3"><p className="text-[12px] font-mono text-[#444]">No project loaded.</p><button onClick={() => navigate('/')} className="text-[11px] font-mono text-[#4f6ef7] hover:underline">← Back to home</button></div>
      </div>
    );
  }

  return (
    <>
      {showRestoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111115] border border-[#333] rounded-lg p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-red-500 font-bold mb-2">Atenção!</h3>
            <p className="text-sm text-[#ccc] mb-6">ISSO IRÁ APAGAR TODAS AS SUAS ALTERAÇÕES FEITAS ATÉ AQUI. Deseja continuar?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRestoreModal(false)} className="px-4 py-2 rounded text-xs font-semibold bg-[#222] hover:bg-[#333] text-white transition-colors">Cancelar</button>
              <button onClick={() => { restoreTimeline(); setShowRestoreModal(false); }} className="px-4 py-2 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">Sim, Restaurar</button>
            </div>
          </div>
        </div>
      )}
    <div className="h-screen bg-[#0e0e0f] flex flex-col overflow-hidden font-['JetBrains_Mono',_'Fira_Code',_monospace]">
      <div className="h-9 border-b border-[#1c1c20] flex-shrink-0">
        <EditorToolbar project={project} onNavigateHome={() => navigate('/')} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${sidebarCollapsed ? 'w-10' : 'w-12'} bg-[#0a0a0c] border-r border-[#1c1c20] flex flex-col items-center py-2 gap-1 flex-shrink-0 transition-all`}>
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => handleNavClick(id)} title={label} className={`w-8 h-8 rounded flex items-center justify-center transition-all group relative ${activeNav === id ? 'bg-[#4f6ef7]/20 text-[#4f6ef7]' : 'text-[#3a3a45] hover:text-[#888] hover:bg-[#1a1a1f]'}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1f] border border-[#2a2a30] text-[10px] text-[#aaa] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">{label}</span>
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title="Settings" className="w-8 h-8 rounded flex items-center justify-center text-[#3a3a45] hover:text-[#888] hover:bg-[#1a1a1f] transition-all"><Settings className="w-3.5 h-3.5" /></button>
        </div>

        <PanelGroup direction="horizontal" className="flex-1 w-full h-full">
          <Panel defaultSize={20} minSize={15} maxSize={40} className="flex flex-col bg-[#0c0c0e]">
            <TranscriptPanel />
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-[#1c1c20] hover:bg-[#4f6ef7] transition-colors cursor-col-resize flex items-center justify-center flex-shrink-0"><GripVertical className="w-3 h-3 text-[#555]" /></PanelResizeHandle>

          <Panel defaultSize={60} minSize={30} className="flex flex-col min-w-0">
            <PanelGroup direction="vertical" className="w-full h-full">
              <Panel defaultSize={70} minSize={30} className="flex flex-col"><PreviewPlayer sourceVideo={project.sourceVideo} /></Panel>

              <PanelResizeHandle className="h-1.5 bg-[#1c1c20] hover:bg-[#4f6ef7] transition-colors cursor-row-resize flex items-center justify-center flex-shrink-0"><GripHorizontal className="w-3 h-3 text-[#555]" /></PanelResizeHandle>

              <Panel defaultSize={30} minSize={15} className="flex flex-col bg-[#090909]">
                <div className="h-7 flex items-center border-b border-[#1c1c20] px-3 gap-0 flex-shrink-0 bg-[#090909]">
                  {/* ORDEM CORRIGIDA: TIMELINE -> REMOVER SILÊNCIOS -> LOGS */}
                  <button onClick={() => setBottomTab('timeline')} className={`px-3 h-full text-[10px] tracking-widest uppercase transition-colors ${bottomTab === 'timeline' ? 'text-[#ccc] border-b border-[#4f6ef7]' : 'text-[#333] hover:text-[#666]'}`}>
                    TIMELINE
                  </button>
                  
                  <div className="w-px h-3 bg-[#1c1c20] mx-1" />
                  
                  <button 
                    onClick={() => setRightTab(rightTab === 'autocut' ? 'info' : 'autocut')} 
                    className={`px-3 h-full text-[10px] tracking-widest uppercase transition-colors ${rightTab === 'autocut' ? 'text-[#10b981] border-b border-[#10b981]' : 'text-[#333] hover:text-[#666]'}`}
                  >
                    REMOVER SILÊNCIOS
                  </button>

                  <div className="w-px h-3 bg-[#1c1c20] mx-1" />

                  <button onClick={() => setBottomTab('logs')} className={`px-3 h-full text-[10px] tracking-widest uppercase transition-colors ${bottomTab === 'logs' ? 'text-[#ccc] border-b border-[#4f6ef7]' : 'text-[#333] hover:text-[#666]'}`}>
                    LOGS
                  </button>
                  <div className="w-px h-3 bg-[#1c1c20] mx-1" />
                  <button onClick={() => setShowRestoreModal(true)} className="px-3 h-full text-[10px] tracking-widest uppercase transition-colors text-red-500 hover:bg-red-500/10">
                    RESTAURAR PADRÃO
                  </button>

                  <div className="flex-1" />
                  <span className="text-[10px] font-mono text-[#2a2a35]">{Math.floor((project.semanticTimeline?.totalDurationMs ?? 0) / 1000)}s edited / {Math.floor((project.sourceVideo?.durationMs ?? project.semanticTimeline?.originalDurationMs ?? 0) / 1000)}s original</span>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  {/* A timeline NUNCA some ao clicar em Remover Silêncios! */}
                  {bottomTab === 'timeline' && <SemanticTimelinePanel />}
                  {bottomTab === 'logs' && <LogsPanel />}
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-[#1c1c20] hover:bg-[#4f6ef7] transition-colors cursor-col-resize flex items-center justify-center flex-shrink-0"><GripVertical className="w-3 h-3 text-[#555]" /></PanelResizeHandle>

          <Panel defaultSize={20} minSize={15} maxSize={30} className="flex flex-col bg-[#0c0c0e]">
            <div className="flex border-b border-[#1c1c20] flex-shrink-0">
              {RIGHT_TABS.map((tab) => (
                <button key={tab.id} onClick={() => setRightTab(tab.id)} className={`flex-1 py-2 text-[10px] tracking-wider uppercase transition-colors font-medium ${rightTab === tab.id ? 'text-[#4f6ef7] border-b border-[#4f6ef7] bg-[#4f6ef7]/5' : 'text-[#444] hover:text-[#777]'}`}>{tab.label}</button>
              ))}
            </div>
            
            <div className="flex-1 overflow-hidden">
              {rightTab === 'info'     && <VideoInfoPanel video={project.sourceVideo} />}
              {rightTab === 'autocut'  && <AutoCutPanel />}
              {rightTab === 'presets'  && <PresetsPanel appliedPreset={project.appliedPreset} />}
              {rightTab === 'captions' && <CaptionPanel />}
              {rightTab === 'jobs'     && <JobsPanelEnhanced legacyJobs={project.jobs} />}
            </div>

            <div className="h-[260px] flex-shrink-0 flex flex-col border-t border-[#1c1c20] bg-[#070708]">
               <DigitalMixer audioLevel={level} />
            </div>

          </Panel>
        </PanelGroup>
      </div>
      <AIAssistant />
    </div>
  </>);
}

// ── Mini-panels ───────────────────────────────────────────────────────────────

function VideoInfoPanel({ video }: { video: SourceVideo | null }) {
  if (!video) return <div className="p-4 text-[11px] text-[#555]">Nenhum vídeo carregado.</div>;
  const formatBytes = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `00:${m}:${s}`;
  };

  return (
    <div className="p-4 space-y-4">
      <p className="text-[11px] font-semibold text-[#eee] flex items-center gap-2 mb-2"><Info className="w-4 h-4 text-primary" /> Informações da Mídia</p>
      <div className="space-y-1 border border-[#1c1c20] rounded p-3 bg-[#0a0a0c]">
        <InfoRow label="File name" value={video.fileName} />
        <InfoRow label="File size" value={formatBytes(video.sizeBytes)} />
        <InfoRow label="Duration" value={formatTime(video.durationMs)} />
        <InfoRow label="Frame size" value={`${video.width}x${video.height}`} />
        <InfoRow label="Frame rate" value={`${video.fps} fps`} />
        <InfoRow label="Video codec" value={video.codec.toUpperCase()} />
      </div>
    </div>
  );
}
function InfoRow({ label, value }: { label: string, value: string | number }) {
  return <div className="flex justify-between border-b border-[#1c1c20] last:border-0 pb-1.5 mb-1.5 last:pb-0 last:mb-0"><span className="text-[10px] text-[#888]">{label}</span><span className="text-[10px] text-[#ccc] font-mono text-right break-all ml-4">{value}</span></div>;
}

function AutoCutPanel() {
  const noiseDb = useProjectStore((s) => s.silenceNoiseDb);
  const setNoiseDb = useProjectStore((s) => s.setSilenceNoiseDb);
  const minDuration = useProjectStore((s) => s.silenceMinDuration);
  const setMinDuration = useProjectStore((s) => s.setSilenceMinDuration);
  const applyAutoCut = useProjectStore((s) => s.applyAutoCut);
  const isRebuilding = useProjectStore((s) => s.isRebuilding);

  return (
    <div className="p-4 space-y-4 h-full flex flex-col justify-between">
      <div>
        <p className="text-[11px] font-semibold text-[#10b981] flex items-center gap-2 mb-2"><Scissors className="w-4 h-4" /> Remover Silêncios</p>
        <p className="text-[9px] text-muted-foreground mb-4 leading-relaxed">Ajuste a pressão do noise gate para fatiar pausas indesejadas.</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between"><span className="text-[9px] text-[#888]">Pressão (dB)</span><span className="text-[9px] font-mono text-[#10b981]">{noiseDb} dB</span></div>
          <input type="range" min="-40" max="-10" step="1" value={noiseDb} onChange={(e) => setNoiseDb(Number(e.target.value))} className="w-full accent-[#10b981]" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between"><span className="text-[9px] text-[#888]">Duração mínima</span><span className="text-[9px] font-mono text-[#10b981]">{minDuration.toFixed(1)}s</span></div>
          <input type="range" min="0.1" max="2.0" step="0.1" value={minDuration} onChange={(e) => setMinDuration(Number(e.target.value))} className="w-full accent-[#10b981]" />
        </div>
      </div>

      <button 
        onClick={applyAutoCut} 
        disabled={isRebuilding}
        className="w-full py-1.5 text-[10px] font-semibold tracking-wider uppercase bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/20 hover:border-[#10b981] rounded transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        {isRebuilding ? 'Analisando...' : 'Aplicar Corte'}
      </button>
    </div>
  );
}

function DigitalMixer({ audioLevel }: { audioLevel: number }) {
  const masterVolume = useProjectStore((s) => s.masterVolume);
  const setMasterVolume = useProjectStore((s) => s.setMasterVolume);
  const setCutVolume = useProjectStore((s) => s.setCutVolume);
  const selectedCutId = useProjectStore((s) => s.selectedCutId);
  const project = useProjectStore((s) => s.project);
  
  const selectedCut = project?.semanticTimeline?.cuts.find(c => c.id === selectedCutId);
  const selectedVol = selectedCut ? (selectedCut as any).volume ?? 1.0 : 1.0;

  return (
    <div className="flex-1 flex flex-col p-4">
      <p className="text-[11px] font-semibold text-[#eee] flex items-center gap-2 mb-4"><Volume2 className="w-4 h-4 text-[#4f6ef7]" /> Digital Mixer</p>
      <div className="flex justify-around gap-4 flex-1 px-2">
        <MixerFader 
          label="Clipe Atual" value={selectedVol} 
          onChange={(v) => { if (selectedCutId) setCutVolume(selectedCutId, v); }} 
          disabled={!selectedCutId} audioLevel={audioLevel * selectedVol} 
        />
        <MixerFader 
          label="Master Out" value={masterVolume} 
          onChange={setMasterVolume} disabled={false} 
          audioLevel={audioLevel * masterVolume} isMaster
        />
      </div>
    </div>
  );
}

function MixerFader({ label, value, onChange, disabled, audioLevel, isMaster = false }: { label: string, value: number, onChange: (v: number) => void, disabled: boolean, audioLevel: number, isMaster?: boolean }) {
  const meterHeight = Math.min(100, audioLevel * 100 * 2.5);

  const handleFaderDrag = (e: React.MouseEvent) => {
    if (disabled) return;
    const startY = e.clientY;
    const startVol = value;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newVol = Math.max(0, Math.min(2.0, startVol + (deltaY / 50)));
      onChange(newVol);
    };
    const onMouseUp = () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <span className="text-[9px] font-mono text-[#888] uppercase tracking-widest">{label}</span>
      <div className="flex gap-3 h-[130px]">
        <div className="relative w-6 h-full bg-[#111] border border-[#222] rounded-full cursor-ns-resize flex justify-center" onMouseDown={handleFaderDrag}>
          <div className="absolute w-8 h-4 bg-[#333] border border-[#555] rounded shadow-md pointer-events-none" style={{ bottom: `${(value / 2) * 100}%`, marginBottom: '-8px' }}>
            <div className="w-full h-0.5 bg-[#111] mt-1.5 opacity-50" />
          </div>
        </div>
        
        <div className="w-2 h-full bg-[#111] border border-[#222] rounded-sm overflow-hidden flex flex-col relative">
          <div className="absolute inset-0 w-full h-full opacity-30 z-20" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #555, #555 1px, transparent 1px, transparent 4px)' }} />
          <div 
            className="absolute inset-0 w-full h-full transition-all duration-75 ease-out z-10" 
            style={{ 
              background: 'linear-gradient(to top, #10b981 0%, #10b981 60%, #facc15 60%, #facc15 85%, #ef4444 85%, #ef4444 100%)',
              clipPath: `inset(${100 - meterHeight}% 0 0 0)`
            }} 
          />
        </div>
      </div>
      <span className={`text-[10px] font-mono mt-1 ${isMaster ? 'text-primary' : 'text-[#ccc]'}`}>{Math.round(value * 100)}%</span>
    </div>
  );
}

function LogsPanel() {
  const logs = [{ time: new Date().toLocaleTimeString('en', { hour12: false }), level: 'INFO', msg: 'Editor ready' }];
  return <div className="h-full overflow-y-auto px-3 py-2 font-mono">{logs.map((log, i) => <div key={i} className="flex gap-3 text-[10px] leading-5"><span className="text-[#2a2a35] flex-shrink-0">{log.time}</span><span className={`flex-shrink-0 w-10 ${log.level === 'INFO' ? 'text-[#4f6ef7]' : 'text-[#f7804f]'}`}>{log.level}</span><span className="text-[#444]">{log.msg}</span></div>)}</div>;
}