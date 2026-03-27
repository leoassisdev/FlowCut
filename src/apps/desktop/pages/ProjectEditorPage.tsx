import { useEffect, useState } from 'react';
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
import DiagnosticsPanel from '@/apps/desktop/components/DiagnosticsPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProjectEditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, isLoading, loadProject } = useProjectStore();
  const navigate = useNavigate();
  const [bottomTab, setBottomTab] = useState<'timeline' | 'diagnostics'>('timeline');

  useKeyboardShortcuts();

  useEffect(() => {
    if (projectId) loadProject(projectId);
  }, [projectId]);

  if (isLoading || !project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Toolbar */}
      <EditorToolbar project={project} onNavigateHome={() => navigate('/')} />

      {/* Main layout: 3-column + bottom */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Transcript */}
        <div className="w-80 border-r border-border flex flex-col overflow-hidden">
          <TranscriptPanel transcript={project.transcript} />
        </div>

        {/* Center: Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <PreviewPlayer sourceVideo={project.sourceVideo} />
        </div>

        {/* Right: Tabs for Presets / Captions / Jobs */}
        <div className="w-72 border-l border-border flex flex-col overflow-hidden">
          <Tabs defaultValue="presets" className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border bg-panel h-9 px-2">
              <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
              <TabsTrigger value="captions" className="text-xs">Legendas</TabsTrigger>
              <TabsTrigger value="jobs" className="text-xs">Jobs</TabsTrigger>
            </TabsList>
            <TabsContent value="presets" className="flex-1 overflow-hidden mt-0">
              <PresetsPanel appliedPreset={project.appliedPreset} />
            </TabsContent>
            <TabsContent value="captions" className="flex-1 overflow-hidden mt-0">
              <CaptionPanel />
            </TabsContent>
            <TabsContent value="jobs" className="flex-1 overflow-hidden mt-0">
              <JobsPanelEnhanced legacyJobs={project.jobs} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bottom: Timeline + Diagnostics */}
      <div className="h-44 border-t border-border bg-timeline flex flex-col">
        <div className="flex items-center border-b border-border px-2">
          <button
            onClick={() => setBottomTab('timeline')}
            className={`text-xs px-3 py-1.5 transition-colors ${
              bottomTab === 'timeline' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setBottomTab('diagnostics')}
            className={`text-xs px-3 py-1.5 transition-colors ${
              bottomTab === 'diagnostics' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            Logs
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {bottomTab === 'timeline' ? (
            <SemanticTimelinePanel timeline={project.semanticTimeline} />
          ) : (
            <DiagnosticsPanel />
          )}
        </div>
      </div>
    </div>
  );
}
