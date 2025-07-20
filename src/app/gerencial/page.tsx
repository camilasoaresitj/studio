
'use client';

import { ShipmentsChart } from '@/components/shipments-chart';
import { ImportantTasks } from '@/components/important-tasks';
import { RecentShipments } from '@/components/recent-shipments';
import { ApprovalsPanel } from '@/components/approvals-panel';

export default function GerencialPage() {

  return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <ShipmentsChart />
                <RecentShipments />
            </div>
            <div className="lg:col-span-1 space-y-8">
                <ApprovalsPanel />
                <ImportantTasks />
            </div>
        </div>
  );
}
