
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Save } from 'lucide-react';
import { getProfitSettings, saveProfitSettings, ProfitSetting, profitSettingSchema } from '@/lib/profit-settings-data';

const profitSettingsFormSchema = z.object({
  settings: z.array(profitSettingSchema),
});

type ProfitSettingsFormData = z.infer<typeof profitSettingsFormSchema>;

export function ProfitSettings() {
  const [initialData, setInitialData] = useState<ProfitSetting[]>([]);
  const { toast } = useToast();

  const form = useForm<ProfitSettingsFormData>({
    resolver: zodResolver(profitSettingsFormSchema),
  });

  useEffect(() => {
    const settings = getProfitSettings();
    setInitialData(settings);
    form.reset({ settings });
  }, [form]);

  const onSubmit = (data: ProfitSettingsFormData) => {
    saveProfitSettings(data.settings);
    toast({
      title: 'Configurações de Lucro Salvas!',
      description: 'As margens de lucro padrão foram atualizadas.',
      className: 'bg-success text-success-foreground',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Configuração de Lucro (Portal do Cliente)
        </CardTitle>
        <CardDescription>
          Defina o lucro padrão a ser adicionado sobre o custo do frete nas cotações geradas pelo portal do cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {initialData.map((setting, index) => (
                <div key={setting.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-3 border rounded-lg">
                  <FormField
                    control={form.control}
                    name={`settings.${index}.modal`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modal</FormLabel>
                        <Input {...field} disabled className="bg-muted/50" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`settings.${index}.unit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Input {...field} disabled className="bg-muted/50" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`settings.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor do Lucro</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`settings.${index}.currency`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moeda</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="BRL">BRL</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
