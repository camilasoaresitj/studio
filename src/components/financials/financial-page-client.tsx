
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  DollarSign,
  Send,
  FileText,
  Banknote,
  PlusCircle,
  ShieldAlert,
  Loader2,
  Printer,
  Gavel,
  Check,
  Split,
  HandCoins,
} from 'lucide-react';
import { format, isPast, isToday, addDays } from 'date-fns';
import { FinancialEntry, BankAccount, PartialPayment, saveBankAccounts, saveFinancialEntries, getStoredFinancialEntries, getStoredBankAccounts } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { BankAccountDialog } from '@/components/financials/bank-account-form';
import { NfseGenerationDialog } from '@/components/financials/nfse-generation-dialog';
import type { Shipment } from '@/lib/shipment-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BankAccountStatementDialog } from '@/components/financials/bank-account-statement-dialog';
import { runGenerateClientInvoicePdf, runGenerateAgentInvoicePdf, runSendQuote, savePartnerAction, addFinancialEntriesAction, updateFinancialEntryAction } from '@/app/actions';
import { FinancialEntryImporter } from '@/components/financials/financial-entry-importer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinancialDetailsDialog } from '@/components/financials/financial-details-dialog';
import { Input } from '@/components/ui/input';
import { SendToLegalDialog } from '@/components/financials/send-to-legal-dialog';
import { getStoredShipments } from '@/lib/shipment-data';
import { FinancialEntryDialog } from '@/components/financials/financial-entry-dialog';
import { RenegotiationDialog } from '@/components/financials/renegotiation-dialog';
import { NfseConsulta } from '@/components/financials/nfse-consulta';
import { PartnersRegistry } from '@/components/partners-registry';
import { Partner, getStoredPartners } from '@/lib/partners-data';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { CommissionManagement } from '@/components/financials/commission-management';


type Status = 'Aberto' | 'Pago' | 'Vencido' | 'Parcialmente Pago' | 'Jurídico' | 'Pendente de Aprovação' | 'Renegociado';
const allStatuses: Status[] = ['Aberto', 'Vencido', 'Parcialmente Pago', 'Pago', 'Pendente de Aprovação'];


export function FinancialPageClient() {
    const router = useRouter();
    const [entries, setEntries] = useState<FinancialEntry[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [allShipments, setAllShipments] = useState<Shipment[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [entryToSettle, setEntryToSettle] = useState<FinancialEntry | null>(null);
    const [entryToRenegotiate, setEntryToRenegotiate] = useState<FinancialEntry | null>(null);
    const [settlementAccountId, setSettlementAccountId] = useState<string>('');
    const [settlementAmount, setSettlementAmount] = useState<string>('');
    const [exchangeRate, setExchangeRate] = useState<string>('');
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
    const [statementAccount, setStatementAccount] = useState<BankAccount | null>(null);
    const [nfseData, setNfseData<{ entry: FinancialEntry; shipment: Shipment } | null>({ entry: null, shipment: null });
    const [legalData, setLegalData<{ entry: FinancialEntry; shipment: Shipment } | null>({ entry: null, shipment: null });
    const [detailsEntry, setDetailsEntry(null);
    }
    
    const handleSendToLegal = async (entry: FinancialEntry) => {
        const response = await updateFinancialEntryAction({ ...entry, status: 'Jurídico', legalStatus: 'Fase Inicial' });
        if (response.success && response.data) {
            setEntries(response.data.entries);
            setAccounts(response.data.accounts);
            setLegalData(null);
        } else {
            toast({ variant: 'destructive', title: 'Erro ao mover para jurídico', description: response.error });
        }
    };

    const handleRenegotiation = async (installments: Omit<FinancialEntry, 'id'>[]) => {
        if (!entryToRenegotiate) return;
        
        // Mark original entry as Renegociado
        await updateFinancialEntryAction({ ...entryToRenegotiate, status: 'Renegociado' });
        
        // Add new installment entries
        const response = await addFinancialEntriesAction(installments);
        
        if(response.success && response.data) {
            setEntries(response.data);
            toast({
                title: 'Renegociação Salva!',
                description: `${installments.length} novas faturas de parcela foram criadas.`,
                className: 'bg-success text-success-foreground'
            });
            setEntryToRenegotiate(null);
        } else {
            toast({ variant: 'destructive', title: 'Erro ao salvar renegociação', description: response.error });
            // Revert original entry status if installments fail
            await updateFinancialEntryAction(entryToRenegotiate);
        }
    }

    const handleOpenSettleDialog = (entry: FinancialEntry) => {
        const balance = getEntryBalance(entry);
        setSettlementAmount(balance.toFixed(2));
        setSettlementAccountId('');
        setExchangeRate('');
        setEntryToSettle(entry);
    };

    const handleTextFilterChange = (filterName: keyof typeof textFilters, value: string) => {
        setTextFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const handlePartnerSaved = async (partnerToSave: Partner) => {
        const response = await savePartnerAction(partnerToSave);
        if (response.success && response.data) {
            setPartners(response.data);
            window.dispatchEvent(new Event('partnersUpdated'));
        } else {
            toast({ variant: 'destructive', title: 'Erro ao salvar parceiro', description: response.error });
        }
    };

    const getBalanceInBRL = (entry: FinancialEntry): number => {
        const balance = getEntryBalance(entry);
        if (entry.currency === 'BRL') return balance;
        
        const partner = partners.find(p => p.name === entry.partner);
        const agio = partner?.exchangeRateAgio ?? 0;
        const rate = (ptaxRates[entry.currency] || 0) * (1 + (agio / 100));
        
        return balance * rate;
    }

    const renderEntriesTable = (tableEntries: FinancialEntry[], isLegalTable = false) => (
        <div className="border rounded-lg">
            <Table>
            <TableHeader>
                <TableRow>
                {!isLegalTable && <TableHead className="w-10">
                    <Checkbox
                        checked={selectedRows.size > 0 && tableEntries.length > 0 && tableEntries.every(e => selectedRows.has(e.id))}
                        onCheckedChange={(checked) => {
                            if (checked) {
                                setSelectedRows(new Set(tableEntries.map(e => e.id)));
                            } else {
                                setSelectedRows(new Set());
                            }
                        }}
                        aria-label="Selecionar todos"
                    />
                </TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>Fatura</TableHead>
                <TableHead>{isLegalTable ? 'Nº Processo Judicial' : 'Processo LTI'}</TableHead>
                <TableHead className="w-40">Status</TableHead>
                {isLegalTable && <TableHead>Comentários</TableHead>}
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo (BRL)</TableHead>
                <TableHead className="text-center">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tableEntries.length > 0 ? tableEntries.map((entry) => {
                    const { status, variant } = getEntryStatus(entry);
                    const balanceBRL = getBalanceInBRL(entry);
                    return (
                        <TableRow key={entry.id} data-state={selectedRows.has(entry.id) && "selected"} className={isLegalTable ? 'cursor-pointer' : ''} onClick={() => isLegalTable && handleProcessClick(entry)}>
                            {!isLegalTable && <TableCell>
                                <Checkbox
                                    checked={selectedRows.has(entry.id)}
                                    onCheckedChange={() => toggleRowSelection(entry.id)}
                                    aria-label="Selecionar linha"
                                />
                            </TableCell>}
                            <TableCell>
                                <Badge variant={entry.type === 'credit' ? 'success' : 'destructive'} className="capitalize">{entry.type === 'credit' ? 'Crédito' : 'Débito'}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{entry.partner}</TableCell>
                            <TableCell>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleProcessClick(entry); }} className="text-muted-foreground hover:text-primary hover:underline">
                                    {entry.invoiceId}
                                </a>
                            </TableCell>
                            <TableCell>
                                {isLegalTable ? (
                                    <Input
                                        value={entry.processoJudicial || ''}
                                        onChange={(e) => handleLegalEntryUpdate(entry.id, 'processoJudicial', e.target.value)}
                                        placeholder="Adicionar nº"
                                        className="h-8 text-xs bg-transparent border-0"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleProcessClick(entry); }} className="text-muted-foreground hover:text-primary hover:underline">
                                        {entry.processId}
                                    </a>
                                )}
                            </TableCell>
                            <TableCell>
                                {isLegalTable ? (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Select
                                            value={entry.legalStatus}
                                            onValueChange={(value) => handleLegalEntryUpdate(entry.id, 'legalStatus', value)}
                                        >
                                            <SelectTrigger className="h-8 text-xs bg-transparent border-0"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Extrajudicial">Extrajudicial</SelectItem>
                                                <SelectItem value="Fase Inicial">Fase Inicial</SelectItem>
                                                <SelectItem value="Fase de Execução">Fase de Execução</SelectItem>
                                                <SelectItem value="Desconsideração da Personalidade Jurídica">Desconsideração PJ</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <Badge variant={variant} className="capitalize w-[130px] justify-center">{status}</Badge>
                                )}
                            </TableCell>
                            {isLegalTable && (
                                 <TableCell className="w-64">
                                    <Input
                                        value={entry.legalComments || ''}
                                        onChange={(e) => handleLegalEntryUpdate(entry.id, 'legalComments', e.target.value)}
                                        placeholder="Adicionar comentário..."
                                        className="h-8 text-xs bg-transparent border-0"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </TableCell>
                            )}
                            <TableCell className={cn(variant === 'destructive' && !isLegalTable && 'text-destructive font-bold')}>
                                {format(new Date(entry.dueDate), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                {entry.currency} {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                             <TableCell className={cn("text-right font-mono font-bold", entry.type === 'credit' ? 'text-success' : 'text-destructive')}>
                                R$ {balanceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isGenerating}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleProcessClick(entry)}>
                                            <FileText className="mr-2 h-4 w-4" /> Detalhes do Processo
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGenerateClientInvoicePdf(entry)} disabled={entry.type === 'debit'}>
                                            <Printer className="mr-2 h-4 w-4" /> Emitir Fatura (PDF)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGenerateAgentInvoicePdf(entry)} disabled={entry.type === 'credit'}>
                                            <Printer className="mr-2 h-4 w-4" /> Imprimir Invoice Agente
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleResendInvoice(entry)}>
                                            <Send className="mr-2 h-4 w-4" /> Reenviar Fatura
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleOpenSettleDialog(entry)} disabled={status === 'Pago' || status === 'Renegociado'}>
                                            <DollarSign className="mr-2 h-4 w-4" /> Baixar Pagamento
                                        </DropdownMenuItem>
                                        {entry.type === 'credit' && !isLegalTable && (
                                            <>
                                                <DropdownMenuItem onClick={() => handleOpenNfseDialog(entry)}>
                                                    <FileText className="mr-2 h-4 w-4" /> Emitir NF de Serviço
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setEntryToRenegotiate(entry)} className="text-blue-600 focus:text-blue-700">
                                                    <Split className="mr-2 h-4 w-4" /> Renegociar Dívida
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenLegalDialog(entry)} className="text-destructive focus:text-destructive">
                                                    <Gavel className="mr-2 h-4 w-4" /> Enviar para Jurídico
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                }) : (
                    <TableRow>
                        <TableCell colSpan={isLegalTable ? 8 : 10} className="h-24 text-center">Nenhum lançamento encontrado para este filtro.</TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
    );

    return (
    

      
        

            
                
                    
                        
                            Módulo Financeiro
                        
                        
                            Gerencie suas contas, faturas, notas fiscais e processos jurídicos.
                        
                    
                    
                        
                            
                                
                                    {account.name}
                                
                                
                            
                            
                                {account.currency} {account.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                
                                {account.bankName}
                            
                        
                    
                
                 
                    
                        
                            
                                Nova Conta
                            
                        
                    
                
            

            
                
                    Lançamentos
                    Comissões
                    Parceiros
                    Consulta NFS-e
                    Jurídico
                

                
                    
                        
                            
                                
                                    Lançamentos Financeiros
                                
                                
                                    Visualize e gerencie todas as suas contas a pagar e a receber.
                                
                            
                            
                                
                                    Nova Despesa
                                
                            
                        
                        
                            
                            
                            
                            
                            
                        
                        
                            Filtrar por Status:
                            {allStatuses.map((s) => (
                                
                                    
                                        
                                    
                                    
                                        {s}
                                    
                                
                            ))}
                        
                        {unifiedSettlementData && (
                            
                                
                                    {unifiedSettlementData.count} item(s) selecionado(s). Totais: 
                                    {Object.entries(unifiedSettlementData.totalsByCurrency).map(([currency, total]) => (
                                        
                                            {currency} {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        
                                    ))}
                                
                                
                                    
                                        
                                    
                                    Realizar Baixa Unificada
                                
                            
                        )}

                        {renderEntriesTable(filteredEntries)}
                    
                

                
                    
                        
                            
                                Cadastro de Parceiros
                                Gerencie seus clientes, fornecedores e agentes.
                            
                        
                        
                            
                        
                    
                

                
                    
                

                 
                     
                         
                             
                                 
                                     
                                         Processos em Jurídico
                                     
                                     Faturas que foram enviadas para cobrança judicial ou protesto.
                                 
                             
                             
                                 
                                     
                                 
                             
                         
                         
                              
                             
                             
                             
                         
                         {renderEntriesTable(juridicoEntries, true)}
                     
                 
            
      
        
            
                
                    
                        Confirmar Baixa de Pagamento
                        Fatura  | Saldo: .
                    
                
                
                    
                        
                            Valor do Pagamento
                            
                                0.00
                                
                            
                        
                        
                            Conta Bancária
                            
                                
                                    Selecione a conta...
                                
                                {accounts.map(account => (
                                    
                                        {account.name} ({account.currency})
                                    
                                ))}
                            
                        
                        {needsExchangeRate && (
                            
                                
                                     Taxa de Câmbio (Fatura  → Conta )
                                     
                                        Ex: 5.43
                                         
                                    
                                
                            
                        )}
                    
                
                
                    Cancelar
                    
                        Confirmar Baixa
                    
                
            
        

        
            
            
            
            
        
        
            
            
            
        

        
            account={statementAccount}
            entries={entries}
            isOpen={!!statementAccount}
            onClose={() => setStatementAccount(null)}
        

        
            
            
            
            onConfirm={handleRenegotiation}
        

        
            data={nfseData}
            isOpen={!!nfseData}
            onClose={() => setNfseData(null)}
        

        
            data={legalData}
            isOpen={!!legalData}
            onClose={() => setLegalData(null)}
            onConfirm={handleSendToLegal}
        
        
            entry={detailsEntry}
            isOpen={!!detailsEntry}
            onClose={handleCloseDetails}
            onReversePayment={handleReversePayment}
            findEntryForPayment={findEntryForPayment}
            findShipmentForEntry={findShipmentForEntry}
            onEntryUpdate={handleDetailsEntryUpdate}
        

    
  );
}

