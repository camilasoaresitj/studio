import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function DemurragePage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Controle de Demurrage & Detention</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Monitore os prazos e evite custos extras com contêineres.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Em Breve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64">
            <Clock className="h-16 w-16 mb-4" />
            <p>O módulo de Demurrage & Detention está em desenvolvimento.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
