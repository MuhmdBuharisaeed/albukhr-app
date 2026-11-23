"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dashboardPath = path.resolve(
  __dirname,
  "../js/contributor/internal-dashboard.js"
);
const source = fs.readFileSync(dashboardPath, "utf8");

function createClassList() {
  const values = new Set();
  return {
    add: (...items) => items.forEach((item) => values.add(item)),
    remove: (...items) => items.forEach((item) => values.delete(item)),
    toggle: (item, force) => {
      if (force === undefined) {
        if (values.has(item)) values.delete(item);
        else values.add(item);
      } else if (force) {
        values.add(item);
      } else {
        values.delete(item);
      }
      return values.has(item);
    },
    contains: (item) => values.has(item)
  };
}

function createElement(id = "") {
  return {
    id,
    textContent: "",
    innerHTML: "",
    className: "",
    value: "",
    disabled: false,
    dataset: {},
    children: [],
    classList: createClassList(),
    addEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = [...children]; },
    querySelectorAll() { return []; },
    setAttribute() {},
    removeAttribute() {},
    remove() {},
    scrollIntoView() {}
  };
}

function createHarness(network = "mainnet", options = {}) {
  const elements = new Map();
  const pendingWorkspaceReads = [];
  const paymentCalls = [];
  const windowListeners = new Map();
  const apiGetCalls = [];
  const apiPostCalls = [];
  const storageUploads = [];

  const document = {
    readyState: "loading",
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement(id));
      return elements.get(id);
    },
    createElement(tag) { return createElement(tag); },
    querySelectorAll() { return []; },
    addEventListener(name, handler) {
      windowListeners.set(name, handler);
    }
  };

  const window = {
    ALBukhrEnvironment: {
      isMainnet: () => network === "mainnet",
      getNetwork: () => network
    },
    AlbukhrPiAuth: {
      getNetwork: () => network
    },
    AlbukhrApi: {
      get(pathname) {
        apiGetCalls.push(pathname);
        if (pathname.startsWith("/api/internal-liquidity-workspace?")) {
          return new Promise((resolve, reject) => {
            pendingWorkspaceReads.push({ resolve, reject });
          });
        }
        if (pathname === "/api/project-updates/publisher-projects") {
          return Promise.resolve(options.publisherProjects || []);
        }
        if (pathname.startsWith("/api/project-updates/feed?")) {
          return Promise.resolve(options.feedResult || { items: [], next_cursor: null, has_more: false });
        }
        throw new Error("Unexpected API GET in this test: " + pathname);
      },
      async post(pathname, body) {
        apiPostCalls.push({ pathname, body });
        if (pathname.endsWith("/upload-intents")) {
          return options.uploadIntent || {
            bucket: "project-updates",
            path: "mainnet/project/upload-intent/image.png",
            token: "signed-upload-token",
            upload_intent_id: "33333333-3333-4333-8333-333333333333"
          };
        }
        if (/\/updates$/.test(pathname)) return { success: true, update_id: "44444444-4444-4444-8444-444444444444" };
        throw new Error("Unexpected API POST in this test: " + pathname);
      }
    },
    ALBUKHR_SUPABASE: {
      network: network,
      client: {
        storage: {
          from(bucket) {
            return {
              async uploadToSignedUrl(storagePath, token, file, config) {
                storageUploads.push({ bucket, storagePath, token, file, config });
                return { data: { path: storagePath }, error: null };
              }
            };
          }
        }
      }
    },
    Pi: {
      createPayment(payment, callbacks) {
        paymentCalls.push({ payment, callbacks });
      }
    },
    history: { length: 1, back() {} },
    location: { href: "https://app.albukhr.com/contributor-internal-dashboard.html" },
    URL: {
      createObjectURL: () => "blob:internal-update-preview",
      revokeObjectURL() {}
    }
  };

  const marker = "})(window);";
  const closeAt = source.lastIndexOf(marker);
  assert.notEqual(closeAt, -1, "Dashboard IIFE closing marker must exist.");

  const instrumented =
    source.slice(0, closeAt) +
    `\n  window.__internalDashboardTest = Object.freeze({\n` +
    `    setProject(value) { project = value; },\n` +
    `    getPaymentInProgress() { return paymentInProgress; },\n` +
    `    settleLiquidity,\n` +
    `    startLiquidityPayment,\n` +
    `    loadInternalProjectUpdatePublisher,\n` +
    `    loadInternalUpdateFeed,\n` +
    `    selectInternalUpdateImage,\n` +
    `    publishInternalProjectUpdate,\n` +
    `    getUpdatesProjectId() { return updatesProjectId; },\n` +
    `  });\n` +
    source.slice(closeAt);

  vm.runInNewContext(instrumented, { window, document, console: { error() {}, warn() {}, info() {} }, Promise, Set, URL, URLSearchParams });

  return {
    window,
    document,
    elements,
    pendingWorkspaceReads,
    paymentCalls,
    apiGetCalls,
    apiPostCalls,
    storageUploads,
    dashboard: window.__internalDashboardTest
  };
}

function approvedWorkspace() {
  return {
    network: "mainnet",
    treasury_configured: true,
    liquidity_ready: false,
    liquidity_gap: 12.5,
    treasury: {
      status: "active",
      treasury_wallet: "GMAINNETTREASURYWALLET",
      required_liquidity: 12.5,
      verified_liquidity: 0,
      liquidity_gap: 12.5
    }
  };
}

function tick() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("Internal Dashboard has one controller and one liquidity payment event handler", () => {
  assert.equal((source.match(/\(function\s*\(window\)\s*\{/g) || []).length, 1);
  assert.equal((source.match(/\}\)\(window\);/g) || []).length, 1);
  assert.equal((source.match(/function\s+bindEvents\s*\(/g) || []).length, 1);
  assert.equal((source.match(/\.addEventListener\(\s*\n?\s*"click",\s*\n?\s*settleLiquidity/g) || []).length, 1);
  assert.equal((source.match(/window\.Pi\.createPayment\s*\(/g) || []).length, 1);
});

test("Funding save and submit reload the authoritative funding workspace", () => {
  const saveStart = source.indexOf("async function saveFundingPlan()");
  const submitStart = source.indexOf("async function submitFundingPlan()");
  const treasuryStart = source.indexOf("function renderTreasury(workspace)");
  assert.ok(saveStart >= 0 && submitStart > saveStart && treasuryStart > submitStart);

  const saveBody = source.slice(saveStart, submitStart);
  const submitBody = source.slice(submitStart, treasuryStart);
  assert.match(saveBody, /await api\(\)\.post\(\s*FUNDING_PLAN_API,[\s\S]*?await loadFundingPlan\(\)/);
  assert.match(submitBody, /await api\(\)\.post\(\s*FUNDING_SUBMIT_API,[\s\S]*?await loadFundingPlan\(\)/);
});

test("Payment lock is acquired before the first network await", () => {
  const start = source.indexOf("async function startLiquidityPayment()");
  const end = source.indexOf("async function settleLiquidity()");
  assert.ok(start >= 0 && end > start);
  const body = source.slice(start, end);
  const lockMatch = body.match(/paymentInProgress\s*=\s*true;/);
  assert.ok(lockMatch, "Payment lock acquisition must exist.");
  assert.ok(lockMatch.index < body.indexOf("await loadLiquidityWorkspace()"));
  assert.match(body, /const paymentButton =\s*\$\("addLiquidityButton"\);[\s\S]*?paymentButton\.disabled = true/);
});

test("Mainnet-only and no-browser-persistence boundaries are retained", () => {
  assert.match(source, /assertMainnet\(\);/);
  assert.match(source, /getCurrentNetwork\(\)/);
  const executableSource = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(executableSource, /\blocalStorage\b|\bsessionStorage\b/i);
  assert.doesNotMatch(executableSource, /testnet/i);
});

test("Rapid duplicate settlement attempts create at most one Pi payment", async () => {
  const harness = createHarness();
  harness.dashboard.setProject({ project_code: "INTERNAL-TEST-01" });

  const firstSettlement = harness.dashboard.settleLiquidity();
  assert.equal(harness.dashboard.getPaymentInProgress(), true);
  assert.equal(harness.pendingWorkspaceReads.length, 1);

  // This simulates a second click while the first click is awaiting the server.
  await harness.dashboard.settleLiquidity();
  assert.equal(harness.pendingWorkspaceReads.length, 1);
  assert.equal(harness.paymentCalls.length, 0);

  harness.pendingWorkspaceReads[0].resolve(approvedWorkspace());
  await tick();

  assert.equal(harness.paymentCalls.length, 1);
  assert.equal(harness.paymentCalls[0].payment.amount, 12.5);
  assert.equal(harness.dashboard.getPaymentInProgress(), true);

  harness.paymentCalls[0].callbacks.onCancel();
  await firstSettlement;

  assert.equal(harness.dashboard.getPaymentInProgress(), false);
  assert.equal(harness.paymentCalls.length, 1);
});

test("A failed server preflight releases the lock and permits a later retry", async () => {
  const harness = createHarness();
  harness.dashboard.setProject({ project_code: "INTERNAL-TEST-02" });

  const failedAttempt = harness.dashboard.settleLiquidity();
  assert.equal(harness.dashboard.getPaymentInProgress(), true);
  harness.pendingWorkspaceReads[0].resolve({
    network: "mainnet",
    treasury_configured: false,
    treasury: { status: "not_configured", liquidity_gap: 0 }
  });
  await failedAttempt;

  assert.equal(harness.dashboard.getPaymentInProgress(), false);
  assert.equal(harness.paymentCalls.length, 0);

  const retry = harness.dashboard.settleLiquidity();
  assert.equal(harness.dashboard.getPaymentInProgress(), true);
  harness.pendingWorkspaceReads[1].resolve(approvedWorkspace());
  await tick();

  assert.equal(harness.paymentCalls.length, 1);
  harness.paymentCalls[0].callbacks.onCancel();
  await retry;
  assert.equal(harness.dashboard.getPaymentInProgress(), false);
});


test("Testnet session is rejected before any Internal liquidity API or Pi call", async () => {
  const harness = createHarness("testnet");
  harness.dashboard.setProject({ project_code: "INTERNAL-TEST-03" });

  await harness.dashboard.settleLiquidity();

  assert.equal(harness.pendingWorkspaceReads.length, 0);
  assert.equal(harness.paymentCalls.length, 0);
  assert.equal(harness.dashboard.getPaymentInProgress(), false);
});


test("Internal owner publisher is matched against the server grant and its project only", async () => {
  const projectId = "11111111-1111-4111-8111-111111111111";
  const harness = createHarness("mainnet", {
    publisherProjects: [
      {
        project_id: projectId,
        project_code: "INTERNAL-OWNER-01",
        project_type: "internal",
        status: "approved",
        network: "mainnet",
        grant_source: "project_owner"
      },
      {
        project_id: "22222222-2222-4222-8222-222222222222",
        project_code: "OTHER-EXTERNAL-01",
        project_type: "external",
        status: "approved",
        network: "mainnet",
        grant_source: "project_owner"
      }
    ]
  });
  harness.dashboard.setProject({
    id: projectId,
    project_code: "INTERNAL-OWNER-01",
    name: "Internal Project"
  });

  const authorized = await harness.dashboard.loadInternalProjectUpdatePublisher();
  assert.equal(authorized, true);
  assert.equal(harness.dashboard.getUpdatesProjectId(), projectId);
  assert.equal(harness.apiGetCalls.length, 2);
  assert.match(harness.apiGetCalls[1], new RegExp("project_id=" + projectId));
  assert.equal(harness.elements.get("publishInternalUpdateButton").disabled, true);
});

test("Internal owner without an active matching grant cannot load or publish updates", async () => {
  const harness = createHarness("mainnet", {
    publisherProjects: [
      {
        project_id: "22222222-2222-4222-8222-222222222222",
        project_code: "SOME-OTHER-PROJECT",
        project_type: "internal",
        status: "approved",
        network: "mainnet",
        grant_source: "project_owner"
      }
    ]
  });
  harness.dashboard.setProject({
    id: "11111111-1111-4111-8111-111111111111",
    project_code: "INTERNAL-OWNER-02",
    name: "My Internal Project"
  });

  const authorized = await harness.dashboard.loadInternalProjectUpdatePublisher();
  assert.equal(authorized, false);
  assert.equal(harness.dashboard.getUpdatesProjectId(), null);
  assert.equal(harness.apiGetCalls.length, 1);
  assert.equal(harness.elements.get("publishInternalUpdateButton").disabled, true);
});

test("Internal project update publishing uses signed storage upload and the trusted API", async () => {
  const projectId = "11111111-1111-4111-8111-111111111111";
  const harness = createHarness("mainnet", {
    publisherProjects: [{
      project_id: projectId,
      project_code: "INTERNAL-OWNER-03",
      project_type: "internal",
      status: "approved",
      network: "mainnet",
      grant_source: "project_owner"
    }]
  });
  harness.dashboard.setProject({
    id: projectId,
    project_code: "INTERNAL-OWNER-03",
    name: "Internal Project"
  });

  const authorized = await harness.dashboard.loadInternalProjectUpdatePublisher();
  assert.equal(authorized, true);

  harness.document.getElementById("internalUpdateTitle").value = "Production line progress";
  harness.document.getElementById("internalUpdateBody").value = "The first installation stage has been completed.";
  harness.document.getElementById("internalUpdateKind").value = "milestone";
  harness.dashboard.selectInternalUpdateImage({
    name: "evidence.png",
    type: "image/png",
    size: 2048
  });

  await harness.dashboard.publishInternalProjectUpdate({ preventDefault() {} });

  assert.equal(harness.storageUploads.length, 1);
  assert.equal(harness.storageUploads[0].bucket, "project-updates");
  assert.equal(harness.storageUploads[0].token, "signed-upload-token");
  assert.equal(harness.apiPostCalls.length, 2);
  assert.match(harness.apiPostCalls[0].pathname, /\/upload-intents$/);
  assert.equal(JSON.stringify(harness.apiPostCalls[0].body), JSON.stringify({
    content_type: "image/png",
    file_size_bytes: 2048
  }));
  assert.match(harness.apiPostCalls[1].pathname, /\/updates$/);
  assert.equal(JSON.stringify(harness.apiPostCalls[1].body), JSON.stringify({
    upload_intent_id: "33333333-3333-4333-8333-333333333333",
    update_kind: "milestone",
    title: "Production line progress",
    body: "The first installation stage has been completed."
  }));
  assert.equal(harness.elements.get("internalUpdateTitle").value, "");
  assert.equal(harness.elements.get("internalUpdateBody").value, "");
});

test("Internal Updates UI is wired once and includes accessible publisher controls", () => {
  const htmlPath = path.resolve(__dirname, "../contributor-internal-dashboard.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "HTML element IDs must be unique.");
  assert.equal((html.match(/src=["']js\/contributor\/internal-dashboard\.js["']/g) || []).length, 1);
  assert.match(html, /href=["']css\/contributor-internal-updates\.css["']/);
  for (const id of [
    "internalUpdateForm", "internalUpdateKind", "internalUpdateTitle", "internalUpdateBody",
    "internalUpdateImage", "publishInternalUpdateButton", "internalUpdateFeedStatus",
    "internalUpdateFeedList", "refreshInternalUpdateFeedButton", "loadMoreInternalUpdatesButton"
  ]) {
    assert.ok(ids.includes(id), "Missing Internal Project Updates element: " + id);
  }
});

test("Project Updates uses the trusted gateway and signed Storage path, not direct table writes", () => {
  const start = source.indexOf("INTERNAL PROJECT UPDATES — MAINNET TRUSTED PUBLISHER");
  const end = source.indexOf("/* -----------------------------------------------------------\n   * EVENTS", start);
  assert.ok(start >= 0 && end > start);
  const publisherCode = source.slice(start, end);
  assert.match(publisherCode, /\/publisher-projects/);
  assert.match(publisherCode, /\/upload-intents/);
  assert.match(publisherCode, /uploadToSignedUrl\(/);
  assert.match(publisherCode, /\/feed\?/);
  assert.match(publisherCode, /\/updates/);
  assert.doesNotMatch(publisherCode, /from\(["']project_updates["']\)|\.insert\(/);
});

test("Unauthorized owner cannot publish even when an image and message have been entered", async () => {
  const harness = createHarness("mainnet", { publisherProjects: [] });
  harness.dashboard.setProject({
    id: "11111111-1111-4111-8111-111111111111",
    project_code: "INTERNAL-OWNER-04",
    name: "Internal Project"
  });
  await harness.dashboard.loadInternalProjectUpdatePublisher();
  harness.document.getElementById("internalUpdateTitle").value = "Unauthorized test update";
  harness.document.getElementById("internalUpdateBody").value = "This must not be submitted.";
  harness.dashboard.selectInternalUpdateImage({ name: "evidence.png", type: "image/png", size: 1200 });
  await harness.dashboard.publishInternalProjectUpdate({ preventDefault() {} });
  assert.equal(harness.apiPostCalls.length, 0);
  assert.equal(harness.storageUploads.length, 0);
});

test("Unsupported and oversized update images are rejected locally", () => {
  const harness = createHarness();
  harness.dashboard.selectInternalUpdateImage({ name: "clip.mp4", type: "video/mp4", size: 1000 });
  assert.equal(harness.dashboard.getUpdatesProjectId(), null);
  assert.equal(harness.elements.get("internalUpdateImagePreviewWrap")?.hidden, true);

  harness.dashboard.selectInternalUpdateImage({ name: "large.png", type: "image/png", size: 10 * 1024 * 1024 + 1 });
  assert.equal(harness.elements.get("internalUpdateImagePreviewWrap")?.hidden, true);
  assert.equal(harness.storageUploads.length, 0);
});


test("Testnet cannot query the Internal Project Updates publisher gateway", async () => {
  const harness = createHarness("testnet", {
    publisherProjects: [{
      project_id: "11111111-1111-4111-8111-111111111111",
      project_code: "INTERNAL-OWNER-05",
      project_type: "internal",
      status: "approved",
      network: "mainnet",
      grant_source: "project_owner"
    }]
  });
  harness.dashboard.setProject({
    id: "11111111-1111-4111-8111-111111111111",
    project_code: "INTERNAL-OWNER-05",
    name: "Internal Project"
  });

  const result = await harness.dashboard.loadInternalProjectUpdatePublisher();
  assert.equal(result, false);
  assert.equal(harness.apiGetCalls.length, 0);
  assert.equal(harness.apiPostCalls.length, 0);
  assert.equal(harness.storageUploads.length, 0);
});
