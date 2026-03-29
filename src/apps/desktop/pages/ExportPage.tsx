import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Film, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useProjectStore } from '../store/project-store';
import { pickExportPath, exportVideo, openInFinder } from '../services/tauri-bridge';

function formatSrtTime(ms: number) {
  const d = new Date(Date.UTC(0, 0, 0, 0, 0, 0, ms));
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  const secs = String(d.getUTCSeconds()).padStart(2, '0');
  const millis = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `${hours}:${mins}:${secs},${millis}`;
}

export default function ExportPage() {
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.project);
  
  const [quality, setQuality] = useState<'high' | 'medium' | 'ultra'>('high');
  const [burnCaptions, setBurnCaptions] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Alterado para mostrar erros detalhados
  const [error, setError] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <p className="text-muted-foreground">Nenhum projeto carregado.</p>
        <Button onClick={() => navigate('/')} className="mt-4">Voltar ao Início</Button>
      </div>
    );
  }

  const handleExport = async () => {
    let unlisten: (() => void) | undefined;

    try {
      setIsExporting(true);
      setError(null);
      setExportSuccess(false);
      setExportProgress(0);

      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen('export-progress', (event: any) => {
        setExportProgress(event.payload.progress);
      });

      const keepCuts = project.semanticTimeline?.cuts.filter(c => c.type === 'keep') || [];
      if (keepCuts.length === 0) throw new Error("A timeline está vazia ou todos os trechos do vídeo foram removidos.");

      const cuts = keepCuts.map(c => ({ start_ms: c.startMs, end_ms: c.endMs }));

      let subtitlesStr: string | undefined = undefined;
      if (burnCaptions) {
        let srt = '';
        let srtIndex = 1;
        let currentExportMs = 0;

        for (const cut of keepCuts) {
          const duration = cut.endMs - cut.startMs;
          const startSrt = formatSrtTime(currentExportMs);
          const endSrt = formatSrtTime(currentExportMs + duration);
          srt += `${srtIndex}\n${startSrt} --> ${endSrt}\n${cut.label}\n\n`;
          srtIndex++;
          currentExportMs += duration;
        }
        subtitlesStr = srt;
      }

      const defaultName = `${project.name.replace(/[^a-z0-9A-Z]/gi, '_').toLowerCase()}_final.mp4`;
      const outputPath = await pickExportPath(defaultName);

      if (!outputPath) {
        setIsExporting(false);
        return; 
      }

      const result = await exportVideo({
        source_video_path: project.sourceVideo.filePath,
        cuts,
        output_path: outputPath,
        width: project.sourceVideo.width,
        height: project.sourceVideo.height,
        fps: project.sourceVideo.fps,
        quality,
        subtitles: subtitlesStr,
      });

      if (!result) throw new Error("O Rust não retornou resposta. O processo pode ter morrido.");

      setExportProgress(100);
      setExportSuccess(true);
      
      await openInFinder(outputPath);

    } catch (err: any) {
      console.error("DEBUG EXPORT:", err);
      
      // MÁGICA: O Tauri manda o erro como uma string crua vinda do Rust. 
      // Agora o React vai mostrar na tela sem mascarar!
      const errorMessage = typeof err === 'string' ? err : (err.message || "Erro desconhecido ao exportar o projeto.");
      setError(errorMessage);
      
    } finally {
      setIsExporting(false);
      if (unlisten) unlisten();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} disabled={isExporting}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Exportar Projeto</h1>
        </div>

        <Card className="border-muted bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              {project.name}
            </CardTitle>
            <CardDescription>
              Resolução original: {project.sourceVideo.width}x{project.sourceVideo.height} • {project.sourceVideo.fps} FPS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            <div className="space-y-4">
              <Label className="text-base">Qualidade da Exportação</Label>
              <RadioGroup 
                value={quality} 
                onValueChange={(val) => setQuality(val as 'high' | 'medium' | 'ultra')}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                disabled={isExporting}
              >
                <div>
                  <RadioGroupItem value="medium" id="q-medium" className="peer sr-only" />
                  <Label htmlFor="q-medium" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                    <span className="font-semibold">Média</span>
                    <span className="text-xs text-muted-foreground mt-1">Rápido (CRF 23)</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="high" id="q-high" className="peer sr-only" />
                  <Label htmlFor="q-high" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                    <span className="font-semibold">Alta</span>
                    <span className="text-xs text-muted-foreground mt-1">Equilibrado (CRF 20)</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="ultra" id="q-ultra" className="peer sr-only" />
                  <Label htmlFor="q-ultra" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                    <span className="font-semibold">Ultra</span>
                    <span className="text-xs text-muted-foreground mt-1">Lento (CRF 16)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-3 p-4 border-2 border-muted rounded-md bg-muted/10">
              <input 
                type="checkbox" 
                id="burn-captions" 
                checked={burnCaptions}
                onChange={(e) => setBurnCaptions(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer"
                disabled={isExporting}
              />
              <div className="flex flex-col">
                <Label htmlFor="burn-captions" className="text-base font-semibold cursor-pointer">Queimar Legendas no Vídeo</Label>
                <span className="text-sm text-muted-foreground">O FFmpeg vai renderizar o texto perfeitamente sincronizado com a sua fala no vídeo final.</span>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex flex-col gap-2 text-sm overflow-hidden">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Erro de Renderização</span>
                </div>
                {/* Aqui está o dedurador oficial do FFmpeg */}
                <pre className="text-[10px] font-mono bg-black/20 p-2 rounded max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {error}
                </pre>
              </div>
            )}

            {exportSuccess && (
              <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p>Vídeo exportado com sucesso! A pasta deve ter aberto automaticamente.</p>
              </div>
            )}

            <div className="space-y-3">
              {isExporting && (
                <div className="w-full space-y-2 mb-4">
                  <div className="flex justify-between text-sm text-muted-foreground font-mono">
                    <span>Renderizando...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out" 
                      style={{ width: `${exportProgress}%` }} 
                    />
                  </div>
                </div>
              )}
              <Button size="lg" className="w-full gap-2 text-base h-14" onClick={handleExport} disabled={isExporting}>
                <Download className="w-5 h-5" />
                {isExporting ? 'Processando (Isso pode demorar um pouco)...' : 'Iniciar Exportação'}
              </Button>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}