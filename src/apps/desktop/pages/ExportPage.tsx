import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Film, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useProjectStore } from '../store/project-store';
import { pickExportPath, exportVideo } from '../services/tauri-bridge';

export default function ExportPage() {
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.project);
  
  const [quality, setQuality] = useState<'high' | 'medium' | 'ultra'>('high');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
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
    try {
      setIsExporting(true);
      setError(null);
      setExportSuccess(false);

      // 1. Filtra na SemanticTimeline apenas os cortes que são do tipo 'keep'
      const keepCuts = project.semanticTimeline?.cuts.filter(c => c.type === 'keep') || [];
      if (keepCuts.length === 0) {
        throw new Error("A timeline está vazia ou todos os trechos do vídeo foram removidos.");
      }

      // 2. Mapeia para o formato que o Rust espera (start_ms e end_ms)
      const cuts = keepCuts.map(c => ({ start_ms: c.startMs, end_ms: c.endMs }));

      // 👉 LOG PARA DEBUG: VAMOS DESCOBRIR O QUE ESTÁ INDO PRO RUST
      console.log("🚨 CORTES ENVIADOS PRO RUST:", cuts, "TIMELINE COMPLETA:", project.semanticTimeline);

      // 3. Pede para o usuário escolher a pasta de salvamento
      const defaultName = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_final.mp4`;
      const outputPath = await pickExportPath(defaultName);

      if (!outputPath) {
        setIsExporting(false);
        return; // Usuário cancelou a janela de salvamento
      }

      // 4. Chama o backend (Rust + FFmpeg)
      const result = await exportVideo({
        source_video_path: project.sourceVideo.filePath, // <-- Correção mantida aqui!
        cuts,
        output_path: outputPath,
        width: project.sourceVideo.width,
        height: project.sourceVideo.height,
        fps: project.sourceVideo.fps,
        quality,
      });

      if (!result) {
        throw new Error("Falha ao exportar vídeo. Verifique se o FFmpeg processou os cortes corretamente.");
      }

      setExportSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao exportar o projeto.");
    } finally {
      setIsExporting(false);
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

            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {exportSuccess && (
              <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p>Vídeo exportado com sucesso! Já pode conferir na pasta que você escolheu.</p>
              </div>
            )}

            <Button 
              size="lg" 
              className="w-full gap-2 text-base h-14" 
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando Cortes (Isso pode levar alguns minutos)...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Iniciar Exportação
                </>
              )}
            </Button>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}