#!/usr/bin/env bash
# Publica a versão commitada no servidor (Oracle E2.1.Micro): compila o cliente
# aqui (a VM tem só 1 GB), envia o pacote, instala e reinicia o serviço.
# O banco (/home/grimhold/grimhold.db) não é tocado.
# Uso: bash scripts/deploy.sh   (HOST e KEY podem vir do ambiente)
set -euo pipefail
HOST="${HOST:?defina HOST=usuario@servidor}"
KEY="${KEY:-$HOME/.ssh/id_ed25519}"
cd "$(dirname "$0")/.."
SSH=(ssh -i "$KEY" -o BatchMode=yes "$HOST")

npm run build
# NO_VERSION=1: publica sem o /version.json (ninguém é recarregado pelo aviso de atualização nesta troca).
if [ -n "${NO_VERSION:-}" ]; then rm -f client/dist/version.json; echo "sem version.json"; fi
tmp="$(mktemp -d)"
git archive --format=tar -o "$tmp/release.tar" HEAD
tar -rf "$tmp/release.tar" client/dist
gzip -f "$tmp/release.tar"
scp -i "$KEY" -o BatchMode=yes "$tmp/release.tar.gz" "$HOST:/tmp/release.tar.gz"
rm -rf "$tmp"

"${SSH[@]}" 'set -e
sudo rm -rf /home/grimhold/app.new
sudo -u grimhold mkdir -p /home/grimhold/app.new
sudo -u grimhold tar -xzf /tmp/release.tar.gz -C /home/grimhold/app.new
sudo -u grimhold -H bash -c "cd ~/app.new && npm ci --omit=dev --no-audit --no-fund >/dev/null"
# Mantém os arquivos da tela das versões anteriores (sem sobrescrever os novos): quem está com a página
# antiga aberta ou em cache ainda acha os arquivos dela (24/10: sem eles a página antiga quebrava e
# recarregava sem parar). Os de mais de 7 dias são apagados para não acumular.
# Só apaga os antigos que NÃO são da versão nova (25/10: o -mtime apagava a fonte e os painéis, que
# vêm com a data antiga do arquivo, e o site ficava sem eles).
if sudo test -d /home/grimhold/app/client/dist/assets; then
  sudo -u grimhold bash -c "cd /home/grimhold/app.new/client/dist/assets && find . -type f | sort > /tmp/grimhold-new-assets.txt"
  sudo -u grimhold cp -rnp /home/grimhold/app/client/dist/assets/. /home/grimhold/app.new/client/dist/assets/ || true
  sudo -u grimhold bash -c "cd /home/grimhold/app.new/client/dist/assets && find . -type f -mtime +7 | sort | comm -23 - /tmp/grimhold-new-assets.txt | xargs -r -d \"\n\" rm -f" || true
fi
sudo rm -rf /home/grimhold/app.old
# O ubuntu não enxerga dentro de /home/grimhold: o teste tem que ser com sudo,
# senão o mv põe a versão nova DENTRO da antiga (app/app.new).
if sudo test -d /home/grimhold/app; then sudo mv /home/grimhold/app /home/grimhold/app.old; fi
sudo mv -T /home/grimhold/app.new /home/grimhold/app
# Caddy entrega os estáticos direto do disco (scripts/admin/caddy_static.sh): reaplica a leitura dele na pasta nova.
if getent passwd caddy >/dev/null; then sudo setfacl -m u:caddy:x /home/grimhold /home/grimhold/app /home/grimhold/app/client && sudo setfacl -R -m u:caddy:rX /home/grimhold/app/client/dist || true; fi
sudo test -f /home/grimhold/app/client/dist/index.html || { echo "app sem client/dist"; exit 1; }
sudo systemctl restart grimhold
sleep 6
systemctl is-active grimhold
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3001/'
echo "Publicado: $(git log --oneline -1)"
