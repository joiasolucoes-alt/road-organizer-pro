import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_CREDENTIALS, adminSession } from "@/services/store";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Login administrativo — Master Rotas" },
      {
        name: "description",
        content: "Acesso ao painel administrativo do Master Rotas.",
      },
      { property: "og:title", content: "Login administrativo — Master Rotas" },
      {
        property: "og:description",
        content: "Painel logístico da Master Distribuidora.",
      },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (adminSession.get()) {
      void navigate({ to: "/admin" });
    }
  }, [navigate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const s = adminSession.login(username, password);
    if (!s) {
      setError("Usuário ou senha incorretos.");
      return;
    }
    toast.success(`Bem-vindo, ${s.username}`);
    void navigate({ to: "/admin" });
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary p-3 shadow">
            <AppLogo variant="mark" className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Painel administrativo
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Fazer login</h1>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full">
            <ShieldCheck className="mr-2 h-4 w-4" /> Entrar
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo: <code className="font-mono">{ADMIN_CREDENTIALS.username}</code> /{" "}
            <code className="font-mono">{ADMIN_CREDENTIALS.password}</code>
          </p>
        </form>
      </main>
    </div>
  );
}