"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const projectConfigSource = fs.readFileSync(
  path.join(root, "js", "project-config.js"),
  "utf8"
);
const homeSource = fs.readFileSync(
  path.join(root, "js", "index.js"),
  "utf8"
);
const sqlSource = fs.readFileSync(
  path.join(root, "sql", "001_mainnet_public_project_registry.sql"),
  "utf8"
);

function createProjectConfigRuntime(network, rpcHandler) {
  const calls = [];
  const events = [];
  const window = {
    ALBUKHR_SUPABASE: {
      client: {},
      network,
      rpc: async (name, args) => {
        calls.push({ name, args });
        return rpcHandler(name, args, calls.length);
      }
    },
    dispatchEvent(event) {
      events.push(event);
      return true;
    }
  };

  class TestCustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail;
    }
  }

  const sandbox = {
    window,
    CustomEvent: TestCustomEvent,
    console: {
      info() {},
      warn() {},
      error() {}
    },
    Set,
    Array,
    String,
    Number,
    Object,
    Math,
    Promise
  };

  vm.runInNewContext(projectConfigSource, sandbox, {
    filename: "js/project-config.js"
  });

  return {
    window,
    calls,
    events,
    config: window.ALBukhrProjectConfig
  };
}

const mainnetAzman = {
  id: "11111111-1111-4111-8111-111111111111",
  project_code: "AZMAN-4080",
  slug: "azman-futures-makers-lab",
  name: "AZMAN FUTURES MAKERS LAB",
  project_type: "core",
  core_slot: 2,
  network: "mainnet",
  status: "approved",
  logo_url: "https://assets.example/azman.png",
  total_invested_pi: 125.5,
  investor_count: 4,
  investment_metrics_available: true
};

function approvedHauwal(network) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    project_code: "HAUWAL-6552",
    slug: "hauwal-maize-processing",
    name: "HAUWAL MAIZE PROCESSING",
    project_type: "core",
    core_slot: 7,
    network,
    status: "approved",
    logo_url: "https://assets.example/hauwal.png",
    total_invested_pi: 999,
    investor_count: 99,
    investment_metrics_available: true
  };
}

test("Mainnet project registry uses the fixed Mainnet aggregate RPC", async () => {
  const runtime = createProjectConfigRuntime("mainnet", async name => {
    assert.equal(name, "get_mainnet_public_project_registry");
    return { data: [mainnetAzman, approvedHauwal("mainnet")] };
  });

  const result = await runtime.config.loadRegistry();

  assert.equal(result.ok, true);
  assert.equal(runtime.calls.length, 1);
  assert.equal(runtime.calls[0].name, "get_mainnet_public_project_registry");
  assert.equal(runtime.calls[0].args, undefined);
  assert.equal(runtime.config.config.Azman.total_invested_pi, 125.5);
  assert.equal(runtime.config.config.Azman.investor_count, 4);
  assert.equal(runtime.config.config.Azman.investment_metrics_available, true);
  assert.equal(
    Object.values(runtime.config.config).some(item =>
      String(item.project_code || "").startsWith("HAUWAL")
    ),
    false
  );
});

test("Testnet registry call remains on its existing RPC and argument contract", async () => {
  const runtime = createProjectConfigRuntime("testnet", async (name, args) => {
    assert.equal(name, "get_public_project_registry");
    assert.equal(JSON.stringify(args), JSON.stringify({ p_network: "testnet" }));
    return {
      data: [{
        ...mainnetAzman,
        id: "33333333-3333-4333-8333-333333333333",
        network: "testnet",
        total_invested_pi: undefined,
        investor_count: undefined,
        investment_metrics_available: undefined
      }, approvedHauwal("testnet")]
    };
  });

  const result = await runtime.config.loadRegistry();

  assert.equal(result.ok, true);
  assert.equal(runtime.calls.length, 1);
  assert.equal(runtime.calls[0].name, "get_public_project_registry");
  assert.equal(JSON.stringify(runtime.calls[0].args), JSON.stringify({ p_network: "testnet" }));
  assert.equal(runtime.config.config.Azman.network, "testnet");
  assert.equal(runtime.config.config.Azman.total_invested_pi, null);
  assert.equal(runtime.config.config.Azman.investor_count, null);
  assert.equal(runtime.config.config.Azman.investment_metrics_available, false);
  assert.equal(
    Object.values(runtime.config.config).some(item =>
      String(item.project_code || "").startsWith("HAUWAL")
    ),
    false
  );
});

test("switching the shared catalog to Testnet clears previously loaded Mainnet aggregates", async () => {
  let network = "mainnet";
  const calls = [];
  const window = {
    ALBUKHR_SUPABASE: {
      client: {},
      get network() { return network; },
      rpc: async (name, args) => {
        calls.push({ name, args });
        if (name === "get_mainnet_public_project_registry") {
          return { data: [mainnetAzman] };
        }
        return {
          data: [{
            ...mainnetAzman,
            network: "testnet",
            total_invested_pi: undefined,
            investor_count: undefined,
            investment_metrics_available: undefined
          }]
        };
      }
    },
    dispatchEvent() { return true; }
  };
  class TestCustomEvent { constructor(type, options) { this.type = type; this.detail = options?.detail; } }

  vm.runInNewContext(projectConfigSource, {
    window,
    CustomEvent: TestCustomEvent,
    console: { info() {}, warn() {}, error() {} },
    Set, Array, String, Number, Object, Math, Promise
  });

  await window.ALBukhrProjectConfig.loadRegistry();
  assert.equal(window.ALBukhrProjectConfig.config.Azman.total_invested_pi, 125.5);

  network = "testnet";
  await window.ALBukhrProjectConfig.loadRegistry({ force: true });

  assert.equal(calls[0].name, "get_mainnet_public_project_registry");
  assert.equal(calls[1].name, "get_public_project_registry");
  assert.equal(window.ALBukhrProjectConfig.config.Azman.total_invested_pi, null);
  assert.equal(window.ALBukhrProjectConfig.config.Azman.investor_count, null);
  assert.equal(window.ALBukhrProjectConfig.config.Azman.investment_metrics_available, false);
});

test("Mainnet RPC failure falls back to the existing Mainnet catalog without losing project cards", async () => {
  const runtime = createProjectConfigRuntime("mainnet", async (name, args) => {
    if (name === "get_mainnet_public_project_registry") {
      return { data: null, error: { message: "function not installed" } };
    }
    assert.equal(name, "get_public_project_registry");
    assert.equal(JSON.stringify(args), JSON.stringify({ p_network: "mainnet" }));
    return { data: [{ ...mainnetAzman, total_invested_pi: undefined, investor_count: undefined, investment_metrics_available: undefined }] };
  });

  const result = await runtime.config.loadRegistry();

  assert.equal(result.ok, true);
  assert.equal(runtime.calls.length, 2);
  assert.equal(runtime.calls[0].name, "get_mainnet_public_project_registry");
  assert.equal(runtime.calls[1].name, "get_public_project_registry");
  assert.equal(runtime.config.config.Azman.network, "mainnet");
  assert.equal(runtime.config.config.Azman.investment_metrics_available, false);
});

test("Mainnet Home path maps raw project_code and reserves completed withdrawal deductions", () => {
  assert.match(homeSource, /if\(getHomeNetwork\(\) === "mainnet"\)/);
  assert.match(homeSource, /stake\.project_code/);
  assert.match(homeSource, /stake\.reward_amount/);
  assert.match(homeSource, /\/api\/my-withdrawals\?network=mainnet/);
  assert.match(homeSource, /\["pending", "approved", "paid"\]/);
  assert.match(homeSource, /\["active", "matured", "capital_withdrawn"\]\.includes\(status\)/);
  assert.match(homeSource, /recordNetwork !== "mainnet"/);
  assert.match(homeSource, /Investment metrics unavailable/);
  assert.match(homeSource, /metricsAvailable === true/);
});

test("existing Dock Navigation and the separate Testnet Home flow remain present", () => {
  assert.match(homeSource, /const dock=document\.querySelector\("\.dock-nav"\)/);
  assert.match(homeSource, /window\.openDrawer=openDrawer/);
  assert.match(homeSource, /window\.closeDrawer=closeDrawer/);
  assert.match(homeSource, /EXISTING TESTNET \/ LEGACY HOME DATA FLOW/);
  assert.match(homeSource, /typeof getGlobalStakes === "function"/);
  const executableHomeSource = homeSource
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(executableHomeSource, /\b(localStorage|sessionStorage)\s*\./i);
});


function createHomeRuntime({ network, stakes, withdrawals, globalStakes }) {
  const elements = new Map();
  const listeners = new Map();

  function makeElement() {
    const element = {
      className: "",
      style: {},
      attributes: {},
      children: [],
      textContent: "",
      innerHTML: "",
      classList: {
        add() {},
        remove() {},
        toggle() {}
      },
      replaceChildren(...nodes) {
        this.children = nodes;
        this.textContent = nodes.map(node => node?.textContent || "").join("");
      },
      appendChild(node) {
        this.children.push(node);
        return node;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      addEventListener() {},
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 20, height: 20 };
      }
    };
    return element;
  }

  const document = {
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    createElement() { return makeElement(); },
    createTextNode(value) { return { textContent: String(value) }; },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    }
  };

  const azman = {
    key: "Azman",
    project_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    project_code: "AZMAN-4080",
    slug: "azman-futures-makers-lab",
    title: "Azman Futures Makers Lab",
    network,
    core_slot: 2,
    total_invested_pi: 125.5,
    investor_count: 4,
    investment_metrics_available: true
  };
  const projectConfig = { Azman: azman };
  const window = {
    ALBUKHR_SUPABASE: { network, environment: network },
    ALBukhrEnvironment: { getNetwork: () => network },
    ALBukhrProjectConfig: {
      loadRegistry: async () => ({ ok: true, network, projects: [azman] }),
      find: value => ["AZMAN-4080", azman.project_id, "Azman", azman.slug].includes(value) ? azman : null
    },
    AlbukhrPiAuth: {
      requireAuth: async () => ({ uid: "test-user", username: "tester", network })
    },
    AlbukhrApi: {
      get: async path => path === "/api/my-withdrawals?network=mainnet" ? withdrawals : []
    },
    addEventListener() {},
    setTimeout() {},
    location: { replace() {}, href: "" },
    innerWidth: 400,
    pageYOffset: 0
  };

  const sandbox = {
    window,
    document,
    location: { pathname: "/index.html" },
    console: { info() {}, warn() {}, error() {} },
    PROJECT_CONFIG: projectConfig,
    getAllStakesMerged: async () => stakes,
    getGlobalStakes: async () => globalStakes || [],
    encodeURIComponent,
    Math,
    Number,
    String,
    Object,
    Array
  };

  vm.runInNewContext(homeSource, sandbox, { filename: "js/index.js" });

  return {
    elements,
    async start() {
      const ready = listeners.get("DOMContentLoaded");
      assert.equal(typeof ready, "function");
      await ready();
    }
  };
}

test("Mainnet Home derives personal assets from raw stakes and net withdrawals", async () => {
  const runtime = createHomeRuntime({
    network: "mainnet",
    stakes: [
      {
        id: "stake-active",
        project_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        project_code: "AZMAN-4080",
        user_id: "user-1",
        pi_uid: "pi-1",
        network: "mainnet",
        amount: 100,
        reward_amount: 10,
        status: "active"
      },
      {
        id: "stake-capital-withdrawn",
        project_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        project_code: "AZMAN-4080",
        user_id: "user-1",
        pi_uid: "pi-1",
        network: "mainnet",
        amount: 50,
        reward_amount: 3,
        status: "capital_withdrawn"
      },
      {
        id: "stake-other-network",
        project_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        project_code: "AZMAN-4080",
        user_id: "user-1",
        pi_uid: "pi-1",
        network: "testnet",
        amount: 900,
        reward_amount: 90,
        status: "active"
      }
    ],
    withdrawals: [
      {
        stake_id: "stake-active",
        network: "mainnet",
        withdrawal_type: "capital",
        requested_amount: 5,
        fee_amount: 0.1,
        status: "pending"
      },
      {
        stake_id: "stake-active",
        network: "mainnet",
        withdrawal_type: "reward",
        requested_amount: 2,
        fee_amount: 0.02,
        status: "paid"
      }
    ]
  });

  await runtime.start();

  assert.equal(runtime.elements.get("homeStake").textContent, "94.90 Pi");
  assert.equal(runtime.elements.get("homeReward").textContent, "10.98 Pi");
  assert.match(runtime.elements.get("popularProjects").children[0].innerHTML, /125\.50 Pi · 4 Investors/);
  assert.match(runtime.elements.get("assetsContainer").children[0].innerHTML, /94\.90 Pi Staked/);
});


test("Testnet Home still uses the previous user/global stake data contract", async () => {
  const runtime = createHomeRuntime({
    network: "testnet",
    stakes: [{ project: "Azman", type: "stake", amount: 20, reward: 3 }],
    withdrawals: [],
    globalStakes: [{ project: "Azman", type: "stake", amount: 200 }]
  });

  await runtime.start();

  assert.equal(runtime.elements.get("homeStake").textContent, "20.00 Pi");
  assert.equal(runtime.elements.get("homeReward").textContent, "3.00 Pi");
  assert.match(runtime.elements.get("popularProjects").children[0].innerHTML, /200\.00 Pi/);
  assert.doesNotMatch(runtime.elements.get("popularProjects").children[0].innerHTML, /Investors/);
  assert.match(runtime.elements.get("assetsContainer").children[0].innerHTML, /20\.00 Pi Staked/);
});

test("Mainnet aggregate SQL is fixed-network and matches verified Core/Internal payment provenance", () => {
  const body = sqlSource.split("AS $function$")[1].split("$function$;")[0];

  assert.match(sqlSource, /CREATE OR REPLACE FUNCTION public\.get_mainnet_public_project_registry\(\)/);
  assert.match(sqlSource, /SECURITY DEFINER/);
  assert.match(sqlSource, /SET search_path TO 'pg_catalog', 'public'/);
  assert.match(body, /s\.network = 'mainnet'/);
  assert.match(body, /pay\.network = 'mainnet'/);
  assert.match(body, /u\.network = 'mainnet'/);
  assert.match(body, /lower\(pay\.pi_status\) = 'completed'/);
  assert.match(body, /lower\(pay\.verification_status\) = 'verified'/);
  assert.match(body, /public\.core_investment_payments/);
  assert.match(body, /public\.internal_investment_payments/);
  assert.match(body, /COUNT\(DISTINCT v\.user_id\)/i);
  assert.match(body, /HAUWAL%/);
  assert.doesNotMatch(body, /testnet/i);
  assert.doesNotMatch(body, /'pi_uid'|'user_id'|'payment_id'|'wallet_address'|'txid'/i);
  assert.match(sqlSource, /REVOKE ALL ON FUNCTION public\.get_mainnet_public_project_registry\(\) FROM PUBLIC/);
  assert.match(sqlSource, /GRANT EXECUTE ON FUNCTION public\.get_mainnet_public_project_registry\(\) TO anon/);
  assert.match(sqlSource, /GRANT EXECUTE ON FUNCTION public\.get_mainnet_public_project_registry\(\) TO authenticated/);
});
