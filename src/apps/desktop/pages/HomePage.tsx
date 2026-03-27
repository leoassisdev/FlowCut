import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Film, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import flowcutIcon from '@/assets/flowcut-icon.png';
import { pickVideoFile } from '@/apps/desktop/services/tauri-bridge';
import { useProjectStore } from '@/apps/desktop/store/project-store';

const MOCK_RECENT = [
  { id: 'project-1', name: 'Tutorial IA Edição', state: 'ALIGNED', duration: '3:05', updatedAt: '2 horas atrás' },
  { id: 'project-2', name: 'Podcast Ep. 42', state: 'TRANSCRIBED', duration: '45:12', updatedAt: 'ontem' },
  { id: 'project-3', name: 'Reels Produto', state: 'EXPORTED', duration: '0:58', updatedAt: '3 dias atrás' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const importVideo = useProjectStore((s) => s.importVideo);
  const [isImporting, setIsImporting] = useState(false);

  const handleNewProject = async () => {
    setIsImporting(true);
    try {
      const file = await pickVideoFile();

      if (!file) {
        // Usuário cancelou o diálogo — não faz nada
        return;
      }

      // Registra o vídeo no store
      importVideo(file.name);

      // Navega para o editor com o projeto criado
      // Por ora usa project-1 até termos IDs reais gerados pelo engine local
      navigate('/editor/project-1');
    } catch (error) {
      console.error('[HomePage] handleNewProject error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-10">

        {/* Logo & Title */}
        <div className="flex flex-col items-center space-y-4">
          <img src={flowcutIcon} alt="FlowCut" className="w-20 h-20 rounded-2xl shadow-card" />
          <h1 className="text-3xl font-bold tracking-tight">FlowCut</h1>
          <p className="text-muted-foreground text-center max-w-md">
            Edição semântica de vídeos falados. Importe, transcreva, edite por texto e exporte.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button
            className="gradient-primary text-primary-foreground gap-2 px-6 py-5 text-base"
            onClick={handleNewProject}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {isImporting ? 'Abrindo...' : 'Novo Projeto'}
          </Button>

          <Button
            variant="outline"
            className="gap-2 px-6 py-5 text-base"
            onClick={() => navigate('/editor/project-1')}
          >
            <FolderOpen className="w-5 h-5" />
            Abrir Projeto
          </Button>
        </div>

        {/* Recent Projects */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Projetos Recentes
          </h2>
          <div className="space-y-2">
            {MOCK_RECENT.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/editor/${project.id}`)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Film className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {project.duration} · {project.updatedAt}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-mono">
                    {project.state}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
