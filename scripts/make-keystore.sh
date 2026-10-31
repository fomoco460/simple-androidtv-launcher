#!/usr/bin/env bash
# One-time: create the release signing key OUTSIDE the repo.
# BACK THIS FILE UP. If you lose it you can never ship an update that installs over
# an existing install (Android requires the same signing key).
set -euo pipefail

KS_DIR="${HOME}/.clean-launcher"
KS_PATH="${KS_DIR}/release.keystore"
KEY_ALIAS="${KEY_ALIAS:-cleanlauncher}"

if [ -f "$KS_PATH" ]; then
  echo "Keystore already exists at $KS_PATH - refusing to overwrite." >&2
  exit 1
fi
command -v keytool >/dev/null || { echo "keytool not found (install a JDK)." >&2; exit 1; }

mkdir -p "$KS_DIR"
chmod 700 "$KS_DIR"

read -r -s -p "Choose a keystore password (min 8 chars): " PASS; echo
read -r -s -p "Repeat password: " PASS2; echo
[ "$PASS" = "$PASS2" ] || { echo "Passwords do not match." >&2; exit 1; }
[ "${#PASS}" -ge 8 ] || { echo "Password too short." >&2; exit 1; }

keytool -genkeypair -v \
  -keystore "$KS_PATH" \
  -storepass "$PASS" -keypass "$PASS" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Clean Launcher, O=Personal"
chmod 600 "$KS_PATH"

cat <<MSG

Created $KS_PATH  (alias: $KEY_ALIAS)

Back it up somewhere safe, then build with:

  export KEYSTORE_PATH="$KS_PATH"
  export KEYSTORE_PASS='<the password you just chose>'
  export KEY_ALIAS="$KEY_ALIAS"
  npm run build:apk
MSG
