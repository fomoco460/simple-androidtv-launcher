#!/usr/bin/env python3
"""
Downloads the NASA photos used by Ambient Mode's "Space" set, resizes them to 1920x1080
(plus a small thumbnail) and writes them to an output folder.

NASA content is generally not subject to copyright in the United States; credit NASA.
See https://www.nasa.gov/nasa-brand-center/images-and-media/

Usage:   python3 scripts/fetch_ambient_photos.py [OUTPUT_DIR]
Default: public/wallpapers/space
Needs:   python3 and Pillow  (sudo apt install python3-pil   or   pip3 install pillow)
"""
import io
import json
import os
import sys
import tempfile
import urllib.request

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is missing. Install it with:  sudo apt install python3-pil")

Image.MAX_IMAGE_PIXELS = None
W, H = 1920, 1080
TW, TH = 480, 270

# id, NASA image id, display name, credit, fit ("cover" crops to fill, "contain" letterboxes on black)
PHOTOS = [
    ("earthset-orion", "art002e021278", "Earthset from Orion", "NASA (Artemis II)", "cover"),
    ("crescent-earth", "art002e004437", "Crescent Earth", "NASA (Artemis II)", "cover"),
    ("artemis-earthrise", "art002e009280b", "Artemis Era Earthrise", "NASA (Artemis II)", "cover"),
    ("goodnight-moon", "art002e009210", "Goodnight Moon", "NASA (Artemis II)", "cover"),
    ("aurora-indian-ocean", "iss073e0247726", "Aurora over the Indian Ocean", "NASA (International Space Station)", "cover"),
    ("aurora-earthglow", "iss062e148363", "Aurora and Earthglow", "NASA (International Space Station)", "cover"),
    ("aurora-australis", "iss066e146457", "Aurora Australis", "NASA (International Space Station)", "cover"),
    ("blue-marble", "GSFC_20171208_Archive_e001386", "Blue Marble", "NASA/NOAA/GSFC/Suomi NPP/VIIRS/Norman Kuring", "contain"),
    ("black-marble", "GSFC_20171208_Archive_e001593", "Earth at Night", "NASA Earth Observatory image by Robert Simmon", "cover"),
    ("saturn-backlit", "PIA14934", "Saturn, Backlit", "NASA/JPL-Caltech/Space Science Institute", "cover"),
    ("cosmic-cliffs", "carina_nebula", "Cosmic Cliffs", "NASA, ESA, CSA, STScI (James Webb Space Telescope)", "cover"),
    ("pillars-of-creation", "GSFC_20171208_Archive_e000842", "Pillars of Creation", "NASA, ESA, Hubble Heritage Team (STScI/AURA)", "cover"),
]

HEADERS = {"User-Agent": "clean-launcher-photo-fetch/1.0"}


def get(url, timeout=120):
    req = urllib.request.Request(url.replace("http://", "https://"), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def best_url(nasa_id):
    data = json.loads(get(f"https://images-assets.nasa.gov/image/{nasa_id}/collection.json"))
    origs = [u for u in data if "~orig." in u and u.lower().rsplit(".", 1)[-1] in ("jpg", "jpeg", "png")]
    if origs:
        return origs[0]
    larges = [u for u in data if "~large." in u]
    if larges:
        return larges[0]
    raise RuntimeError("no usable image file listed")


def fit(img, w, h, mode):
    img = img.convert("RGB")
    if mode == "contain":
        scale = min(w / img.width, h / img.height)
        resized = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
        canvas = Image.new("RGB", (w, h), (0, 0, 0))
        canvas.paste(resized, ((w - resized.width) // 2, (h - resized.height) // 2))
        return canvas
    scale = max(w / img.width, h / img.height)
    resized = img.resize((max(w, round(img.width * scale)), max(h, round(img.height * scale))), Image.LANCZOS)
    left = (resized.width - w) // 2
    top = (resized.height - h) // 2
    return resized.crop((left, top, left + w, top + h))


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join("public", "wallpapers", "space")
    os.makedirs(out, exist_ok=True)
    done, failed = [], []
    for pid, nasa_id, name, credit, mode in PHOTOS:
        try:
            url = best_url(nasa_id)
            print(f"[{pid}] downloading {url}")
            raw = get(url, timeout=600)
            img = Image.open(io.BytesIO(raw))
            if img.width < 1600:
                raise RuntimeError(f"too small ({img.width}x{img.height}), skipped")
            fit(img, W, H, mode).save(os.path.join(out, f"{pid}.jpg"), "JPEG", quality=86, optimize=True, progressive=True)
            fit(img, TW, TH, mode).save(os.path.join(out, f"{pid}-thumb.jpg"), "JPEG", quality=80)
            done.append((pid, name, credit, nasa_id))
            print(f"[{pid}] ok  ({img.width}x{img.height} -> {W}x{H})")
        except Exception as e:  # keep going; report at the end
            failed.append((pid, str(e)))
            print(f"[{pid}] FAILED: {e}")

    with open(os.path.join(out, "CREDITS.txt"), "w") as f:
        f.write("Space photos for Ambient Mode. Source: NASA Image and Video Library (images.nasa.gov).\n")
        f.write("NASA content is generally not subject to copyright in the United States; NASA should be credited.\n")
        f.write("The NASA insignia/logo is not included. Use of these images does not imply NASA endorsement.\n\n")
        for pid, name, credit, nasa_id in done:
            f.write(f"{name} - {credit} (NASA ID {nasa_id})\n")
    with open(os.path.join(out, "photos.json"), "w") as f:
        json.dump([{"id": pid, "name": name} for pid, name, _, _ in done], f, indent=2)

    print(f"\nDone: {len(done)} ok, {len(failed)} failed -> {out}")
    for pid, err in failed:
        print(f"  failed {pid}: {err}")


if __name__ == "__main__":
    main()
