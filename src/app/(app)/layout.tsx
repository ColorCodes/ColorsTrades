import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={{ email: user.email ?? "", name: user.name ?? null }}>{children}</AppShell>;
}
