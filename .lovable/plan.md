# Reformular a organização de entregas (motorista)

## Problema
Hoje, ao entrar em uma praça e "Organizar entregas", cada entrega ocupa um card grande com peso, valor, itens, endereço completo, badges e botão de detalhes. A lista fica muito longa verticalmente, o usuário rola bastante e perde a noção da sequência — tanto no celular quanto no desktop.

## Objetivo
Deixar a reordenação rápida e visual: a lista em si vira compacta (uma linha por entrega, tudo essencial visível), e os detalhes/ações ficam a um toque de distância. No desktop, aproveitar o espaço horizontal.

## Mudanças

### 1. Novo componente `DeliveryReorderRow` (linha compacta)
Substitui o `DeliveryCard` grande dentro da tela de reordenação. Uma linha por entrega mostrando apenas:
- número da posição (badge grande à esquerda, mesma cor do primary)
- nome do cliente (truncado) + bairro/rua curta em segunda linha
- pill de peso e pill de valor (compactos, à direita no desktop; abaixo no mobile)
- indicador de "ordem alterada" (seta pequena, sem card grande)
- indicador de ocorrência (ícone pequeno vermelho se houver)

Sem grid de 3 mini-stats, sem separador, sem botão "Ver detalhes" ocupando linha inteira, sem badge de "endereço confirmado".

Altura-alvo: ~64px no mobile, ~56px no desktop (vs. ~260px hoje).

### 2. Ações por linha via toque/clique
- Tocar na linha (área do texto) → abre o `DeliveryDetailsDrawer` já existente com todos os detalhes (endereço completo, itens, valor, peso, confirmação de endereço, ocorrência).
- Botão "⋯" pequeno à direita → dropdown com "Registrar ocorrência" (as 3 opções atuais) e "Limpar ocorrência".
- Handle de arraste (`GripVertical`) e setas ↑/↓ continuam vindo do `SortableList` (sem mudanças no componente sortable em si).

### 3. Layout responsivo da página
- Mobile: lista em coluna única, linhas compactas, barra fixa inferior "Voltar / Salvar sequência" mantida.
- Desktop (≥ lg): 2 colunas — coluna esquerda com a lista compacta ocupando ~60%, coluna direita fixa (sticky) com um resumo da praça (nome, data, cidade, nº de entregas, peso total, valor total, alertas de sequência alterada, botão "Restaurar sequência original", CTA "Salvar sequência").
- O aviso "sequência alterada" e o botão "restaurar" saem do topo da lista e vão para o painel lateral no desktop; no mobile permanecem acima da lista, mas mais discretos (linha única).

### 4. Cabeçalho da praça enxuto
Reduzir o header atual (título + linha meta + parágrafo instrucional) para: título + linha meta compacta. O parágrafo "Arraste os cards ou use as setas…" vira uma tooltip/hint pequena ao lado do primeiro item, apenas na primeira visita à praça (usando estado local; sem persistência).

### 5. Manter comportamento
- Reordenação, ocorrências, restaurar sequência, modo somente-leitura (`locked`) e detecção de `changed` seguem a mesma lógica atual — só a apresentação muda.
- `DeliveryCard` grande continua existindo (é usado em outros contextos como a visão confirmada); não será removido.

## Arquivos afetados
- Novo: `src/components/DeliveryReorderRow.tsx`
- Editar: `src/routes/rota.$routeCode.pracas.$squareId.tsx` (usar a nova linha, adicionar layout 2-col no desktop, sidebar com resumo)
- Sem mudanças em: `SortableList`, `DeliveryCard`, `DeliveryDetailsDrawer`, store, tipos.

## Fora de escopo
- Alterar a tela de reordenação de praças (essa não foi citada).
- Backend, XLS, tipos ou store.
