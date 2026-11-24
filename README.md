# Highway Frame

[Open Highway Frame](https://coolcode.ca/highwayframe/) to look up a B.C. highway camera and see the latest still DriveBC is serving.

<!-- coolcode:guide -->
A highway number matches that highway only, so 1 does not include 10. The buttons are shortcuts. Any place name in the camera list works. The still is requested from DriveBC when the frame opens, and it is the current picture, not one from the day the list was saved.
<!-- /coolcode:guide -->

## Reading the list

The page filters the saved HighwayCams list in the tab. Cameras that share a site are one card, with a picture for each direction. The first screenful follows `placeLimit`. Show the rest does not drop any match. A missing picture is said to be missing. It is not replaced with another camera.

Road closures and construction stay in [Road Pulse](https://coolcode.ca/roadpulse/). This page does not repeat that feed.

## Source

[DriveBC HighwayCams](https://catalogue.data.gov.bc.ca/dataset/bc-highwaycams), Open Government Licence – British Columbia. No API key. Picture addresses look like `https://www.drivebc.ca/images/292.jpg`. Opening one asks DriveBC for the image. Streets on the map are [OpenFreeMap](https://openfreemap.org/) Positron, from OpenStreetMap, drawn with MapLibre GL 5.15.0 in `web/vendor/` (BSD-3-Clause).

## Expand or customize

Defaults live in [web/config.json](web/config.json). `presets` are the buttons and the first one is the opening search. `placeLimit` is how many sites to draw before Show the rest. `mapStyle` is the street-map style URL. Add a preset or change the number, then push. Visitors can already type a place that is not a preset.

```sh
python3 scripts/refresh.py
```

That rewrites `web/data/cameras.json` and `web/data/status.json`. If fewer than 400 cameras come back, the previous list stays. On GitHub, run **Refresh camera list**. The schedule is Mondays at 16:17 UTC. Pushing ordinary code does not collect a new list. Pictures are not stored in the repository.

Publish by enabling **Settings → Pages → GitHub Actions** and pushing to `main`. Check `https://coolcode.ca/highwayframe/`. After it is up, copy `tool.json` into `data/tools.json` in [jsdyer/jsdyer.github.io](https://github.com/jsdyer/jsdyer.github.io) and run `scripts/sync_guides.py --tool highwayframe` there before regenerating the hub README.

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -v
python3 scripts/build.py
```

<!-- schedule-reliability -->
## Schedule reliability

Public GitHub repositories can have scheduled workflows disabled after 60 days of inactivity. A separate weekly [schedule guard](.github/workflows/schedule-guard.yml) calls GitHub's enable-workflow API for an explicit list of refresh workflows and itself. It can restore workflows disabled for inactivity, preserves manually disabled workflows, and runs independently of collection failures.

This is an interim mitigation, not a scheduling guarantee: GitHub does not document active-workflow renewal as a permanent exemption, and scheduled runs can be delayed or dropped. A scheduler on our own Linux server is the planned independent trigger. The guard does not collect data, create dummy commits, or change source/check timestamps; successful collection and published data freshness still need monitoring.
<!-- /schedule-reliability -->
