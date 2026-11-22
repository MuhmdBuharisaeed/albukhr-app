const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const logoRenderer = fs.readFileSync(
  path.join(root, "js/project-logo-renderer.js"),
  "utf8"
);
const staking = fs.readFileSync(
  path.join(root, "js/staking.js"),
  "utf8"
);

test("home catalog bootstrap is isolated to the Home page", () => {
  assert.match(logoRenderer, /data-page"\)\s*!==\s*"home"/);
  assert.match(logoRenderer, /function renderHomeCatalog/);
  assert.match(logoRenderer, /getProjectsForCurrentNetwork/);
});

test("home catalog renders before authenticated user data arrives", () => {
  assert.match(logoRenderer, /Loading popularity data/);
  assert.match(logoRenderer, /Loading your stake data/);
  assert.match(logoRenderer, /data-catalog-bootstrap/);
  assert.match(logoRenderer, /renderHomeCatalog\(\);/);
});

test("registry refresh respects the active network and does not overwrite authenticated cards", () => {
  assert.match(logoRenderer, /albukhr:project-registry-ready/);
  assert.match(logoRenderer, /eventNetwork/);
  assert.match(logoRenderer, /canReplaceWithBootstrap/);
});

test("project logos use asynchronous decoding and prioritize only the first three popular logos", () => {
  assert.match(logoRenderer, /img\.decoding\s*=\s*"async"/);
  assert.match(logoRenderer, /img\.loading\s*=\s*options\s*&&\s*options\.eager\s*\?\s*"eager"\s*:\s*"lazy"/);
  assert.match(logoRenderer, /rank\s*<=\s*3/);
  assert.match(logoRenderer, /fetchpriority/);
});

test("Mainnet API Core is loaded on demand and awaited before user-stakes requests", () => {
  assert.match(staking, /function ensureApiCore\(\)/);
  assert.match(staking, /js\/core\/albukhr-api-core\.js/);
  assert.match(staking, /await ensureApiCore\(\);\s*const rows=await api\(\)\.get\("\/api\/my-stakes\?network=mainnet"\)/);
});

test("project-stakes reads also wait for the API Core", () => {
  assert.match(staking, /await ensureApiCore\(\);\s*const rows=await api\(\)\.get\(`\/api\/my-stakes\?network=mainnet&project_code=/);
});

test("performance changes do not add browser persistence or modify Dock Navigation", () => {
  const combined = logoRenderer + "\n" + staking;
  assert.doesNotMatch(combined, /\blocalStorage\b|\bsessionStorage\b/);
  assert.doesNotMatch(combined, /\.dock-nav|\.dock-item/);
});

test("investment contract and Pi payment protections remain present", () => {
  assert.match(staking, /get_public_core_staking_terms_v2/);
  assert.match(staking, /p_network:"mainnet"/);
  assert.match(staking, /window\.Pi\.createPayment/);
  assert.match(staking, /onReadyForServerApproval/);
  assert.match(staking, /onReadyForServerCompletion/);
  assert.match(staking, /network:"mainnet"/);
});
