import { requireProfile } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const profile = await requireProfile();

  return (
    <DashboardShell profile={{ fullName: profile.full_name, role: profile.role }}>
      {children}
    </DashboardShell>
  );
}
