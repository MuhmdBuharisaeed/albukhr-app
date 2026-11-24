"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const css = fs.readFileSync(path.join(__dirname, "../css/marketplace.css"), "utf8");

test("Marketplace Insights uses a bounded responsive grid instead of a horizontal carousel", () => {
  assert.match(css, /\.market-insights-slider\s*\{[\s\S]*?display\s*:\s*grid\s*;/);
  assert.match(css, /grid-template-columns\s*:\s*repeat\(3\s*,\s*minmax\(0\s*,\s*1fr\)\)/);
  assert.match(css, /overflow\s*:\s*visible\s*;/);
  assert.doesNotMatch(css.slice(css.indexOf("/* Marketplace Insights:")), /overflow-x\s*:\s*auto/);
});

test("Tablet layout limits the insights grid to two equal columns", () => {
  assert.match(css, /@media\s*\(max-width\s*:\s*800px\)[\s\S]*?\.market-insights-slider\s*\{[\s\S]*?grid-template-columns\s*:\s*repeat\(2\s*,\s*minmax\(0\s*,\s*1fr\)\)/);
});

test("Phone layout stacks cards at the full available width", () => {
  assert.match(css, /@media\s*\(max-width\s*:\s*600px\)[\s\S]*?\.market-insights-slider\s*\{[\s\S]*?grid-template-columns\s*:\s*minmax\(0\s*,\s*1fr\)/);
  assert.match(css, /\.market-box\s*\{[\s\S]*?min-width\s*:\s*0\s*;/);
  assert.match(css, /\.market-box\s*\{[\s\S]*?width\s*:\s*100%\s*;/);
});

test("Insight cards use compact padding and shorter row spacing on mobile", () => {
  assert.match(css, /@media\s*\(max-width\s*:\s*600px\)[\s\S]*?\.market-box\s*\{[\s\S]*?padding\s*:\s*11px\s+14px\s*;/);
  assert.match(css, /@media\s*\(max-width\s*:\s*600px\)[\s\S]*?\.market-item\s*\{[\s\S]*?padding\s*:\s*6px\s+0\s*;/);
});

test("Other Marketplace card, investment and navigation styles remain present", () => {
  for (const selector of [".featured-project", ".project-card", ".invest-btn", ".app-alert"]) {
    assert.ok(css.includes(selector), `Expected preserved selector ${selector}`);
  }
  // Dock navigation is owned by global page styles and is intentionally not defined here.
  assert.doesNotMatch(css, /\.dock-nav\s*\{/);
});

test("CSS braces remain balanced", () => {
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  assert.equal(opens, closes);
});
