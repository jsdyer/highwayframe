// Keep transformations separate from the DOM so they can be tested directly.

export function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "date not published");
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date).replace(/\./g, "");
}

export function cameraMatches(camera, query) {
  const terms = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const highway = String(camera?.highway || "").toLowerCase();
  const words = `${camera?.name || ""} ${camera?.caption || ""} ${camera?.region || ""}`.toLowerCase();
  if (terms.length === 1 && /^\d+[a-z]?$/i.test(terms[0])) return highway === terms[0];
  return terms.every((term) => {
    if (/^\d+[a-z]?$/i.test(term)) {
      return highway === term || new RegExp(`(?:^|[^0-9])${term}(?![0-9])`, "i").test(words);
    }
    return words.includes(term);
  });
}

export function siteName(name) {
  const trimmed = String(name || "").trim();
  return trimmed.replace(/\s+[-–]\s+[NSEW]{1,3}$/i, "").trim() || trimmed;
}

export function groupCameras(cameras) {
  const groups = new Map();
  for (const camera of cameras || []) {
    const id = String(camera.group || camera.id || "");
    if (!id) continue;
    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        name: siteName(camera.name),
        highway: camera.highway || "",
        region: camera.region || "",
        lat: Number.isFinite(camera.lat) ? camera.lat : null,
        lon: Number.isFinite(camera.lon) ? camera.lon : null,
        views: [],
      };
      groups.set(id, group);
    }
    group.views.push(camera);
    if (group.lat == null && Number.isFinite(camera.lat) && Number.isFinite(camera.lon)) {
      group.lat = camera.lat;
      group.lon = camera.lon;
    }
  }
  for (const group of groups.values()) {
    group.views.sort((a, b) => String(a.orientation).localeCompare(String(b.orientation)));
  }
  return [...groups.values()];
}

export function imageUrl(camera, imageBase) {
  if (typeof camera?.image === "string" && camera.image.startsWith("https://www.drivebc.ca/")) return camera.image;
  const base = String(imageBase || "https://www.drivebc.ca/images/").replace(/\/?$/, "/");
  return camera?.id ? `${base}${camera.id}.jpg` : "";
}

export function boundsFor(groups) {
  const placed = (groups || []).filter((group) => Number.isFinite(group.lat) && Number.isFinite(group.lon));
  if (!placed.length) return null;
  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;
  for (const group of placed) {
    minLat = Math.min(minLat, group.lat);
    maxLat = Math.max(maxLat, group.lat);
    minLon = Math.min(minLon, group.lon);
    maxLon = Math.max(maxLon, group.lon);
  }
  const latPad = Math.max((maxLat - minLat) * 0.14, 0.02);
  const lonPad = Math.max((maxLon - minLon) * 0.14, 0.02);
  return { minLat: minLat - latPad, maxLat: maxLat + latPad, minLon: minLon - lonPad, maxLon: maxLon + lonPad };
}

export function project(group, bounds, width, height) {
  const x = ((group.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width;
  const y = ((bounds.maxLat - group.lat) / (bounds.maxLat - bounds.minLat)) * height;
  return [x, y];
}
