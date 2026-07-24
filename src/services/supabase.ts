import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Fallback do projeto "master-rotas".
 *
 * Variaveis VITE_* sao embutidas no bundle em tempo de build, entao a chave
 * publishable ja seria publica de qualquer forma — deixa-la aqui NAO muda a
 * postura de seguranca, e evita que a PoC caia em modo local caso o ambiente
 * de deploy esteja sem as variaveis. As env vars, quando existem, tem
 * precedencia.
 *
 * Depois da demo: mover para env vars e fechar a RLS (hoje esta permissiva).
 */
const FALLBACK_URL = "https://xdjghxnfvemoqhqvttgi.supabase.co";
const FALLBACK_KEY = "sb_publishable_8t7y7blCudWg7AYLsCTf4Q_KeWcMoH4";

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;
const key =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  FALLBACK_KEY;

/**
 * Cliente único do app. Se as variáveis não estiverem definidas o app NÃO
 * quebra: cai para o modo local (localStorage), que é o comportamento antigo.
 * Numa demo, degradar é muito melhor do que tela branca.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 5 } },
      })
    : null;

export const hasRemote = Boolean(supabase);
