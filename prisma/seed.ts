import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  
  // 1. Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'meridian' },
    update: {},
    create: {
      name: 'Meridian Tech',
      subdomain: 'meridian',
      plan: 'enterprise',
      theme_tokens: {
        primary: '#0E7C66',
        ink: '#16243A'
      }
    }
  });

  // 2. Create Users
  const ceo = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'ceo@meridiantech.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'ceo@meridiantech.local',
      name: 'Sarah Chief',
      role: 'SUPER_ADMIN'
    }
  });

  const manager = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: tenant.id, email: 'manager@meridiantech.local' } },
    update: {},
    create: {
      tenant_id: tenant.id,
      email: 'manager@meridiantech.local',
      name: 'John Manager',
      role: 'ADMIN'
    }
  });

  // 3. Create Categories
  await prisma.category.create({
    data: {
      tenant_id: tenant.id,
      name: 'Budget Approval',
      default_chain: [
        { type: 'DIRECT', approver_email: 'manager@meridiantech.local', order: 1 },
        { type: 'DIRECT', approver_email: 'ceo@meridiantech.local', order: 2 }
      ],
      default_sla_hours: 72
    }
  });

  console.log("Seeding complete! Tenant: Meridian Tech created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
