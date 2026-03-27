import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Film, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useProjectStore } from '@/apps/desktop/store/project-store';

const EXPORT_PROFILES = [
  { label: 'YouTube 1080p', format: 'mp4', resolution: '1920×1080', codec: 'H.264' },
  { label: 'YouTube 4K', format: 'mp4', resolution: '3840×2160', codec: 'H.265' },
  { label: 'TikTok / Reels', format: 'mp4', resolution: '1080×1920', codec: 'H.264' },
  { label: 'ProRes Master', format: 'mov', resolution: '1920×1080', codec: 'ProRes' },
];

export default function ExportPage() {
  const navigate = useNavigate();
  const { project, simulateExport } = useProjectStore();
  const [selectedProfile, setSelectedProfile] = useState(0);

  const exportJob = project?.jobs.find((j) => j.type === 'export' && j.status === 'running');
  const isExporting = project?.state === 'EXPORTING';

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Exportar</h1>
      </div>

      {!project ? (
        <p className="text-muted-foreground">Nenhum projeto carregado.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Film className="w-4 h-4" />
                {project.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Estado: <span className="font-mono text-foreground">{project.state}</span>
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Perfil de Exportação</h2>
            <div className="grid grid-cols-2 gap-3">
              {EXPORT_PROFILES.map((profile, idx) => (
                <Card
                  key={profile.label}
                  className={`cursor-pointer transition-colors ${idx === selectedProfile ? 'border-primary glow-primary' : 'hover:border-muted-foreground/30'}`}
                  onClick={() => setSelectedProfile(idx)}
                >
                  <CardContent className="p-4">
                    <p className="font-medium text-sm">{profile.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profile.format.toUpperCase()} · {profile.resolution} · {profile.codec}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {isExporting && exportJob && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Exportando...</span>
                  <span className="font-mono">{exportJob.progress}%</span>
                </div>
                <Progress value={exportJob.progress} className="h-2" />
              </CardContent>
            </Card>
          )}

          {project.state === 'EXPORTED' && (
            <Card className="border-status-success/50">
              <CardContent className="p-4">
                <p className="text-status-success font-medium">✓ Exportação concluída (MOCK)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PLACEHOLDER — Nenhum arquivo foi realmente gerado.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              className="gradient-primary text-primary-foreground gap-2"
              disabled={isExporting}
              onClick={simulateExport}
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exportando...' : 'Exportar (Mock)'}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/settings')}>
              <Settings2 className="w-4 h-4" />
              Configurações
            </Button>
          </div>

          <p className="text-xs text-status-warning font-mono bg-muted px-3 py-2 rounded">
            ⚠ MOCK — Nenhum vídeo real é renderizado. Exportação simulada com progresso fictício.
          </p>
        </>
      )}
    </div>
  );
}
