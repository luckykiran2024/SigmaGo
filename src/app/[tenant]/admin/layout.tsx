import AdminSidebar from '@/components/ui/AdminSidebar';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;

  return (
    <div className="flex flex-col md:flex-row gap-8 font-body min-h-[500px]">
      {/* Client Sidebar Component */}
      <AdminSidebar tenant={resolvedParams.tenant} />

      {/* Main Admin Subpage Content Container */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
