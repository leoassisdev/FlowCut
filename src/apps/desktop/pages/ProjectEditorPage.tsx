import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import {
  Home, FolderOpen, Sliders, Film, Download, Settings,
  ChevronRight, LayoutPanelLeft
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'projects', icon: FolderOpen, label: 'Projects' },
  { id: 'presets', icon: Sliders, label: 'Presets' },
  { id: 'media', icon: Film, label: 'Media' },
  { id: 'exports', icon: Download, label: 'Exports' },
];

const RIGHT_TABS = [
  { id: 'presets', label: 'Presets' },
  { id: 'captions', label: 'Captions' },
  { id: 'broll', label: 'B-Roll' },
  { id: 'jobs', label: 'Jobs' },
];

export default function ProjectEditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading, loadProject } = useProjectStore();
  const navigate = useNavigate();
  const [rightTab, setRightTab] = useState('presets');
  const [bottomTab, setBottomTab] = useState<'timeline' | 'logs'>('timeline');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('projects');

  useKeyboardShortcuts();

  useEffect(() => {
    if (projectId) loadProject(projectId);
  }, [projectId]);

  const handleNavClick = useCallback((id: string) => {
    if (id === 'home') { navigate('/'); return; }
    setActiveNav(id);
  }, [navigate]);

  if (isLoading || !project) {
    return (
      <div className="h-screen bg-[#0e0e0f] flex items-center justify-center">
        <div className="space-y-3 w-48">
          <div className="h-1 bg-[#1e1e22] rounded overflow-hidden">
            <div className="h-full w-2/3 bg-[#4f6ef7] rounded animate-pulse" />
          </div>
          <p className="text-[11px] text-[#555] font-mono tracking-widest text-center uppercase">
            Loading project...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0e0e0f] flex flex-col overflow-hidden font-['JetBrains_Mono',_'Fira_Code',_monospace]">

      {/* ── Top Toolbar ── */}
      <div className="h-9 border-b border-[#1c1c20] flex-shrink-0">
        <EditorToolbar project={project} onNavigateHome={() => navigate('/')} />
      </div>

      {/* ── Main Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Sidebar (icon nav) ── */}
        <div className={`${sidebarCollapsed ? 'w-10' : 'w-12'} bg-[#0a0a0c] border-r border-[#1c1c20] flex flex-col items-center py-2 gap-1 flex-shrink-0 transition-all`}>
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              title={label}
              className={`w-8 h-8 rounded flex items-center justify-center transition-all group relative
                ${activeNav === id
                  ? 'bg-[#4f6ef7]/20 text-[#4f6ef7]'
                  : 'text-[#3a3a45] hover:text-[#888] hover:bg-[#1a1a1f]'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1f] border border-[#2a2a30] text-[10px] text-[#aaa] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                {label}
              </span>
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title="Settings"
            className="w-8 h-8 rounded flex items-center justify-center text-[#3a3a45] hover:text-[#888] hover:bg-[#1a1a1f] transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Transcript Panel ── */}
        <div className="w-[260px] border-r border-[#1c1c20] flex flex-col overflow-hidden flex-shrink-0 bg-[#0c0c0e]">
          <TranscriptPanel transcript={project.transcript} />
        </div>

        {/* ── Center: Preview ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <PreviewPlayer sourceVideo={project.sourceVideo} />
        </div>

        {/* ── Right Panel ── */}
        <div className="w-[240px] border-l border-[#1c1c20] flex flex-col overflow-hidden flex-shrink-0 bg-[#0c0c0e]">
          {/* Tab bar */}
          <div className="flex border-b border-[#1c1c20] flex-shrink-0">
            {RIGHT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`flex-1 py-2 text-[10px] tracking-wider uppercase transition-colors font-medium
                  ${rightTab === tab.id
                    ? 'text-[#4f6ef7] border-b border-[#4f6ef7] bg-[#4f6ef7]/5'
                    : 'text-[#444] hover:text-[#777]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {rightTab === 'presets' && <PresetsPanel appliedPreset={project.appliedPreset} />}
            {rightTab === 'captions' && <CaptionPanel />}
            {rightTab === 'broll' && <BrollMockPanel />}
            {rightTab === 'jobs' && <JobsPanelEnhanced legacyJobs={project.jobs} />}
          </div>
        </div>
      </div>

      {/* ── Bottom: Timeline + Logs ── */}
      <div className="h-[160px] border-t border-[#1c1c20] bg-[#090909] flex flex-col flex-shrink-0">
        {/* Bottom tab bar */}
        <div className="h-7 flex items-center border-b border-[#1c1c20] px-3 gap-0 flex-shrink-0">
          {(['timeline', 'logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setBottomTab(tab)}
              className={`px-3 h-full text-[10px] tracking-widest uppercase transition-colors
                ${bottomTab === tab
                  ? 'text-[#ccc] border-b border-[#4f6ef7]'
                  : 'text-[#333] hover:text-[#666]'
                }`}
            >
              {tab}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] font-mono text-[#2a2a35]">
            {Math.floor(project.semanticTimeline?.totalDurationMs ?? 0 / 1000)}s edited
            {' / '}
            {Math.floor(project.semanticTimeline?.originalDurationMs ?? 0 / 1000)}s original
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          {bottomTab === 'timeline'
            ? <SemanticTimelinePanel timeline={project.semanticTimeline} />
            : <LogsPanel />
          }
        </div>
      </div>

      {/* ── AI Assistant (floating) ── */}
      <AIAssistant />
    </div>
  );
}

// ── Inline mini-panels (sem lógica de negócio) ──────────────────────────────

function BrollMockPanel() {
  return (
    <div className="p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-[#333] mb-3">B-Roll Suggestions</p>
      {['AI technology', 'File import', 'Video editing'].map((kw) => (
        <div key={kw} className="bg-[#111114] border border-[#1e1e24] rounded p-2 flex items-center gap-2">
          <div className="w-12 h-8 bg-[#1a1a20] rounded flex-shrink-0 flex items-center justify-center">
            <Film className="w-3 h-3 text-[#333]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[#888] truncate">{kw}</p>
            <p className="text-[10px] text-[#333]">Generated · 3s</p>
          </div>
          <button className="text-[10px] text-[#4f6ef7] hover:text-[#7b96ff] transition-colors">
            Insert
          </button>
        </div>
      ))}
      <button className="w-full mt-2 py-1.5 text-[10px] tracking-wider uppercase border border-[#1e1e24] text-[#444] hover:text-[#888] hover:border-[#333] rounded transition-all">
        Generate B-Roll
      </button>
    </div>
  );
}

function LogsPanel() {
  const logs = [
    { time: '21:07:01', level: 'INFO', msg: 'Project loaded (MOCK)' },
    { time: '21:07:01', level: 'INFO', msg: 'editor-sm: IDLE → LOADING [LOAD_PROJECT]' },
    { time: '21:07:01', level: 'INFO', msg: 'editor-sm: LOADING → READY [PROJECT_LOADED]' },
    { time: '21:07:01', level: 'INFO', msg: 'editor-sm: READY → EDITING [START_EDITING]' },
    { time: '21:07:01', level: 'INFO', msg: 'autosave: Initial load saved' },
  ];
  return (
    <div className="h-full overflow-y-auto px-3 py-2 font-mono">
      {logs.map((log, i) => (
        <div key={i} className="flex gap-3 text-[10px] leading-5">
          <span className="text-[#2a2a35] flex-shrink-0">{log.time}</span>
          <span className={`flex-shrink-0 w-10 ${log.level === 'INFO' ? 'text-[#4f6ef7]' : 'text-[#f7804f]'}`}>
            {log.level}
          </span>
          <span className="text-[#444]">{log.msg}</span>
        </div>
      ))}
    </div>
  );
}
