import { boundsFor, cameraMatches, formatWhen, groupCameras, imageUrl, project } from "./model.mjs";

const queryInput = document.querySelector("#query");
const presets = document.querySelector("#presets");
const finding = document.querySelector("#finding");
const map = document.querySelector("#map");
const frames = document.querySelector("#frames");
const more = document.querySelector("#more");
const state = { file: null, config: { presets: [], placeLimit: 12 }, shown: 12 };

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function remember(value) {
  try { localStorage.setItem("coolcode:highwayframe:query", value); } catch { /* private mode */ }
}

function recall() {
  try { return localStorage.getItem("coolcode:highwayframe:query") || ""; } catch { return ""; }
}

function matches() {
  return groupCameras((state.file?.cameras || []).filter((camera) => cameraMatches(camera, queryInput.value)));
}

function drawMap(groups) {
  clear(map);
  const bounds = boundsFor(groups);
  if (!bounds) return;
  const width = 800;
  const height = 360;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  for (const group of groups) {
    if (!Number.isFinite(group.lat)) continue;
    const [x, y] = project(group, bounds, width, height);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x.toFixed(1));
    dot.setAttribute("cy", y.toFixed(1));
    dot.setAttribute("r", "6");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = group.name;
    dot.append(title);
    svg.append(dot);
  }
  map.append(svg);
}

function drawFrames(groups) {
  clear(frames);
  for (const group of groups.slice(0, state.shown)) {
    const card = document.createElement("article");
    card.className = "site";
    const heading = document.createElement("h3");
    heading.textContent = group.highway ? `Highway ${group.highway} · ${group.name}` : group.name;
    const meta = document.createElement("p");
    meta.textContent = [group.region, `${group.views.length} ${group.views.length === 1 ? "direction" : "directions"}`].filter(Boolean).join(" · ");
    const views = document.createElement("div");
    views.className = "views";
    for (const camera of group.views) {
      const figure = document.createElement("figure");
      const src = imageUrl(camera, state.file?.imageBase);
      const caption = document.createElement("figcaption");
      caption.textContent = camera.caption || camera.name || "DriveBC camera";
      if (typeof camera.page === "string" && camera.page.startsWith("https://www.drivebc.ca/")) {
        const link = document.createElement("a");
        link.href = camera.page;
        link.rel = "noreferrer noopener";
        link.textContent = "DriveBC camera page";
        caption.append(document.createTextNode(" · "), link);
      }
      if (src) {
        const image = document.createElement("img");
        image.alt = camera.caption || camera.name || "Highway camera";
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => {
          image.remove();
          const miss = document.createElement("p");
          miss.className = "miss";
          miss.textContent = "DriveBC did not return this still.";
          figure.insertBefore(miss, caption);
        });
        image.src = src;
        figure.append(image);
      }
      figure.append(caption);
      views.append(figure);
    }
    card.append(heading, meta, views);
    frames.append(card);
  }
  const left = groups.length - Math.min(state.shown, groups.length);
  more.hidden = left <= 0;
  more.textContent = `Show the rest (${left.toLocaleString("en-CA")} sites)`;
}

function render() {
  const groups = matches();
  const asked = queryInput.value.trim();
  const saved = state.file?.retrieved ? formatWhen(state.file.retrieved) : "an unknown date";
  const lead = asked
    ? `${groups.length.toLocaleString("en-CA")} camera sites match “${asked}”.`
    : `${groups.length.toLocaleString("en-CA")} camera sites are in the saved list.`;
  finding.textContent = `${lead} The list was saved ${saved}. Each picture is the latest still DriveBC is serving, not a picture from that day.`;
  for (const button of presets.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", button.dataset.query === asked ? "true" : "false");
  }
  drawMap(groups);
  drawFrames(groups);
  remember(queryInput.value);
}

async function main() {
  try {
    const [config, file] = await Promise.all([
      fetch(new URL("./config.json", import.meta.url)).then((response) => response.json()),
      fetch(new URL("./data/cameras.json", import.meta.url)).then((response) => response.json()),
    ]);
    state.config = config;
    state.file = file;
  } catch {
    finding.textContent = "The camera list could not be read. The last good copy was not replaced.";
    return;
  }
  state.shown = Number(state.config.placeLimit) || 12;
  for (const preset of state.config.presets || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.query = preset.query;
    button.textContent = preset.label;
    button.addEventListener("click", () => {
      queryInput.value = preset.query;
      state.shown = Number(state.config.placeLimit) || 12;
      render();
    });
    presets.append(button);
  }
  queryInput.value = recall() || state.config.presets?.[0]?.query || "Langley";
  queryInput.addEventListener("input", () => {
    state.shown = Number(state.config.placeLimit) || 12;
    render();
  });
  more.addEventListener("click", () => {
    state.shown = matches().length;
    render();
  });
  render();
}

main();
