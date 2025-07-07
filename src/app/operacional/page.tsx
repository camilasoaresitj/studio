import { TrackingStatus } from '@/components/tracking-status';
import { TaskForm } from '@/components/task-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function OperacionalPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Operacional</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Acompanhe suas cargas e gerencie tarefas operacionais.
        </p>
      </header>
      <Tabs defaultValue="tracking" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="tracking">Rastreamento de Carga</TabsTrigger>
          <TabsTrigger value="tasks">Automação de Tarefas</TabsTrigger>
        </TabsList>
        <TabsContent value="tracking" className="mt-6">
          <TrackingStatus />
        </TabsContent>
        <TabsContent value="tasks" className="mt-6">
          <TaskForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
