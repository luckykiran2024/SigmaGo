import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfileForAuthUser } from '@/lib/db/users';

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  const isAdmin = profile && (
    profile.role === 'admin' ||
    profile.role === 'super_admin' ||
    profile.role === 'ADMIN' ||
    profile.role === 'SUPER_ADMIN'
  );

  const signOut = async () => {
    'use server';
    const supabaseClient = await createClient();
    await supabaseClient.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col font-body">
      {/* Premium Header/Navbar */}
      <header className="bg-white border-b border-gray-100 shadow-sm z-30 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Left Section: Logo & Nav */}
            <div className="flex items-center gap-8">
              <Link href={`/${resolvedParams.tenant}`} className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center shadow-sm shadow-ink/10 group-hover:scale-105 transition">
                  <span className="text-white font-display font-extrabold text-xs tracking-tight">SG</span>
                </div>
                <span className="font-display text-xl font-extrabold text-ink tracking-tight">
                  Sigma<span className="text-accent font-extrabold">Go</span>
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-6">
                <Link
                  href={`/${resolvedParams.tenant}`}
                  className="text-sm font-semibold text-ink hover:text-accent transition"
                >
                  Dashboard
                </Link>
                <Link
                  href={`/${resolvedParams.tenant}/approvals`}
                  className="text-sm font-semibold text-gray-500 hover:text-accent transition"
                >
                  Approvals
                </Link>
                <Link
                  href={`/${resolvedParams.tenant}/requests/new`}
                  className="text-sm font-semibold text-gray-500 hover:text-accent transition"
                >
                  New Request
                </Link>
                {isAdmin && (
                  <>
                    <Link
                      href={`/${resolvedParams.tenant}/admin/workflows`}
                      className="text-sm font-semibold text-gray-500 hover:text-accent transition"
                    >
                      Workflows
                    </Link>
                    <Link
                      href={`/${resolvedParams.tenant}/admin/archived`}
                      className="text-sm font-semibold text-gray-500 hover:text-accent transition"
                    >
                      Archived
                    </Link>
                    <Link
                      href={`/${resolvedParams.tenant}/admin/org`}
                      className="text-sm font-semibold text-gray-500 hover:text-accent transition"
                    >
                      Org Admin
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Right Section: User & Sign Out */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-gray-400 font-medium">Signed in as</span>
                <span className="text-sm font-semibold text-ink">{user.email}</span>
              </div>
              
              <div className="w-px h-8 bg-gray-200 hidden sm:block" />

              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition shadow-sm"
                >
                  Sign Out
                </button>
              </form>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
