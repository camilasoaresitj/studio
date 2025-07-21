import AppLayout from '@/app/gerencial/layout';

export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
