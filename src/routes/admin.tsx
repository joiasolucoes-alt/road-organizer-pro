import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  History,
  LayoutDashboard,
  Package,
  Settings,
  Upload,
  Users,
  ArrowLeft,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, active: true },
  { to: "/admin/import", label: "Importar rota", icon: Upload, active: true },
  { to: "/admin/lotes", label: "Lotes", icon: Package, active: true },
  { to: "#", label: "Motoristas", icon: Users, active: false },
  { to: "#", label: "Histórico", icon: History, active: false },
  { to: "#", label: "Configurações", icon: Settings, active: false },
] as const;

function AdminLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-primary text-primary-foreground md:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <div className="rounded-lg bg-white/10 p-1.5">
            <AppLogo variant="mark" className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Master Rotas</p>
            <p className="truncate text-[10px] uppercase tracking-wider text-primary-foreground/60">
              Painel administrativo
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const isActive =
              item.active &&
              (item.to === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.to));
            const baseClass = cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-[color:var(--brand-lime)]/25 text-[color:var(--brand-lime)]"
                : item.active
                  ? "text-primary-foreground/80 hover:bg-white/10"
                  : "cursor-not-allowed text-primary-foreground/40",
            );
            const inner = (
              <>
                <item.icon className="h-4 w-4" />
                <span className="flex-1 truncate">{item.label}</span>
                {!item.active && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase">
                    em breve
                  </span>
                )}
              </>
            );
            if (!item.active) {
              return (
                <div key={item.label} className={baseClass} aria-disabled>
                  {inner}
                </div>
              );
            }
            return (
              <Link key={item.label} to={item.to} className={baseClass}>
                {inner}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3 text-[11px] text-primary-foreground/60">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded px-2 py-1 hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao início
          </Link>
          <p className="mt-2">Master Distribuidora · v0</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card/80 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary p-1.5">
              <AppLogo variant="mark" className="h-5 w-5" />
            </div>
            <span className="font-bold">Master Rotas</span>
          </div>
          <Link
            to="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Sair
          </Link>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-3 py-2 md:hidden">
          {NAV.filter((n) => n.active).map((item) => {
            const isActive =
              item.to === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}