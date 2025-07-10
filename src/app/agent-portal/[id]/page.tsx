
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { updateShipmentFromAgent } from '@/app/actions';

const agentUpdateSchema = z.object({
  estimatedReadinessDate: z.date().optional(),
  effectiveReadinessDate: z.date().optional(),
  bookingNumber: z.string().min(1, 'Booking number is required.'),
  vesselVoyage: z.string().min(1, 'Vessel/Voyage is required.'),
  etd: z.date({ required_error: 'ETD is required.' }),
  eta: z.date({ required_error: 'ETA is required.' }),
  docsCutoff: z.date().optional(),
  rateAgreed: z.string().min(1, 'Agreed rate is required.'),
});

type AgentUpdateFormData = z.infer<typeof agentUpdateSchema>;

export default function AgentPortalPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<AgentUpdateFormData>({
    resolver: zodResolver(agentUpdateSchema),
  });

  const onSubmit = async (data: AgentUpdateFormData) => {
    setIsSubmitting(true);
    const response = await updateShipmentFromAgent(params.id, data);
    
    if (response.success) {
        setIsSubmitted(true);
        toast({
            title: 'Booking Details Submitted!',
            description: 'Thank you for updating the shipment details.',
            className: 'bg-success text-success-foreground',
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: response.error,
        });
    }
    
    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-2xl text-center">
            <CardHeader>
                <CardTitle className="text-2xl">Thank You!</CardTitle>
                <CardDescription>The booking information has been successfully submitted and our team has been notified. You can now close this window.</CardDescription>
            </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Update Booking Details</CardTitle>
          <CardDescription>Please fill in the booking information for shipment ID: <span className="font-bold text-primary">{params.id}</span></CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="estimatedReadinessDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Estimated Readiness Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild><FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="effectiveReadinessDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Effective Readiness Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild><FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )}/>
                 <FormField control={form.control} name="bookingNumber" render={({ field }) => (
                    <FormItem><FormLabel>Booking Number</FormLabel><FormControl><Input placeholder="BKG12345" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="vesselVoyage" render={({ field }) => (
                    <FormItem><FormLabel>Vessel / Voyage</FormLabel><FormControl><Input placeholder="MSC LEO / 123A" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="etd" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>ETD (Estimated Time of Departure)</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild><FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="eta" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>ETA (Estimated Time of Arrival)</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild><FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )}/>
                 <FormField control={form.control} name="docsCutoff" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Docs Cut Off</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild><FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )}/>
                 <FormField control={form.control} name="rateAgreed" render={({ field }) => (
                    <FormItem><FormLabel>Rate Agreed</FormLabel><FormControl><Input placeholder="USD 2500" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                Submit Booking Details
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
