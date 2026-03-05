#!/usr/bin/env node
/**
 * Generate Expo app icon assets from a single source PNG.
 *
 * - assets/icon.png: 1024x1024, flattened (no transparency) for iOS.
 * - assets/adaptive-icon.png: 1024x1024, background removed (edge-connected near-white -> transparent).
 * - assets/favicon.png: 48x48 from adaptive icon (keeps transparency).
 *
 * Usage:
 *   node scripts/generate-icons.js [path/to/source.png]
 *
 * Default source:
 *   graphics/app-icon-source.png
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PNG } = require("pngjs");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_SRC = path.join(ROOT, "graphics", "app-icon-source.png");
const ASSETS_DIR = path.join(ROOT, "assets");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: "utf8" });
  if (res.error) die(`${cmd} failed: ${res.error.message}`);
  if (res.status !== 0) {
    die(
      `${cmd} ${args.join(" ")} failed (exit ${res.status})\n${res.stderr || ""}`.trim()
    );
  }
  return res.stdout;
}

function readPng(p) {
  const buf = fs.readFileSync(p);
  return PNG.sync.read(buf);
}

function writePng(p, png) {
  const out = PNG.sync.write(png);
  fs.writeFileSync(p, out);
}

function isNearWhite(r, g, b) {
  // Allow some antialiasing around the icon edges.
  return r >= 245 && g >= 245 && b >= 245;
}

function idx(x, y, w) {
  return y * w + x;
}

function rgbaAt(png, i) {
  const o = i * 4;
  return {
    r: png.data[o],
    g: png.data[o + 1],
    b: png.data[o + 2],
    a: png.data[o + 3],
  };
}

function setRgba(png, i, r, g, b, a) {
  const o = i * 4;
  png.data[o] = r;
  png.data[o + 1] = g;
  png.data[o + 2] = b;
  png.data[o + 3] = a;
}

function ensure1024Square(srcPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "stabilify-icon-"));
  const tmpCropped = path.join(tmpDir, "cropped.png");
  const tmp1024 = path.join(tmpDir, "1024.png");

  const png = readPng(srcPath);
  const w = png.width;
  const h = png.height;

  let working = srcPath;

  if (w !== h) {
    const min = Math.min(w, h);
    // Center crop (sips crops from the center for cropToHeightWidth).
    run("sips", ["--cropToHeightWidth", String(min), String(min), working, "--out", tmpCropped]);
    working = tmpCropped;
  }

  if (w !== 1024 || h !== 1024) {
    // Resize to 1024 (preserves aspect after square crop).
    run("sips", ["-Z", "1024", working, "--out", tmp1024]);
    return tmp1024;
  }

  // Copy as-is into tmp so downstream steps can mutate without touching the source.
  fs.copyFileSync(working, tmp1024);
  return tmp1024;
}

function flattenToWhite(png) {
  // iOS app icons should not have alpha; flatten any transparent pixels to white.
  const n = png.width * png.height;
  for (let i = 0; i < n; i++) {
    const { r, g, b, a } = rgbaAt(png, i);
    if (a === 255) continue;
    if (a === 0) {
      setRgba(png, i, 255, 255, 255, 255);
      continue;
    }
    // Alpha blend over white: out = src*a + white*(1-a)
    const af = a / 255;
    const outR = Math.round(r * af + 255 * (1 - af));
    const outG = Math.round(g * af + 255 * (1 - af));
    const outB = Math.round(b * af + 255 * (1 - af));
    setRgba(png, i, outR, outG, outB, 255);
  }
}

function removeEdgeWhiteBackground(png) {
  const w = png.width;
  const h = png.height;
  const visited = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let qs = 0;
  let qe = 0;

  function enqueue(x, y) {
    qx[qe] = x;
    qy[qe] = y;
    qe++;
  }

  function trySeed(x, y) {
    const i = idx(x, y, w);
    if (visited[i]) return;
    const { r, g, b, a } = rgbaAt(png, i);
    if (a < 200) return;
    if (!isNearWhite(r, g, b)) return;
    visited[i] = 1;
    enqueue(x, y);
  }

  // Seed from edges: only the "outside" background is edge-connected.
  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }

  while (qs < qe) {
    const x = qx[qs];
    const y = qy[qs];
    qs++;

    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = idx(nx, ny, w);
      if (visited[ni]) continue;
      const { r, g, b, a } = rgbaAt(png, ni);
      if (a < 200) continue;
      if (!isNearWhite(r, g, b)) continue;
      visited[ni] = 1;
      enqueue(nx, ny);
    }
  }

  // Apply transparency to edge-connected white region.
  const n = w * h;
  for (let i = 0; i < n; i++) {
    if (!visited[i]) continue;
    setRgba(png, i, 0, 0, 0, 0);
  }
}

function main() {
  const src = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SRC;
  if (!fs.existsSync(src)) {
    die(
      [
        `Source icon not found: ${src}`,
        `Put your source PNG at: ${DEFAULT_SRC}`,
        `or run: node scripts/generate-icons.js /path/to/source.png`,
      ].join("\n")
    );
  }

  if (!fs.existsSync(ASSETS_DIR)) die(`Missing assets dir: ${ASSETS_DIR}`);

  const src1024 = ensure1024Square(src);
  const base = readPng(src1024);

  // 1) Standard app icon (flattened)
  const icon = PNG.sync.read(PNG.sync.write(base));
  flattenToWhite(icon);
  const iconOut = path.join(ASSETS_DIR, "icon.png");
  writePng(iconOut, icon);

  // 2) Android adaptive icon foreground (transparent outside)
  const adaptive = PNG.sync.read(PNG.sync.write(base));
  removeEdgeWhiteBackground(adaptive);
  const adaptiveOut = path.join(ASSETS_DIR, "adaptive-icon.png");
  writePng(adaptiveOut, adaptive);

  // 3) Web favicon (48x48), generated from adaptive to keep transparency
  const faviconOut = path.join(ASSETS_DIR, "favicon.png");
  run("sips", ["-Z", "48", adaptiveOut, "--out", faviconOut]);

  console.log("Generated:");
  console.log(`- ${path.relative(ROOT, iconOut)}`);
  console.log(`- ${path.relative(ROOT, adaptiveOut)}`);
  console.log(`- ${path.relative(ROOT, faviconOut)}`);
}

main();

