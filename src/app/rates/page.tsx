import { RatesTable } from '@/components/rates-table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

export default function RatesPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Tarifas de Frete</h1>
        <p className="text-muted-foreground mt-2 text-lg">Consulte e compare tarifas de diferentes transportadoras.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Tabela de Tarifas</CardTitle>
          <CardDescription>
            Visualize abaixo as tarifas disponíveis para frete aéreo e marítimo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RatesTable />
        </CardContent>
      </Card>
    </div>
  );
}
