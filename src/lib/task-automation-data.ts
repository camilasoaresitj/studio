
'use client';

import { z } from 'zod';

export const serviceConditionEnum = z.enum([
    'DESPACHO_ADUANEIRO',
    'SEGURO_INTERNACIONAL',
    'ENTREGA',
    'TRADING',
    'REDESTINACAO'
]);

export const taskAutomationRuleSchema = z.object({
  id: z.string().optional(),
  modal: z.enum([
    'IMPORTACAO_MARITIMA',
    'EXPORTACAO_MARITIMA',
    'IMPORTACAO_AEREA',
    'EXPORTACAO_AEREA',
    'TODOS'
  ]),
  days: z.coerce.number().int().min(0, "O número de dias deve ser positivo."),
  timing: z.enum(['ANTES', 'DEPOIS']),
  milestone: z.enum(['ETD', 'ETA']),
  action: z.enum(['ALERTA', 'EMAIL', 'DOCUMENTO', 'RELATORIO_STATUS']),
  recipient: z.enum([
    'CLIENTE',
    'AGENTE',
    'OPERACIONAL',
    'TRANSPORTADORA',
    'TERMINAL'
  ]),
  content: z.string().min(10, "O conteúdo deve ter pelo menos 10 caracteres."),
  serviceConditions: z.array(serviceConditionEnum).optional(),
  clientConditions: z.array(z.string()).optional().describe("Lista de nomes de clientes para aplicar a regra."),
});

export type TaskAutomationRule = z.infer<typeof taskAutomationRuleSchema>;

const TASK_AUTOMATION_STORAGE_KEY = 'cargaInteligente_task_automation_rules_v3';

const initialRules: TaskAutomationRule[] = [
  {
    id: 'rule-1',
    modal: 'IMPORTACAO_MARITIMA',
    days: 3,
    timing: 'ANTES',
    milestone: 'ETA',
    action: 'ALERTA',
    recipient: 'OPERACIONAL',
    content: 'Verificar com o cliente o status do numerário para desembaraço. Carga chegando em 3 dias.',
    serviceConditions: ['DESPACHO_ADUANEIRO'],
    clientConditions: [],
  },
  {
    id: 'rule-2',
    modal: 'EXPORTACAO_MARITIMA',
    days: 2,
    timing: 'ANTES',
    milestone: 'ETD',
    action: 'EMAIL',
    recipient: 'CLIENTE',
    content: 'Prezado cliente, seu embarque está programado para partir em 2 dias. Por favor, certifique-se que toda a documentação foi enviada. Obrigado!',
    serviceConditions: [],
    clientConditions: [],
  },
   {
    id: 'rule-3',
    modal: 'TODOS',
    days: 1,
    timing: 'DEPOIS',
    milestone: 'ETA',
    action: 'RELATORIO_STATUS',
    recipient: 'CLIENTE',
    content: 'Seu embarque chegou! Segue o status atualizado.',
    serviceConditions: [],
    clientConditions: ["Nexus Imports"],
  },
];

export function getTaskAutomationRules(): TaskAutomationRule[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(TASK_AUTOMATION_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(TASK_AUTOMATION_STORAGE_KEY, JSON.stringify(initialRules));
      return initialRules;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse task automation rules from localStorage", error);
    return [];
  }
}

export function saveTaskAutomationRules(rules: TaskAutomationRule[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(TASK_AUTOMATION_STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new Event('taskRulesUpdated'));
  } catch (error) {
    console.error("Failed to save task automation rules to localStorage", error);
  }
}
