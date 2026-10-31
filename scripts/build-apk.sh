#!/usr/bin/env bash
# Builds, aligns and signs the Clean Launcher APK.
#
# Required environment (see scripts/make-keystore.sh):
#   KEYSTORE_PATH  path to your release keystore (keep it OUTSIDE the repo)
#   KEYSTORE_PASS  keystore password
#   KEY_ALIAS      key alias
# Optional:
#   KEY_PASS       key password (defaults to KEYSTORE_PASS)
#
# Output: release/clean-launcher-tv-<version>.apk  (git-ignored; upload it to a GitHub Release)
set -euo pipefail

: "${KEYSTORE_PATH:?KEYSTORE_PATH is not set. Run scripts/make-keystore.sh once, then export KEYSTORE_PATH, KEYSTORE_PASS and KEY_ALIAS.}"
: "${KEYSTORE_PASS:?KEYSTORE_PASS is not set. See scripts/make-keystore.sh.}"
: "${KEY_ALIAS:?KEY_ALIAS is not set. See scripts/make-keystore.sh.}"
export KEY_PASS="${KEY_PASS:-$KEYSTORE_PASS}"
[ -f "$KEYSTORE_PATH" ] || { echo "Keystore not found: $KEYSTORE_PATH" >&2; exit 1; }

# Single source of truth for the version: package.json
VERSION="$(node -p "require('./package.json').version")"
echo "=== Building Clean Launcher v${VERSION} ==="

echo "=== 1. Building Vite production bundle ==="
npm run build

echo "=== 2. Checking Android build tools ==="
mkdir -p android-build/bin android-build/gen android-build/classes release
if ! command -v aapt &> /dev/null || ! command -v javac &> /dev/null || ! command -v dalvik-exchange &> /dev/null || ! command -v zipalign &> /dev/null || ! command -v apksigner &> /dev/null || [ ! -f /usr/share/android-framework-res/framework-res.apk ] || [ ! -f /usr/lib/android-sdk/platforms/android-23/android.jar ]; then
  echo "Installing Android build tools (aapt, zipalign, apksigner, JDK)..."
  apt-get update -qq && apt-get install -y -qq aapt zipalign apksigner dalvik-exchange android-framework-res libandroid-23-java openjdk-17-jdk-headless
fi

echo "=== 3. Injecting version ${VERSION} into AndroidManifest.xml ==="
sed -i -E "s/android:versionName=\"[^\"]*\"/android:versionName=\"${VERSION}\"/" android-build/AndroidManifest.xml

echo "=== 3b. Compiling manifest/resources with aapt ==="
aapt package -f -m \
  -J android-build/gen \
  -M android-build/AndroidManifest.xml \
  -S android-build/res \
  -I /usr/share/android-framework-res/framework-res.apk \
  -F android-build/bin/base.apk

echo "=== 3c. Compiling Java and generating classes.dex ==="
javac -encoding UTF-8 \
  -source 1.8 -target 1.8 \
  -cp /usr/lib/android-sdk/platforms/android-23/android.jar \
  -d android-build/classes \
  android-build/gen/com/chromecast/cleanlauncher/R.java \
  android-build/src/com/chromecast/cleanlauncher/*.java

dalvik-exchange --dex --output=android-build/bin/classes.dex android-build/classes

echo "=== 4. Staging and packaging APK with web assets ==="
python3 - <<'PY'
import os, zipfile, shutil

staging_dir = 'android-build/staging'
if os.path.exists(staging_dir):
    shutil.rmtree(staging_dir)
os.makedirs(staging_dir, exist_ok=True)

with zipfile.ZipFile('android-build/bin/base.apk', 'r') as zin:
    for item in zin.infolist():
        zin.extract(item, staging_dir)

shutil.copy2('android-build/bin/classes.dex', os.path.join(staging_dir, 'classes.dex'))

assets_dir = os.path.join(staging_dir, 'assets')
os.makedirs(assets_dir, exist_ok=True)
for root, dirs, files in os.walk('dist'):
    rel_root = os.path.relpath(root, 'dist')
    target_dir = assets_dir if rel_root == '.' else os.path.join(assets_dir, rel_root)
    os.makedirs(target_dir, exist_ok=True)
    for f in files:
        if f.endswith('.apk') or f.endswith('.idsig'):
            continue
        shutil.copy2(os.path.join(root, f), os.path.join(target_dir, f))

out_apk = 'android-build/bin/fresh-unaligned.apk'
with zipfile.ZipFile(out_apk, 'w') as zout:
    for root, dirs, files in os.walk(staging_dir):
        for f in files:
            full_p = os.path.join(root, f)
            arcname = os.path.relpath(full_p, staging_dir)
            compress = zipfile.ZIP_STORED if arcname in ['resources.arsc', 'res/drawable/banner.png', 'res/drawable/icon.png'] else zipfile.ZIP_DEFLATED
            zout.write(full_p, arcname, compress_type=compress)
print('Unaligned APK staged.')
PY

echo "=== 5. Aligning with zipalign ==="
rm -f android-build/bin/fresh-aligned.apk
zipalign -p 4 android-build/bin/fresh-unaligned.apk android-build/bin/fresh-aligned.apk

echo "=== 6. Signing with your release key ==="
OUT="release/clean-launcher-tv-${VERSION}.apk"
rm -f "$OUT" "$OUT.idsig"
apksigner sign \
  --ks "$KEYSTORE_PATH" \
  --ks-key-alias "$KEY_ALIAS" \
  --ks-pass env:KEYSTORE_PASS \
  --key-pass env:KEY_PASS \
  --min-sdk-version 21 \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled false \
  --v4-signing-enabled false \
  --out "$OUT" \
  android-build/bin/fresh-aligned.apk
rm -f "$OUT.idsig"

echo "=== 7. Verifying ==="
apksigner verify -v --print-certs "$OUT"
zipalign -c -p 4 "$OUT"
ls -lh "$OUT"

echo "=== DONE: $OUT ==="
echo "Upload it to a GitHub Release as 'clean-launcher-tv.apk' (do not commit it)."
