import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Monitor, Cpu, HardDrive, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SETTING_SECTIONS = [
  {
    icon: Monitor,
    title: 'Interface',
    description: 'Aparência, idioma, atalhos de teclado',
    status: 'PLACEHOLDER — sem implementação real',
  },
  {
    icon: Cpu,
    title: 'Engine Local',
    description: 'Caminho para FFmpeg, whisper.cpp, modelo de transcrição',
    status: 'PLACEHOLDER — configurações de engine serão lidas pelo Tauri',
  },
  {
    icon: HardDrive,
    title: 'Armazenamento',
    description: 'Diretório de projetos, cache de proxy, limpeza automática',
    status: 'PLACEHOLDER — gerenciado pelo local-engine',
  },
  {
    icon: Globe,
    title: 'Cloud API',
    description: 'Autenticação, chave de API, limites de uso',
    status: 'PLACEHOLDER — requer cloud-api funcional',
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <div className="space-y-4">
        {SETTING_SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <section.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-status-warning font-mono bg-muted px-3 py-2 rounded">
                ⚠ {section.status}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
