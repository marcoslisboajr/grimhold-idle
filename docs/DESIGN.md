# Grimhold Idle — Documento de Design (v0.1)

MMO idle de navegador no universo de Grimhold.
Caçadas automáticas por menu e instâncias (estilo Tibia/Huntera) + profissões
de coleta e produção (estilo RuneScape/Melvor), com uma economia compartilhada
entre jogadores.

Status: rascunho. Itens marcados **[ABERTO]** ainda precisam de decisão.

---

## 1. Pilares

1. **Uma atividade por vez.** O personagem caça OU minera OU pesca. A escolha do
   que fazer agora é a principal decisão do jogador.
2. **Caçada e profissão dependem uma da outra.** Caçar consome comida e poções e
   solta materiais que só a caçada dá. A produção gera o equipamento que libera
   caçadas mais difíceis.
3. **Progresso offline.** Ao voltar, o jogador recebe o resumo do tempo fora.
4. **O servidor decide tudo.** O cliente pede ações e mostra resultados; XP,
   loot e combate são calculados no servidor.
5. **Escopo de dev solo.** Sem mundo aberto. Cada caçada é uma cena pequena.

---

## 2. Loop principal

```
Escolher atividade ──► Rodar (online ou offline) ──► Resumo (XP, loot, consumo)
        ▲                                                     │
        └──── Equipar / produzir / vender no mercado ◄────────┘
```

- **Caçada:** escolhe área → combate automático em ciclos → ganha XP de nível e
  loot, gasta comida/poções. Acaba quando os consumíveis acabam, a mochila
  enche ou o jogador para.
- **Coleta:** escolhe nó (ex.: "Veio de Ferro") → ganha um recurso a cada N
  segundos + XP da skill.
- **Produção:** escolhe receita → consome materiais do banco → gera itens + XP.

### Fila de ações [ABERTO]
Proposta: 1 slot no início, 2º slot desbloqueável. Exemplo: "minerar 200
ferros, depois forjar barras".

---

## 3. Vocações

Os heróis do Grimhold são **mestres/NPCs**, não personagens jogáveis. O
jogador cria o próprio personagem e escolhe uma vocação-base. No **nível 30**
escolhe uma de **3 promoções**, ensinadas pelos mestres.

| Vocação (MVP) | Papel | Promoções (mestre) |
|---|---|---|
| Guerreiro | Corpo a corpo, tanque | Paladino (Hellel) · Berserker (Gorak) · Senhor do Pavor (Kael'Vor) |
| Caçador | Distância, dano constante | Arqueira (Ifigenia) · Arqueira das Sombras (Zylvara) · Pistoleiro (Billy) |
| Arcanista | Magia, área, mana | Mago (Krash) · Bruxo (Sibilus) · Guardiã do Gelo (Serafyne) |
| Devoto | Cura, suporte próprio | Clériga (Alva) · Sacerdote (Hyo) · Inquisidor (Valdric) |

**Depois do MVP:** Druida (Vindimia, Aelindra), Ocultista (Ikan, Morrigan,
Veltharion), Ladino (Vex, Ixara).
**Malachar** é o vilão e chefe final.

### Adaptação das mecânicas do TD
- "A cada N ataques" continua igual.
- "Por onda" passa a ser "por monstro abatido" ou "por minuto de caçada".
- "Buff em aliados" passa a ser buff no próprio personagem/pet (grupo na fase 2).

---

## 4. Skills (profissões)

| Coleta (MVP) | Produção (MVP) | Depois |
|---|---|---|
| Mineração | Forja | Couraria / Costura |
| Lenhador | Marcenaria | Encantamento Rúnico (Veltharion) |
| Pesca | Culinária | Coleta de Almas |
| Herbalismo | Alquimia | |

- Níveis de skill de **1 a 99**, mesma tabela de XP para todas [ABERTO: curva].
- Cada nó/receita tem nível mínimo, tempo base, XP e saídas.
- O nível do personagem (combate) é separado das skills.

---

## 5. Mundo (MVP)

Monstros vêm do bestiário do Grimhold. Arte: Time Fantasy + `assets-pixel`.

| Região | Níveis | Caçadas | Coleta | Instância | Mestre |
|---|---|---|---|---|---|
| **Bastião de Grimhold** (hub) | — | — | — | — | Mestres de vocação, banco, mercado, forja, taverna |
| **Ravina Selvagem** | 1–20 | Margem do Rio · Toca dos Goblins · Território das Tribos | Lenhador, Pesca, Herbalismo, cobre/estanho | Pântano do Sapo-Rei (Kwa'Zul → Sapo-Rei) | Vindimia |
| **Catacumbas de Ashfen** | 20–40 | Cemitério Velho · Quartel de Ashfen · Tumba Profunda | Ferro, carvão, essências | Cripta do General (General de Ossos → Cérbero); exige chave forjada | Valdric |
| **Costa dos Afogados** | 40–60 | Praia dos Naufrágios · Recife Partido · Fossa Abissal | Peixes do abismo, cristais, algas | Coração da Maré (Mãe das Águas); Kraken secreto exige poção | Serafyne |

Regiões futuras: Colegiado Arcano, Dunas/Minotauros, A Fenda e o Ventre,
Torre de Malachar.

*Nomes e ajustes provisórios.*

---

## 6. Combate idle

Proposta de simulação no servidor, em **ciclos** (não em tempo real):

1. Um ciclo = encontrar um monstro da tabela da área e lutar até alguém cair.
2. Cada lado ataca no seu `attackSpeed`. Dano = `ataque − defesa`, com variação
   e chance de crítico. As passivas da promoção entram aqui.
3. O personagem come ou bebe poção automaticamente abaixo de X% de vida
   (configurável).
4. Monstro abatido → XP + rolagem na tabela de loot.
5. Personagem caído → a caçada para, perde parte do XP do nível [ABERTO:
   penalidade] e volta para o Bastião.

O cliente **anima** o resultado (sprites lutando) para dar sensação, mas os
números vêm do servidor.

### Offline
Ao reconectar, o servidor simula os ciclos do tempo fora, com teto de
**12 h** [ABERTO], usando a mesma função do combate online (sem atalhos
diferentes, para não divergir).

### Instâncias
- Chefe com mecânicas próprias e cooldown diário/semanal [ABERTO].
- Entrada pode exigir item produzido (chave, poção).
- MVP: solo. Grupo fica para a fase 2.

---

## 7. Itens e economia

- **Raridades:** comum, incomum, raro, épico, lendário.
- **Equipamento:** arma, escudo/off-hand, elmo, armadura, calças, botas, anel,
  amuleto. Requisitos de nível e vocação.
- **Visual:** o equipamento aparece no personagem montado com peças do Time
  Fantasy (paperdoll), sem nada desenhado por código.
- **Banco** com espaços limitados e ampliáveis; **mochila** limitada na caçada.
- **Mercado** entre jogadores com ordens de compra e venda e taxa sobre a venda
  (a taxa tira ouro de circulação).
- **Fontes de ouro:** vender para NPC (preço baixo), drops.
- **Saídas de ouro:** taxa do mercado, reparo [ABERTO], entrada de instância,
  receitas de NPC.

---

## 8. Social (MVP)

- Chat global + chat de região.
- Ranking por nível, por skill e por primeiro abate de chefe.
- Perfil público do personagem.
- Guildas, grupo, PvP: fase 2.

---

## 9. Arquitetura técnica

| Parte | Escolha |
|---|---|
| Cliente | React + TypeScript + Vite (mesma stack do Grimhold); cenas de caçada em Canvas 2D |
| Servidor | Node + TypeScript, `ws` para tempo real, HTTP para login e API |
| Dados | JSON em `shared/data/` (itens, monstros, áreas, receitas), lidos pelo cliente e pelo servidor |
| Banco | SQLite no início (Postgres se crescer) |
| Login | Convidado e e-mail no navegador; Steam ticket na versão Electron |
| Hospedagem | Oracle Cloud Always Free + Cloudflare na frente |
| Desktop | Electron depois, reaproveitando o pipeline do Grimhold |

### Estrutura do repositório (proposta)
```
grimhold-idle/
  client/     React + Vite
  server/     Node + ws + SQLite
  shared/     tipos, fórmulas de combate/XP, data/*.json
  docs/       este documento
```
As fórmulas ficam em `shared/` para o cliente poder mostrar estimativas
("~120 XP/h") com o mesmo código que o servidor usa.

---

## 10. Escopo do MVP

Entra:
- Criar conta (convidado) e personagem; 4 vocações; promoção no nível 30.
- Bastião + 3 regiões, 9 caçadas, 3 instâncias de chefe.
- 4 skills de coleta + 4 de produção.
- Banco, equipamento, mercado, chat global, ranking.
- Progresso offline.

Fica de fora:
- Grupos, guildas, PvP, Ladino/Druida/Ocultista, regiões extras, Steam/Android.

---

## 11. Marcos

1. **Fundação:** monorepo, dados em JSON, login de convidado, salvar
   personagem no SQLite.
2. **Uma skill de ponta a ponta:** Mineração online e offline, com UI.
3. **Caçada:** combate idle simulado + 1 área + loot + morte.
4. **Produção e equipamento:** Forja, banco, equipar.
5. **Conteúdo do MVP:** as 3 regiões, 8 skills, 4 vocações, instâncias.
6. **Social:** mercado, chat, ranking.
7. **Online de verdade:** deploy na Oracle + Cloudflare, teste com amigos.

---

## 12. Decisões em aberto

- [ ] Fila de ações: quantos slots?
- [ ] Curva de XP (tipo RuneScape ou mais rápida?)
- [ ] Penalidade de morte
- [ ] Teto do progresso offline
- [ ] Cooldown das instâncias
- [ ] Reparo de equipamento como saída de ouro?
- [ ] Monetização (nenhuma, cosméticos, ou pago na Steam?) — afeta a licença
      dos assets Time Fantasy (conferir os termos antes de qualquer venda)
- [ ] Nome final do jogo
