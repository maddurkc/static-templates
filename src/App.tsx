import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Sections from "./pages/Sections";
import Templates from "./pages/Templates";
import TemplateEditor from "./pages/TemplateEditor";
import RunTemplates from "./pages/RunTemplates";
import DatabaseSchema from "./pages/DatabaseSchema";
import ERDiagram from "./pages/ERDiagram";
import MigrationGenerator from "./pages/MigrationGenerator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <header className="h-14 border-b bg-card/50 backdrop-blur-sm flex items-center px-4 sticky top-0 z-10">
                <SidebarTrigger className="mr-4" />
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
                  <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    PageBuilder
                  </span>
                </div>
              </header>
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/sections" element={<Sections />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/templates/editor" element={<TemplateEditor />} />
                  <Route path="/run-templates" element={<RunTemplates />} />
                  <Route path="/database-schema" element={<DatabaseSchema />} />
                  <Route path="/er-diagram" element={<ERDiagram />} />
                  <Route path="/migrations" element={<MigrationGenerator />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
