
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DeclaracaoImportacaoPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Declaração de Importação</h1>

      <Card>
        <CardContent className="grid grid-cols-3 gap-4 p-4">
          <div>
            <Label htmlFor="numero-processo">Nº do Processo</Label>
            <Input id="numero-processo" placeholder="ZY2505191" />
          </div>
          <div>
            <Label htmlFor="identificacao-di">Identificação DI</Label>
            <Input id="identificacao-di" placeholder="BIS0102825" />
          </div>
          <div>
            <Label htmlFor="cnpj">CNPJ Importador</Label>
            <Input id="cnpj" placeholder="23389756000170" />
          </div>

          <div>
            <Label htmlFor="data-embarque">Data de Embarque</Label>
            <Input id="data-embarque" type="date" />
          </div>
          <div>
            <Label htmlFor="data-chegada">Previsão de Chegada</Label>
            <Input id="data-chegada" type="date" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
