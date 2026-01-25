# Projeto: Agenda de Blocos BH

## Objetivo
Web app (Next.js/React) para blocos de carnaval de BH importados de CSV.
Usuário marca status (talvez/vou/certeza), vê em calendário com sobreposição (estilo Outlook),
cria blocos próprios, edita “para si” blocos oficiais (override), e pode compartilhar uma
página pública "minha agenda" (somente logado). UI limpa, responsiva, sem "cardwall" e sem emojis.

## Fonte de dados
Arquivo: data/blocos_bh.csv
Colunas esperadas incluem: DATA, HORÁRIO, BLOCO, LOCAL..., RITMOS, TAMANHO PÚBLICO, LGBT.
- HORÁRIO vem como "09h", "09h30" ou "A divulgar".
- Só existe horário de início. Duração padrão: 180 minutos (configurável).
- "A divulgar" => sem start_time.

## Regras de produto
- Sem login: salvar status/overrides local (localStorage/IndexedDB) e funcionar.
- Com login (Supabase): sincronizar status/overrides/custom.
- Compartilhamento: apenas logado cria um slug público. Página pública mostra eventos com status 'vou' e 'certeza' por padrão.
- Usuário pode criar blocos próprios (custom) e definir horário/duração.
- Usuário pode editar para si um bloco oficial (override) sem alterar o base.

## UI/UX (não parecer IA)
- Priorizar layout de lista + drawer/bottom-sheet para detalhes.
- Evitar excesso de cards. No máximo listas com linhas/rows e separators.
- Tipografia e espaçamento consistentes. Sem emojis.
- Mobile: modo lista/agenda por padrão; calendário grade é opcional.

## Tech stack
- Next.js App Router + TypeScript
- Tailwind + shadcn/ui
- FullCalendar (timeGridDay/week + list)
- Supabase Auth + Postgres (RLS)
- TanStack Query + Zustand
- Zod (validação)

## Critérios de aceite
1) Importa CSV e popula tabela events_base.
2) Mostra eventos em calendário com sobreposição (desktop) e lista (mobile).
3) Status talvez/vou/certeza funciona offline e sincroniza quando logado.
4) Criação de evento custom e override de evento base.
5) Página pública /agenda/[slug] disponível após criar share e export ICS.
