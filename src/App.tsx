/**
 * @module App
 * Entry point do FlowCut Desktop.
 *
 * Usa MemoryRouter em vez de BrowserRouter porque o app roda como
 * desktop nativo via Tauri — não há servidor HTTP, não há URLs reais.
 * O roteamento é inteiramente em memória, gerenciado pelo React.
 *
 * Quando Tauri for integrado, a navegação entre telas maiores
 * pode migrar para Tauri windows/webviews separadas.
 * Por ora, MemoryRouter é a abordagem correta e segura.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "./apps/desktop/pages/HomePage";
import ProjectEditorPage from "./apps/desktop/pages/ProjectEditorPage";
import SettingsPage from "./apps/desktop/pages/SettingsPage";
import ExportPage from "./apps/desktop/pages/ExportPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Desktop app — sem necessidade de refetch automático por foco de janela
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/*
        MemoryRouter: roteamento em memória, correto para apps Tauri/desktop.
        initialEntries define a rota inicial como "/".
        Não usar BrowserRouter (depende de servidor HTTP) nem HashRouter (hack para web).
      */}
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor/:projectId" element={<ProjectEditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
