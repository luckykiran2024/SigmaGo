'use server';

import { createRequest, submitRequest, uploadAttachment } from '@/lib/db/requests';
import { createClient } from '@/lib/supabase/server';
import { getProfileForAuthUser } from '@/lib/db/users';
import { redirect } from 'next/navigation';

export async function submitNewRequest(
  formData: FormData,
  contentJson: any,
  tenant: string,
  approvalPath: Array<{ userId: string; role: 'GENERAL' | 'PARALLEL' | 'REFERENCE' }>
) {
  const subject = formData.get('subject') as string;
  const categoryId = formData.get('category') as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to create a request');
  }

  // Fetch the public.user record using our getProfileForAuthUser helper
  const publicUser = await getProfileForAuthUser(user.id, user.email || '');

  if (!publicUser) {
    throw new Error("User profile not found in public.users");
  }

  const ownerId = publicUser.id;

  if (!subject) {
    throw new Error("Subject is required");
  }

  if (!categoryId) {
    throw new Error("Please select a category");
  }

  if (!approvalPath || approvalPath.length === 0) {
    throw new Error("Approval path is empty");
  }

  // 1. Owner exclusion check
  const includesOwner = approvalPath.some(item => item.userId === ownerId);
  if (includesOwner) {
    throw new Error("You cannot include yourself in the approval path.");
  }

  // 2. Validate path constraints
  const hasDirect = approvalPath.some(item => item.role === 'GENERAL');
  if (!hasDirect) {
    throw new Error("At least one Direct Approver is required.");
  }

  const firstDirectIndex = approvalPath.findIndex(item => item.role === 'GENERAL');
  const firstParallelIndex = approvalPath.findIndex(item => item.role === 'PARALLEL');
  if (firstParallelIndex !== -1 && (firstDirectIndex === -1 || firstParallelIndex < firstDirectIndex)) {
    throw new Error("A Parallel Approver cannot be placed before the first Direct Approver.");
  }

  // 3. Map path items to database steps and auto-derive stageIndex and orderIndex
  let currentDirectStage = -1;
  const steps = approvalPath.map(item => {
    let stageIndex = 0;
    let orderIndex = 0;

    if (item.role === 'GENERAL') {
      currentDirectStage++;
      stageIndex = currentDirectStage;
      orderIndex = 0;
    } else if (item.role === 'PARALLEL') {
      stageIndex = Math.max(0, currentDirectStage);
      orderIndex = 1;
    } else if (item.role === 'REFERENCE') {
      stageIndex = 0;
      orderIndex = 2;
    }

    return {
      approverId: item.userId,
      type: item.role,
      orderIndex: orderIndex,
      stageIndex: stageIndex
    };
  });

  const request = await createRequest({
    tenantId: publicUser.tenant_id,
    ownerId: publicUser.id,
    categoryId: categoryId,
    subject: subject,
    bodyJson: contentJson || {},
    visibility: 'public',
    steps: steps
  });

  // Auto-submit the request to advance it from 'draft' to 'pending'
  await submitRequest(request.id, publicUser.id, publicUser.tenant_id);

  // Extract, validate and upload attachments
  const files = formData.getAll('attachments') as File[];
  const validFiles = files.filter((f) => f && f.name && f.size > 0);
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  for (const file of validFiles) {
    if (file.size > MAX_SIZE) {
      throw new Error(`File "${file.name}" exceeds the maximum allowed size of 50MB.`);
    }
  }

  if (validFiles.length > 0) {
    await Promise.all(
      validFiles.map(async (file) => {
        await uploadAttachment(file, request.id, publicUser.tenant_id, publicUser.id);
      })
    );
  }

  redirect(`/${tenant}/requests/${request.id}`);
}
