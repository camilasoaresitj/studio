
import { EmployeeManagement } from '@/components/employee-management';

export default function RHPage() {
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Recursos Humanos</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Gerencie os dados dos funcionários, benefícios e premiações.
                </p>
            </header>
            <EmployeeManagement />
        </div>
    );
}
