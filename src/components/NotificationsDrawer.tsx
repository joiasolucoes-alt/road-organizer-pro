import {
  Bell,
  CheckCheck,
  FileCheck2,
  KeyRound,
  PackagePlus,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fmtDateTime } from "@/lib/format";
import { store, useStore } from "@/services/store";
import type { NotificationKind } from "@/types";

const ICONS: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  lote_criado: PackagePlus,
  acesso_gerado: KeyRound,
  rota_confirmada: Truck,
  arquivo_gerado: FileCheck2,
  lote_excluido: Trash2,
};

export function NotificationsDrawer() {
  const notifications = useStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Sheet
      onOpenChange={(o) => {
        if (!o) store.markNotificationsRead();
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-primary-foreground transition-colors hover:bg-white/20"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--brand-lime)] px-1 text-[10px] font-bold text-primary">
              {unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notificações
          </SheetTitle>
          <SheetDescription>
            Eventos de importação, acesso e confirmação de rotas.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex justify-end px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => store.markNotificationsRead()}
            disabled={unread === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" /> Marcar tudo como lido
          </Button>
        </div>

        <ul className="mt-2 divide-y overflow-y-auto px-4 pb-6">
          {notifications.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              Sem notificações ainda.
            </li>
          )}
          {notifications.map((n) => {
            const Icon = ICONS[n.kind];
            return (
              <li
                key={n.id}
                className={
                  "flex items-start gap-3 py-3 " +
                  (n.read ? "opacity-70" : "")
                }
              >
                <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.description && (
                    <p className="text-xs text-muted-foreground">
                      {n.description}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {fmtDateTime(n.timestamp)}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}