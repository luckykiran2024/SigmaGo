import { fetchTenantHealthMetricsAction } from './actions';
import Link from 'next/link';
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, Users, Key, LifeBuoy, Plus, ArrowUpRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlatformObservabilityPage() {
  const res = await fetchTenantHealthMetricsAction();
  const metrics = res.metrics || [];

  const totalTenants = metrics.length;
  const totalUsers = metrics.reduce((acc, m) => acc + m.userCount, 0);
  const totalGrants = metrics.reduce((acc, m) => acc + m.activeGrantsCount, 0);
  const totalOpenTickets = metrics.reduce((acc, m) => acc + m.openTicketsCount, 0);

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#334155] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-[#38BDF8]" />
            Tenant Observability & Health Matrix
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Real-time operational health, user volumes, database latencies, and active security grants across all onboarded tenant organizations.
          </p>
        </div>

        <Link
          href="/platform-admin/onboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#0F172A] font-bold text-xs shadow-md transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Onboard New Tenant</span>
        </Link>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-2">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-xs font-bold uppercase tracking-wider">Onboarded Tenants</span>
            <Activity className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <p className="text-2xl font-black text-white">{totalTenants}</p>
          <p className="text-[11px] text-[#94A3B8]">Multi-tenant isolation active</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-2">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Active Users</span>
            <Users className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="text-2xl font-black text-white">{totalUsers}</p>
          <p className="text-[11px] text-[#94A3B8]">Across all tenant directories</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-2">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-xs font-bold uppercase tracking-wider">Intelligence Grants</span>
            <Key className="w-4 h-4 text-[#6366F1]" />
          </div>
          <p className="text-2xl font-black text-white">{totalGrants}</p>
          <p className="text-[11px] text-[#94A3B8]">Decoupled policy access grants</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-2">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-xs font-bold uppercase tracking-wider">Open Support Tickets</span>
            <LifeBuoy className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <p className="text-2xl font-black text-white">{totalOpenTickets}</p>
          <p className="text-[11px] text-[#94A3B8]">Awaiting operator resolution</p>
        </div>
      </div>

      {/* Tenants Health Matrix Table */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            All Onboarded Tenants & Infrastructure Health
          </h2>
          <span className="text-xs font-medium text-[#94A3B8]">
            Auto-refreshed on dynamic query
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#E2E8F0]">
            <thead className="bg-[#0F172A] text-[#94A3B8] font-bold uppercase text-[10px] tracking-wider border-b border-[#334155]">
              <tr>
                <th className="py-3 px-4">Organization Name</th>
                <th className="py-3 px-4">Subdomain</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4 text-center">Users</th>
                <th className="py-3 px-4 text-center">DB Latency</th>
                <th className="py-3 px-4 text-center">Active Grants</th>
                <th className="py-3 px-4 text-center">Open Tickets</th>
                <th className="py-3 px-4 text-center">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {metrics.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-[#334155]/30 transition">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <span>{tenant.name}</span>
                    <a
                      href={`/${tenant.subdomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#38BDF8] hover:underline inline-flex items-center text-[10px]"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#38BDF8]">
                    {tenant.subdomain}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#334155] text-[#94A3B8] uppercase">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    {tenant.userCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className={tenant.dbLatencyMs < 200 ? 'text-green-400' : 'text-amber-400'}>
                      {tenant.dbLatencyMs} ms
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#6366F1]">
                    {tenant.activeGrantsCount}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    {tenant.openTicketsCount > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {tenant.openTicketsCount} tickets
                      </span>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {tenant.healthStatus === 'HEALTHY' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Healthy
                      </span>
                    )}
                    {tenant.healthStatus === 'DEGRADED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        Degraded
                      </span>
                    )}
                    {tenant.healthStatus === 'ATTENTION_REQUIRED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                        <ShieldAlert className="w-3 h-3" />
                        Attention Needed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
