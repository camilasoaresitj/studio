import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Landmark } from 'lucide-react';

export default function FinanceiroPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard Financeiro</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Acompanhe faturas, contas a pagar, contas a receber e a saúde financeira da empresa.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Em Breve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64">
            <Landmark className="h-16 w-16 mb-4" />
            <p>O Dashboard Financeiro com gráficos e KPIs está em desenvolvimento.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
