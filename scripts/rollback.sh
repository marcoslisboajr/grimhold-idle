#!/usr/bin/env bash
# Volta o servidor para a versão anterior em segundos, sem compilar nada: o deploy guarda a
# versão que estava no ar em /home/grimhold/app.old; aqui ela volta para app e a que deu
# problema fica em app.broken (para investigar). O banco não volta: o que os jogadores
# ganharam fica (a versão antiga mostra item que não conhece sem ícone, sem quebrar).
# Quem estava num covil da aba Chefes (que a versão antiga não tem) volta para o Bastião.
# Uso: bash scripts/rollback.sh   (HOST e KEY podem vir do ambiente)
set -euo pipefail
HOST="${HOST:?defina HOST=usuario@servidor}"
KEY="${KEY:-$HOME/.ssh/id_ed25519}"
SSH=(ssh -i "$KEY" -o BatchMode=yes "$HOST")

tmp="$(mktemp -d)"
cat > "$tmp/rollback_db.cjs" <<'JS'
// Tira dos covis (aba Chefes) e do Limiar dos Mortos (limbo) quem estava lá: a versão antiga não conhece esses lugares.
// As peças guardadas pelo Ceifador (reaper_items) ficam no banco; a versão antiga só não as mostra.
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/home/grimhold/grimhold.db');
const r = db
  .prepare(`DELETE FROM activities WHERE skill = 'combat' AND node IN ('lumira_cathedral', 'sylveth_grove', 'aethon_spire', 'kharvos_fortress', 'lumira_chapel', 'sylveth_glade', 'aethon_tower', 'kharvos_arena', 'boar_den', 'spider_mother_nest', 'grey_wolf_lair', 'hungry_ogre_cave', 'forgotten_knight_crypt', 'limbo')`)
  .run();
console.log('tirados dos covis:', r.changes);
JS
scp -i "$KEY" -o BatchMode=yes "$tmp/rollback_db.cjs" "$HOST:/tmp/rollback_db.cjs"
rm -rf "$tmp"

"${SSH[@]}" 'set -e
sudo test -d /home/grimhold/app.old || { echo "Sem versão anterior (app.old): nada a fazer"; exit 1; }
sudo systemctl stop grimhold
sudo chmod 644 /tmp/rollback_db.cjs
sudo -u grimhold -H bash -c "node --no-warnings /tmp/rollback_db.cjs"
sudo rm -rf /home/grimhold/app.broken
sudo mv /home/grimhold/app /home/grimhold/app.broken
sudo mv -T /home/grimhold/app.old /home/grimhold/app
sudo systemctl start grimhold
sleep 15
systemctl is-active grimhold
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3001/'
echo "Voltou para a versão anterior. A que deu problema ficou em /home/grimhold/app.broken."
