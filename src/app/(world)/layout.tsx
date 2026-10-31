import { AppShell } from "@/components/shell/AppShell";

export default function WorldLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
