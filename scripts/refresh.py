#!/usr/bin/env python3
"""Save the DriveBC camera list. Images stay on DriveBC. No API key is used."""
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
CATALOG = "https://catalogue.data.gov.bc.ca/dataset/6b39a910-6c77-476f-ac96-7b4f18849b1c/resource/a9d52d85-8402-4ce7-b2ac-a2779837c48a/download/webcams.csv"


def number(value):
    try:
        return round(float(value), 5)
    except (TypeError, ValueError):
        return None


def main():
    with urlopen(CATALOG, timeout=90) as response:
        text = response.read().decode("utf-8-sig")
    cameras = []
    for row in csv.DictReader(text.splitlines()):
        ident = (row.get("id") or "").strip()
        if not ident.isdigit():
            continue
        lat, lon = number(row.get("latitude")), number(row.get("longitude"))
        if lat is None or not (48 <= lat <= 60 and -140 <= lon <= -114):
            lat = lon = None
        image = (row.get("links_imageURL") or "").strip()
        page = (row.get("links_camDetailsPage") or "").strip()
        if not image.startswith("https://www.drivebc.ca/"):
            image = f"https://www.drivebc.ca/images/{ident}.jpg"
        if not page.startswith("https://www.drivebc.ca/"):
            page = f"https://www.drivebc.ca/cameras/{ident}"
        cameras.append({
            "id": ident,
            "group": (row.get("cam_group") or ident).strip(),
            "name": " ".join((row.get("camName") or "").split()),
            "highway": (row.get("highway_number") or "").strip(),
            "caption": " ".join((row.get("caption") or "").split()),
            "region": (row.get("region_name") or "").strip(),
            "orientation": (row.get("orientation") or "").strip(),
            "image": image,
            "page": page,
            "lat": lat,
            "lon": lon,
        })
    if len(cameras) < 400:
        raise SystemExit(f"Only {len(cameras)} cameras came back; the previous list was left in place")
    cameras.sort(key=lambda item: (item["highway"], item["name"], item["id"]))
    retrieved = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "source": "https://catalogue.data.gov.bc.ca/dataset/bc-highwaycams",
        "imageBase": "https://www.drivebc.ca/images/",
        "retrieved": retrieved,
        "cameras": cameras,
    }
    path = ROOT / "web" / "data" / "cameras.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(path)
    status = ROOT / "web" / "data" / "status.json"
    status.write_text(json.dumps({
        "retrieved": retrieved,
        "cameras": len(cameras),
        "highways": len({item["highway"] for item in cameras if item["highway"]}),
    }, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(cameras)} cameras")


if __name__ == "__main__":
    main()
