import test from "node:test";
import assert from "node:assert/strict";
import { cameraMatches, groupCameras, imageUrl, siteName } from "../web/model.mjs";

const hwy1 = { id: "292", group: "275", name: "Port Mann Bridge - W", highway: "1", caption: "Highway 1 at Port Mann Bridge, looking westbound.", region: "Lower Mainland", orientation: "W", lat: 49.21, lon: -122.81 };
const hwy10 = { id: "80", group: "79", name: "Hwy 10 at 152 Street - E", highway: "10", caption: "Highway 10 at 152 Street, looking east.", region: "Lower Mainland", orientation: "E", lat: 49.1, lon: -122.8 };
const revelstoke = { id: "9", group: "9", name: "Revelstoke - W", highway: "1", caption: "Highway 1 at Revelstoke.", region: "Thompson Nicola", orientation: "W", lat: 51.0, lon: -118.2 };

test("highway 1 does not swallow highway 10", () => {
  assert.equal(cameraMatches(hwy1, "1"), true);
  assert.equal(cameraMatches(hwy10, "1"), false);
  assert.equal(cameraMatches(hwy10, "10"), true);
});

test("a place outside the starter presets still matches", () => {
  const presets = ["Langley", "Hope", "Massey"];
  assert.equal(presets.includes("Revelstoke"), false);
  assert.equal(cameraMatches(revelstoke, "Revelstoke"), true);
  assert.equal(cameraMatches(hwy10, "152 street"), true);
});

test("directions at one site stay one group and the model does not hide extras", () => {
  const east = { ...hwy10, id: "81", orientation: "S", name: "Hwy 10 at 152 Street - S" };
  const groups = groupCameras([hwy10, east, revelstoke]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].views.length, 2);
  assert.equal(siteName(hwy10.name), "Hwy 10 at 152 Street");
});

test("picture addresses stay on DriveBC", () => {
  assert.equal(imageUrl({ id: "292" }, "https://www.drivebc.ca/images/"), "https://www.drivebc.ca/images/292.jpg");
  assert.equal(imageUrl({ id: "1", image: "https://example.com/1.jpg" }), "https://www.drivebc.ca/images/1.jpg");
});
