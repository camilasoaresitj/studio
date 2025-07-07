'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartTooltipContent, ChartContainer, ChartConfig } from '@/components/ui/chart'

const chartData = [
  { month: 'Jan', shipments: 186 },
  { month: 'Fev', shipments: 305 },
  { month: 'Mar', shipments: 237 },
  { month: 'Abr', shipments: 273 },
  { month: 'Mai', shipments: 209 },
  { month: 'Jun', shipments: 289 },
]

const chartConfig = {
  shipments: {
    label: 'Embarques',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig

export function ShipmentsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Geral de Embarques</CardTitle>
        <CardDescription>Volume de embarques nos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis />
                <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="shipments" fill="var(--color-shipments)" radius={8} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
