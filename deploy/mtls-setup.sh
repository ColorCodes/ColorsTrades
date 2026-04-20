#!/usr/bin/env bash
# Generate a private CA + one client certificate for mTLS with Caddy.
#
# Usage:
#   ./deploy/mtls-setup.sh               # creates ca + one client cert
#   ./deploy/mtls-setup.sh my-phone       # creates an additional client cert named "my-phone"
#
# Outputs:
#   deploy/ca.key                 — CA private key (keep OFFLINE after setup)
#   deploy/client_ca.pem          — CA certificate (bind-mount into Caddy)
#   deploy/<name>.p12             — PKCS#12 bundle to install on the client device
#
# Install the .p12 on each device you want to allow:
#   - iOS:     AirDrop or email the file, tap to install. Settings → General →
#              VPN & Device Management → Install. Then Settings → General →
#              About → Certificate Trust Settings → enable full trust.
#   - macOS:   Double-click → Keychain Access → System → set to "Always Trust".
#   - Android: Settings → Security → Encryption & credentials → Install from
#              storage.
#   - Windows: certmgr.msc → Personal → Certificates → Import.
#   - Firefox: Settings → Privacy & Security → Certificates → View → Your
#              Certificates → Import.
set -euo pipefail

cd "$(dirname "$0")"

NAME="${1:-primary}"
DAYS_CA="${DAYS_CA:-3650}"
DAYS_CLIENT="${DAYS_CLIENT:-1825}"

if [ ! -f ca.key ] || [ ! -f client_ca.pem ]; then
  echo "==> Generating CA"
  openssl genrsa -out ca.key 4096
  openssl req -x509 -new -nodes -key ca.key -sha256 -days "$DAYS_CA" \
    -subj "/CN=ColorsTrades-CA" \
    -out client_ca.pem
  echo "    CA created: $(pwd)/client_ca.pem"
  echo "    Keep ca.key offline after issuing your client certs."
fi

echo "==> Issuing client cert: $NAME"
openssl genrsa -out "$NAME.key" 2048
openssl req -new -key "$NAME.key" -subj "/CN=$NAME" -out "$NAME.csr"
openssl x509 -req -in "$NAME.csr" -CA client_ca.pem -CAkey ca.key -CAcreateserial \
  -out "$NAME.crt" -days "$DAYS_CLIENT" -sha256

echo "==> Bundling $NAME.p12"
read -rsp "Set an export password for $NAME.p12 (you'll type it once when installing): " P12_PASS
echo
openssl pkcs12 -export -out "$NAME.p12" \
  -inkey "$NAME.key" -in "$NAME.crt" \
  -certfile client_ca.pem \
  -name "ColorsTrades — $NAME" \
  -passout pass:"$P12_PASS"

rm -f "$NAME.csr"
echo
echo "Done. Install $NAME.p12 on the device that should be allowed in."
echo "Then uncomment the tls { client_auth ... } block in deploy/Caddyfile"
echo "and uncomment the client_ca.pem bind mount in docker-compose.prod.yml."
