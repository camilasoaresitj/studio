
'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isPast, isValid, differenceInDays, addDays } from 'date-fns';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter as DialogFooterComponent,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import type { Shipment, Milestone, TransshipmentDetail, DocumentStatus, QuoteCharge } from '@/lib/shipment';
import { cn } from '@/lib/utils';
import { 
    Calendar as CalendarIcon, 
    PlusCircle, 
    Save, 
    Trash2, 
    Circle, 
    CheckCircle, 
    Hourglass, 
    AlertTriangle, 
    Wallet, 
    Receipt, 
    Anchor, 
    CaseSensitive, 
    Weight, 
    Package, 
    Clock, 
    Ship, 
    GanttChart, 
    Link as LinkIcon, 
    RefreshCw, 
    Loader2, 
    Printer, 
    Upload, 
    FileCheck, 
    CircleDot, 
    FileText, 
    FileDown, 
    Edit, 
    ChevronsUpDown, 
    Check, 
    Map as MapIcon, 
    Calculator
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { runGetTrackingInfo, runGetCourierStatus, runGenerateClientInvoicePdf, runGenerateAgentInvoicePdf, runGenerateHblPdf, runUpdateShipmentInTracking, runGetRouteMap, addManualMilestone } from '@/app/actions';
import { addFinancialEntry, getFinancialEntries } from '@/lib/financials-data';
import { Checkbox } from './ui/checkbox';
import { getFees } from '@/lib/fees-data';
import type { Fee } from '@/lib/fees-data';
import { ScrollArea } from './ui/scroll-area';
import { exchangeRateService } from '@/services/exchange-rate-service';
import type { Partner } from '@/lib/partners-data';
import { getPartners } from '@/lib/partners-data';
import { getShipments } from '@/lib/shipment';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { BLDraftForm } from './bl-draft-form';
import { PartnerSelectionDialog } from './partner-selection-dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { ShipmentMap } from './shipment-map';


const containerDetailSchema = z.object({
  id: z.string(),
  number: z.string().min(1, "Obrigatório"),
  seal: z.string().min(1, "Obrigatório"),
  tare: z.string().min(1, "Obrigatório"),
  grossWeight: z.string().min(1, "Obrigatório"),
  volumes: z.string().optional(),
  measurement: z.string().optional(),
  freeTime: z.string().optional(),
  type: z.string().optional(),
});

const transshipmentDetailSchema = z.object({
  id: z.string(),
  port: z.string().min(1, "Obrigatório"),
  vessel: z.string().min(1, "Obrigatório"),
  etd: z.date().optional(),
  eta: z.date().optional(),
});

const quoteChargeSchemaForSheet = z.object({
    id: z.string(),
    name: z.string().min(1, 'Obrigatório'),
    type: z.string(),
    localPagamento: z.enum(['Origem', 'Frete', 'Destino']).optional(),
    cost: z.coerce.number().default(0),
    costCurrency: z.enum(['USD', 'BRL', 'EUR', 'JPY', 'CHF', 'GBP']),
    sale: z.coerce.number().default(0),
    saleCurrency: z.enum(['USD', 'BRL', 'EUR', 'JPY', 'CHF', 'GBP']),
    supplier: z.string().min(1, 'Obrigatório'),
    sacado: z.string().optional(),
    approvalStatus: z.enum(['aprovada', 'pendente', 'rejeitada']),
    justification: z.string().optional(),
    financialEntryId: z.string().nullable().optional(),
});

const blDraftSchemaForSheet = z.object({
  shipper: z.string().optional(),
  consignee: z.string().optional(),
  notify: z.string().optional(),
  marksAndNumbers: z.string().optional(),
  descriptionOfGoods: z.string().optional(),
  grossWeight: z.string().optional(),
  measurement: z.string().optional(),
  ncms: z.array(z.string()).optional(),
  due: z.string().optional(),
  blType: z.enum(['original', 'express']).optional(),
  containers: z.array(z.object({ 
        number: z.string(), 
        seal: z.string(),
        tare: z.string(),
        grossWeight: z.string(),
        volumes: z.string(),
        measurement: z.string(),
    })).optional()
}).optional();

const shipmentDetailsSchema = z.object({
  id: z.string(),
  carrier: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  masterBillNumber: z.string().optional(),
  houseBillNumber: z.string().optional(),
  bookingNumber: z.string().optional(),
  mblPrintingAtDestination: z.boolean().optional(),
  mblPrintingAuthDate: z.date().optional(),
  courier: z.enum(['DHL', 'UPS', 'FedEx', 'Outro']).optional(),
  courierNumber: z.string().optional(),
  courierLastStatus: z.string().optional(),
  etd: z.date().optional(),
  eta: z.date().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  collectionAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  dischargeTerminal: z.string().optional(),
  sharingLink: z.string().optional(),
  containers: z.array(containerDetailSchema).optional(),
  documents: z.array(z.object({
      name: z.string(),
      status: z.string(),
      fileName: z.string().optional(),
      uploadedAt: z.date().optional()
  })).optional(),
  charges: z.array(quoteChargeSchemaForSheet).optional(),
  commodityDescription: z.string().optional(),
  ncms: z.array(z.string()).optional(),
  netWeight: z.string().optional(),
  transshipments: z.array(transshipmentDetailSchema).optional(),
  notifyName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  ceMaster: z.string().optional(),
  ceHouse: z.string().optional(),
  manifesto: z.string().optional(),
  terminalRedestinacaoId: z.string().optional(),
  emptyPickupTerminalId: z.string().optional(),
  fullDeliveryTerminalId: z.string().optional(),
  custoArmazenagem: z.coerce.number().optional(),
  details: z.object({ // Add details object to the schema
    incoterm: z.string().optional(),
    cargo: z.string().optional(),
  }),
  blDraftData: blDraftSchemaForSheet, // Use the new partial schema
  shipper: z.any().optional(),
  consignee: z.any().optional(),
  agent: z.any().optional(),
  milestones: z.array(z.any()).optional(), // To allow editing details
});

type ShipmentDetailsFormData = z.infer<typeof shipmentDetailsSchema>;

// ... (rest of the component)
