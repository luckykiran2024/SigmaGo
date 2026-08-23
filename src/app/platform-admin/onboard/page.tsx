import OnboardTenantForm from './OnboardTenantForm';
import { PlusCircle } from 'lucide-react';

export default function OnboardTenantPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      <div className="border-b border-[#334155] pb-6">
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <PlusCircle className="w-6 h-6 text-[#10B981]" />
          Onboard New Organization Tenant
        </h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          Provision an isolated tenant workspace, assign subdomain routing, and setup initial tenant admin credentials.
        </p>
      </div>

      <OnboardTenantForm />
    </div>
  );
}
