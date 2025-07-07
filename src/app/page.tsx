import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReceiptText, MapPin, Users, ClipboardCheck, ArrowRight } from 'lucide-react';

export default function Home() {
  const features = [
    {
      title: "Consulta de Tarifas",
      description: "Acesse tarifas atualizadas de companhias marítimas e aéreas.",
      icon: <ReceiptText className="w-8 h-8 text-primary" />,
      href: "/rates",
      cta: "Consultar Tarifas"
    },
    {
      title: "Rastreamento de Carga",
      description: "Monitore a localização e o status de suas cargas em tempo real.",
      icon: <MapPin className="w-8 h-8 text-primary" />,
      href: "/tracking",
      cta: "Rastrear Carga"
    },
    {
      title: "CRM Automático",
      description: "Crie contatos e oportunidades no CRM automaticamente a partir de e-mails.",
      icon: <Users className="w-8 h-8 text-primary" />,
      href: "/crm",
      cta: "Usar CRM"
    },
    {
      title: "Automação de Tarefas",
      description: "Identifique e gerencie tarefas operacionais e financeiras via e-mail.",
      icon: <ClipboardCheck className="w-8 h-8 text-primary" />,
      href: "/tasks",
      cta: "Automatizar Tarefas"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Bem-vindo ao CargaInteligente</h1>
            <p className="text-muted-foreground mt-2 text-lg">Sua plataforma completa para gerenciamento de fretes. Otimize sua logística com nossas ferramentas inteligentes.</p>
          </header>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center gap-4">
                  {feature.icon}
                  <div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription className="mt-1">{feature.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow flex items-end">
                   <Link href={feature.href} className="w-full">
                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                      {feature.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
