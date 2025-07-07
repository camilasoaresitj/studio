import { TaskForm } from '@/components/task-form';

export default function TasksPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Automação de Tarefas</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Analise e-mails para identificar tarefas operacionais ou financeiras e definir lembretes.
        </p>
      </header>
      <TaskForm />
    </div>
  );
}
