import { redirect } from 'next/navigation';

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/${resolvedParams.tenant}/admin/org`);
}
