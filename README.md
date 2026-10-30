# Grimhold Idle

MMO idle de navegador em dark fantasy, **em produção** em [grimholdidle.com](https://grimholdidle.com). Vocações, profissões no estilo RuneScape, caçadas, chefes globais a cada duas horas, mercado entre jogadores e chat.

> **Vitrine de código.** Este repositório mostra o código do jogo. As artes, ícones, sprites e músicas são de pacotes licenciados (veja [CREDITS.md](CREDITS.md)) e **não estão incluídos**, então o cliente roda sem imagens. O desenvolvimento acontece num repositório privado (~890 commits desde outubro de 2026).

## Stack

- **TypeScript** de ponta a ponta, em monorepo com npm workspaces (`shared`, `server`, `client`)
- **Servidor:** Node 24, HTTP + WebSocket, SQLite embutido do Node. O servidor é autoritativo: o cliente só pede ações.
- **Cliente:** React 18 + Vite
- **Infra:** Oracle Cloud Always Free, Caddy (HTTPS), Cloudflare DNS; deploy e rollback por script (`scripts/deploy.sh`, `scripts/rollback.sh`)

## Destaques técnicos

- Protocolo de WebSocket tipado e validado em `shared/`, usado pelos dois lados
- Contas de convidado que viram contas registradas, login e recuperação de senha por e-mail
- Tick de servidor para combate idle, coleta e chefes globais com janela de tempo
- **142 arquivos de teste** no servidor (`npm test`), mais scripts de simulação e balanceamento em `server/scripts/` (XP, drops, covis, poções)
- Dados do jogo (itens, monstros, caçadas, drops) em JSON em `shared/data/`, gerados e auditados por script

## Rodar

Requisito: Node 24+.

```bash
npm install
npm run dev     # servidor em :3001, cliente em :5173
npm test
npm run typecheck
```

## Estrutura

| Pasta | O que tem |
|---|---|
| `shared/` | Tipos, protocolo, validações e dados do jogo |
| `server/` | API, WebSocket, regras do jogo e banco |
| `client/` | Interface em React |
| `scripts/` | Deploy, rollback e ferramentas de dados |

Design do jogo: [docs/DESIGN.md](docs/DESIGN.md).

---
Feito por Marcos Antonio Lisboa Junior · Elzerath Studio
