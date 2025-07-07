import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, DollarSign, ClipboardList, Users2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ShipmentsChart } from '@/components/shipments-chart';
import { RecentShipments } from '@/components/recent-shipments';
import { ImportantTasks } from '@/components/important-tasks';

export default function Home() {

  const kpis = [
    { title: "Embarques Ativos", value: "1,254", change: "+12.5%", icon: <Truck className="h-6 w-6 text-muted-foreground" />, positive: true },
    { title: "Receita do Mês", value: "R$ 450.230", change: "+8.2%", icon: <DollarSign className="h-6 w-6 text-muted-foreground" />, positive: true },
    { title: "Tarefas Pendentes", value: "89", change: "-2.1%", icon: <ClipboardList className="h-6 w-6 text-muted-foreground" />, positive: false },
    { title: "Novos Leads (CRM)", value: "32", change: "+25%", icon: <Users2 className="h-6 w-6 text-muted-foreground" />, positive: true },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-8">
        <header className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard Operacional</h1>
          <p className="text-muted-foreground mt-2 text-lg">Visão geral do seu negócio de Freight Forwarding em tempo real.</p>
        </header>

        <div className="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(kpi => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                {kpi.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  { kpi.positive ? 
                    <ArrowUpRight className="h-4 w-4 mr-1 text-success" /> : 
                    <ArrowDownRight className="h-4 w-4 mr-1 text-destructive" /> 
                  }
                  <span className={kpi.positive ? 'text-success' : 'text-destructive'}>{kpi.change}</span>
                  <span className='ml-1'>em relação ao mês passado</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-3">
              <ShipmentsChart />
          </div>
          <div className="lg:col-span-2">
              <ImportantTasks />
          </div>
          <div className="lg:col-span-5">
              <RecentShipments />
          </div>
        </div>
      </main>
    </div>
  );
}
