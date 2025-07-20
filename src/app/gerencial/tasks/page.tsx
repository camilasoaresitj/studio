
import { TaskForm } from '@/components/task-form';

export default function TasksPage() {
    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Monitor de Tarefas com IA</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Cole o conteúdo de um e-mail para que a IA identifique tarefas operacionais ou financeiras.
                </p>
            </header>
            <TaskForm />
        </div>
    );
}
