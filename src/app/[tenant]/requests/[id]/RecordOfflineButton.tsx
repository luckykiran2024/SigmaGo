'use client';

import { useState } from 'react';
import RecordOfflineModal from '@/components/ui/RecordOfflineModal';
import { ShieldAlert } from 'lucide-react';

export default function RecordOfflineButton({
  tenant,
  requestId,
  stepId,
  approverName
}: {
  tenant: string;
  requestId: string;
  stepId: string;
  approverName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg shadow-xs transition"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
        Record Offline
      </button>

      <RecordOfflineModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        stepId={stepId}
        approverName={approverName}
        requestId={requestId}
        tenant={tenant}
      />
    </>
  );
}
