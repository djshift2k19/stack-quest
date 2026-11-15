/**
 * Turns public/icon.svg into the PNG icons phones need for installing the app.
 * Uses Google Chrome through Playwright to draw the picture at each size.
 * Run with: node scripts/make-icons.mjs
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const svg = readFileSync("public/icon.svg", "utf8");
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
for (const [file, size] of [["public/icon-192.png", 192], ["public/icon-512.png", 512], ["public/apple-icon.png", 180]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#0b6e4f">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: file });
  console.log("made", file);
}
await browser.close();
