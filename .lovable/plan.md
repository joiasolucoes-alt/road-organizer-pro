
# Plano — encerrar a V0 do Master Rotas

Baseado no que já está implementado (landing, admin dashboard/import/lotes/detalhes, geração de link de acesso, fluxo completo do motorista com reordenação, justificativas, confirmação e geração simulada do arquivo Fusion), estes são os itens do prompt inicial que ainda não estão cobertos ou estão pela metade. Tudo continua mockado em `localStorage`, sem backend real.

## 1. Autenticação simples

**Admin (`/admin/login`)**
- Tela de login mockada (usuário/senha fixos ex. `admin` / `master`).
- Sessão em `localStorage` (`master-rotas:auth`).
- Layout `admin.tsx` passa a redirecionar para `/admin/login` se não houver sessão; botão "Sair" no header.

**Motorista (`/rota` — entrada por código)**
- Substituir o link fixo `RT28860` da landing por um fluxo em duas etapas:
  1. `/rota` → formulário mobile-first para digitar **código da rota** (`routeCode`) e **código de acesso** (`accessCode`).
  2. Ao validar contra `store.getBatchByRoute`, marca `master-rotas:driver-session` no `localStorage` com `routeCode` autorizado e navega para `/rota/$routeCode`.
- `rota.$routeCode.tsx` bloqueia acesso se a sessão não corresponder e reencaminha para `/rota`.

## 2. Gestão de motoristas e vínculo ao lote

- Nova página `/admin/motoristas` com CRUD mockado (nome, telefone, ativo).
- Persistir motoristas no store (`state.drivers`) em vez do array estático de `mocks/data.ts`.
- Em `admin.lotes.$batchId.tsx`, permitir **trocar o motorista** do lote via `Select` (só antes de "confirmado").
- Bloquear "Gerar acesso do motorista" se o lote não tiver motorista.

## 3. Múltiplos lotes reais

- Hoje `createBatchFromImport` sempre mantém um único lote mockado. Ajustar para **criar um novo `Batch` a cada importação** (novo `id`, `codigo`, `carga` incremental) reutilizando o dataset mockado como base.
- Adicionar ação `store.deleteBatch(id)` e botão "Excluir lote" (com confirmação) em `/admin/lotes/$batchId`, permitido só em `disponivel`/`em_edicao`.
- Filtro por status na lista `/admin/lotes`.

## 4. Visibilidade das alterações no admin

- Nova aba/rota `/admin/lotes/$batchId/alteracoes` mostrando, quando a rota estiver `confirmado` ou `arquivo_gerado`:
  - Comparativo "Ordem Fusion × Ordem Motorista" para praças e entregas (reaproveitando `ChangeIndicator`/`OrderColumn`).
  - Lista das justificativas registradas (`RouteChange.motivo`, `observacao`, timestamp).
  - Metadados: quem confirmou, quando, quando o arquivo foi gerado.
- Indicador na lista de lotes de "N alterações pendentes de revisão".
- Ação "Baixar arquivo Fusion" e "Baixar resumo JSON" também disponíveis para o admin (mesma lógica do motorista).

## 5. Notificações e histórico

- `store.notifications`: array append-only de eventos (`lote_criado`, `acesso_gerado`, `rota_confirmada`, `arquivo_gerado`).
- Sininho no header do admin com contador de não lidos e drawer `NotificationsDrawer`.
- Eventos disparados nas ações correspondentes do store.

## 6. Polimentos do fluxo do motorista

- Exigir motivo em ao menos 1 alteração antes de habilitar "Confirmar organização da rota" quando houver alterações (hoje é opcional visualmente mas o prompt inicial pedia justificativa).
- Botão "Restaurar ordem original" por praça e global, chamando novas ações `store.resetSquareOrder` / `store.resetAllOrders`.
- Bloquear reordenação depois de `confirmado` (SortableList em modo somente leitura + banner "Rota confirmada, edição bloqueada").
- Persistir a última rota acessada para reabrir direto (`/rota` mostra atalho "Continuar rota X").

## 7. Landing e utilidades gerais

- Landing: botão "Acessar como motorista" agora vai para `/rota` (form) em vez de link direto.
- Rodapé: link discreto "Redefinir dados de demonstração" chamando `store.reset()` com confirmação (útil para apresentação).
- Meta tags (`head()`) específicas em cada rota nova.

## 8. Testes manuais rápidos

Checklist ao final: login admin → importar → criar 2º lote → trocar motorista → gerar acesso → login do motorista pelo código → reordenar → justificar → confirmar → admin vê notificação → admin abre `/alteracoes` → gera arquivo Fusion → reset demo.

## Detalhes técnicos

- Novos arquivos:
  - `src/routes/admin.login.tsx`
  - `src/routes/admin.motoristas.tsx`
  - `src/routes/admin.lotes.$batchId.alteracoes.tsx`
  - `src/routes/rota.index.tsx` (formulário de entrada)
  - `src/components/NotificationsDrawer.tsx`
  - `src/components/DriverAccessForm.tsx`
- Alterações em `src/services/store.ts`: `drivers`, `notifications`, `deleteBatch`, `assignDriver`, `resetSquareOrder`, `resetAllOrders`, `createBatchFromImport` gerando novo id/codigo, session helpers (`adminSession`, `driverSession`).
- Alterações em `src/types/index.ts`: `Notification`, `Batch.arquivada?`, timestamps já existentes reaproveitados.
- Sem novas dependências; usa componentes shadcn já instalados (`Dialog`, `Drawer`, `Select`, `Input`, `Sheet`).

## Fora do escopo (mantido para pós-V0)

Integração real com Fusion, parsing efetivo de XLS, backend/Lovable Cloud, autenticação real, notificações por e-mail/WhatsApp, geração de PDF impressa. Ficam explicitamente adiados.
