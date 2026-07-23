import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

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
