"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const html = read("marketplace.html");
const css = read("css/marketplace.css");
const dashboard = read("js/marketplace/marketplace-dashboard.js");

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.className = "";
    this.classList = new FakeClassList();
    this.style = {};
    this.value = "";
    this._textContent = "";
    this._innerHTML = "";
    this.disabled = false;
    this.focused = false;
  }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.children.push(node); return node; }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  focus() { this.focused = true; }
  get childElementCount() { return this.children.length; }
  set textContent(value) { this._textContent = String(value ?? ""); }
  get textContent() { return this._textContent; }
  set innerHTML(value) { this._innerHTML = String(value ?? ""); }
  get innerHTML() { return this._innerHTML; }
}

function collectText(node) {
  return [node.textContent || "", ...(node.children || []).map(collectText)].join(" ");
}

async function createHarness(projects) {
  const ids = [
    "projectSearch", "sortProjects", "marketInsights", "discoverySection", "projectList",
    "investAmount", "investDuration", "investPreview", "investProjectName", "investModal",
    "investConfirmButton", "appAlertTitle", "appAlertText", "appAlert", "projectInfoModal",
    "projectInfoContent", "closeProjectInfoButton"
  ];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id)]));
  elements.investModal.classList.add("show");
  const documentListeners = {};
  const document = {
    readyState: "loading",
    activeElement: new FakeElement("active-element"),
    body: new FakeElement("body"),
    getElementById(id) { return elements[id] || null; },
    createElement(tag) { const element = new FakeElement(tag); element.tagName = tag.toUpperCase(); return element; },
    addEventListener(type, callback) { (documentListeners[type] ||= []).push(callback); }
  };
  let investmentCalls = 0;
  let registryCalls = 0;
  const window = {
    location: { origin: "https://app.albukhr.com" },
    ALBUKHR_SUPABASE: { network: "mainnet" },
    ALBukhrEnvironment: { getNetwork: () => "mainnet" },
    AlbukhrMarketplaceUI: {
      escapeHTML(value) {
        return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
          .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
      }
    },
    AlbukhrMarketplace: {
      async getAllProjects() { registryCalls++; return projects; },
      async invest() { investmentCalls++; return { success: true }; }
    },
    getProjectConfig: () => ({ durations: [30, 90] }),
    getMinStake: () => 10,
    getRewardRate: () => 0
  };
  const sandbox = { window, document, URL, console, Number, String, Math, Date, Set };
  vm.runInNewContext(dashboard, sandbox, { filename: "marketplace-dashboard.js" });
  const domReady = documentListeners.DOMContentLoaded?.[0];
  assert.equal(typeof domReady, "function", "dashboard registers DOMContentLoaded initializer");
  await domReady();
  return { window, document, elements, investmentCalls: () => investmentCalls, registryCalls: () => registryCalls };
}

const sampleProject = {
  id: "project-1",
  project_code: "CORE-001",
  slug: "core-001",
  name: "Sample Core Project",
  project_type: "core",
  core_slot: 1,
  network: "mainnet",
  status: "approved",
  logo_url: "https://cdn.example.test/logo.png",
  description: "Full project description.\n\nSecond paragraph with complete public information.",
  total_invested_pi: 0,
  investor_count: 0,
  investment_metrics_available: true
};

test("Marketplace keeps its original runtime engines and adds only the information modal markup", () => {
  assert.match(html, /js\/marketplace\/marketplace-engine\.js/);
  assert.match(html, /js\/marketplace\/marketplace-dashboard\.js/);
  assert.match(html, /id="investModal"/);
  assert.match(html, /id="investConfirmButton"/);
  assert.match(html, /id="projectInfoModal"/);
  assert.match(html, /id="projectInfoContent"/);
  assert.match(html, /id="closeProjectInfoButton"/);
});

test("project descriptions are visually clamped to exactly three lines in cards", () => {
  assert.match(css, /\.project-desc\s*\{[^}]*-webkit-line-clamp:\s*3/s);
  assert.match(css, /\.project-desc\s*\{[^}]*overflow:\s*hidden/s);
});

test("spotlight description is also clamped to three lines", () => {
  assert.match(css, /\.featured-desc\s*\{[^}]*-webkit-line-clamp:\s*3/s);
});

test("INFOR button is rendered for cards and spotlight and uses delegated events", () => {
  assert.match(dashboard, /class="market-info-btn card-info-btn"/);
  assert.match(dashboard, /class="market-info-btn featured-info-btn"/);
  assert.match(dashboard, /data-project-info=/);
  assert.match(dashboard, /addEventListener\("click", handleProjectInfoClick\)/);
});

test("all project types retain their type labels", () => {
  assert.match(dashboard, /if \(s === "core"\) return "Core Project"/);
  assert.match(dashboard, /if \(s === "internal"\) return "Internal Project"/);
  assert.match(dashboard, /if \(s === "external"\) return "External Project"/);
});

test("information modal creates content with textContent rather than injecting project data as HTML", async () => {
  const hostile = { ...sampleProject, description: "<script>alert(1)</script> & public text" };
  const h = await createHarness([hostile]);
  h.window.openProjectInfo("CORE-001");
  const content = h.elements.projectInfoContent;
  const fullDescription = content.children.find(node => node.className === "project-info-full-description");
  assert.ok(fullDescription);
  assert.equal(fullDescription.textContent, hostile.description);
  assert.equal(fullDescription.innerHTML, "");
  assert.equal(h.elements.projectInfoModal.classList.contains("show"), true);
  assert.equal(h.elements.projectInfoModal.attributes["aria-hidden"], "false");
});

test("information modal displays complete registry description and core metadata", async () => {
  const h = await createHarness([sampleProject]);
  h.window.openProjectInfo("CORE-001");
  const contentText = collectText(h.elements.projectInfoContent);
  assert.match(contentText, /Full project description/);
  assert.match(contentText, /Second paragraph with complete public information/);
  assert.match(contentText, /Core project slot/);
  assert.match(contentText, /Verified total invested/);
  assert.match(contentText, /Investor count/);
});

test("information modal does not expose private applicant fields", async () => {
  const h = await createHarness([{
    ...sampleProject,
    contact_email: "private@example.test",
    contact_phone: "+234000000000",
    pi_wallet: "private-wallet",
    owner_user_id: "private-owner-id"
  }]);
  h.window.openProjectInfo("CORE-001");
  const values = collectText(h.elements.projectInfoContent);
  assert.doesNotMatch(values, /private@example\.test|\+234000000000|private-wallet|private-owner-id/);
});

test("information modal hides investment metrics when the registry marks them unavailable", async () => {
  const h = await createHarness([{ ...sampleProject, investment_metrics_available: false }]);
  h.window.openProjectInfo("CORE-001");
  const labels = collectText(h.elements.projectInfoContent);
  assert.doesNotMatch(labels, /Verified total invested|Investor count/);
});

test("invalid and non-HTTPS project logo URLs are not injected into the information modal", async () => {
  const h = await createHarness([{ ...sampleProject, logo_url: "javascript:alert(1)" }]);
  h.window.openProjectInfo("CORE-001");
  const intro = h.elements.projectInfoContent.children.find(node => node.className === "project-info-intro");
  assert.ok(intro);
  assert.equal(intro.children.some(node => node.tagName === "IMG"), false);
});

test("information modal closes, restores focus and removes the body scroll lock", async () => {
  const h = await createHarness([sampleProject]);
  const trigger = new FakeElement("infor-trigger");
  h.window.openProjectInfo("CORE-001", trigger);
  assert.equal(h.document.body.classList.contains("market-info-open"), true);
  h.window.closeProjectInfo();
  assert.equal(h.elements.projectInfoModal.classList.contains("show"), false);
  assert.equal(h.elements.projectInfoModal.attributes["aria-hidden"], "true");
  assert.equal(h.document.body.classList.contains("market-info-open"), false);
  assert.equal(trigger.focused, true);
});

test("unknown project code does not open an empty information modal", async () => {
  const h = await createHarness([sampleProject]);
  h.window.openProjectInfo("UNKNOWN");
  assert.equal(h.elements.projectInfoModal.classList.contains("show"), false);
  assert.equal(h.elements.appAlert.classList.contains("show"), true);
});

test("INFOR data values are tied to the selected registry project, not the first card", async () => {
  const second = { ...sampleProject, project_code: "EXT-002", id: "project-2", name: "External Two", project_type: "external", core_slot: null };
  const h = await createHarness([sampleProject, second]);
  h.window.openProjectInfo("EXT-002");
  const content = collectText(h.elements.projectInfoContent);
  assert.match(content, /External Two/);
  assert.doesNotMatch(content, /Core project slot/);
});

test("search and sort controls remain wired to their original handlers", () => {
  assert.match(dashboard, /\$\("projectSearch"\)\?\.addEventListener\("input", applyFilters\)/);
  assert.match(dashboard, /\$\("sortProjects"\)\?\.addEventListener\("change", applyFilters\)/);
  assert.match(dashboard, /sort === "roi"/);
  assert.match(dashboard, /sort === "liquidity"/);
  assert.match(dashboard, /sort === "investors"/);
});

test("existing Invest Now entry point and server-authoritative investment call remain present", () => {
  assert.match(dashboard, /onclick="openInvestModal\(/);
  assert.match(dashboard, /window\.AlbukhrMarketplace\.invest\(\{/);
  assert.match(dashboard, /project: p\.project_code/);
  assert.match(dashboard, /network: window\.ALBukhrEnvironment\?\.getNetwork\?\.\(\)/);
  assert.match(dashboard, /window\.confirmInvestment = confirmInvestment/);
});

test("marketplace data engine and database contracts are not changed by this package", () => {
  assert.equal(fs.existsSync(path.join(root, "js/marketplace/marketplace-engine.js")), false);
  assert.doesNotMatch(dashboard, /\.from\(["']projects["']\)\.update|\.from\(["']projects["']\)\.insert/);
  assert.doesNotMatch(dashboard, /localStorage|sessionStorage/);
});

test("Marketplace HTML contains no duplicate element IDs", () => {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test("CSS braces are balanced and the modal remains above existing alert overlays", () => {
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
  assert.match(css, /\.project-info-modal\s*\{[^}]*z-index:\s*100000/s);
});

test("full project-config information is included when a legacy catalog entry provides it", () => {
  assert.match(dashboard, /window\.getProjectConfig\(project\.project_code \|\| project\.slug \|\| project\.id\)/);
  assert.match(dashboard, /Additional Project Information/);
  assert.match(dashboard, /additionalDescription\.textContent = additionalInfo/);
});
