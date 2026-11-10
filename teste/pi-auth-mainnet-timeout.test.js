const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const authSource = fs.readFileSync(
  path.join(ROOT, "js", "core", "pi-auth-core.js"),
  "utf8"
);
const loginSource = fs.readFileSync(
  path.join(ROOT, "js", "login.js"),
  "utf8"
);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function makeAuthContext(options = {}) {
  const events = [];
  const log = { info() {}, warn() {}, error() {} };
  const environment = {
    isKnown: () => true,
    isMainnet: () => true,
    isTestnet: () => false,
    getNetwork: () => "mainnet",
    getName: () => "MAINNET",
    getKey: () => "mainnet",
    getAppUrl: () => "https://app.albukhr.com",
    getSupabaseUrl: () => "https://ribpntyqdleytsyktdfb.supabase.co"
  };
  const supabase = { isNetwork: (network) => network === "mainnet" };
  const win = {
    ALBukhrEnvironment: environment,
    ALBUKHR_SUPABASE: supabase,
    Pi: options.Pi || {
      init: options.init || (() => Promise.resolve()),
      authenticate: options.authenticate || (async () => ({
        accessToken: "mainnet-pi-token",
        user: { uid: "mainnet-uid", username: "mainnet-user" }
      }))
    },
    __ALBUKHR_PI_SDK_LOAD_ERROR: false,
    AbortController,
    location: {
      hostname: "app.albukhr.com",
      pathname: "/login.html",
      href: "https://app.albukhr.com/login.html"
    },
    setTimeout(callback, milliseconds) {
      // Scale production timeout constants to keep the regression suite fast.
      return setTimeout(callback, Math.max(1, Math.floor(milliseconds / 1000)));
    },
    clearTimeout,
    addEventListener() {},
    dispatchEvent(event) {
      events.push(event);
      return true;
    }
  };
  const document = {
    documentElement: { removeAttribute() {} }
  };
  const context = {
    window: win,
    document,
    fetch: options.fetch || (async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        network: "mainnet",
        pi_uid: "mainnet-uid",
        user_id: "albukhr-user-id",
        username: "mainnet-user"
      })
    })),
    Promise,
    Error,
    String,
    Number,
    Object,
    URL,
    URLSearchParams,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    console: log
  };
  vm.runInNewContext(authSource, context, {
    filename: "js/core/pi-auth-core.js"
  });
  return { window: win, auth: win.AlbukhrPiAuth, events, context };
}

test("Mainnet Pi.init always receives sandbox:false", async () => {
  let received;
  const fixture = makeAuthContext({
    init: async (options) => { received = options; }
  });
  await fixture.auth.initPi();
  assert.equal(received.version, "2.0");
  assert.equal(received.sandbox, false);
  assert.equal(fixture.auth.isInitialized(), true);
});

test("Concurrent initPi calls share one underlying Pi.init promise", async () => {
  const pending = deferred();
  let calls = 0;
  const fixture = makeAuthContext({
    init() { calls += 1; return pending.promise; }
  });
  const first = fixture.auth.initPi();
  const second = fixture.auth.initPi();
  assert.equal(calls, 0); // Pi.init is invoked on the next microtask.
  await delay(0);
  assert.equal(calls, 1);
  pending.resolve();
  const results = await Promise.all([first, second]);
  assert.deepEqual(results, [true, true]);
  assert.equal(calls, 1);
});

test("Pi.init caller timeout does not clear pending initialization or start a second call", async () => {
  const pending = deferred();
  let calls = 0;
  const fixture = makeAuthContext({
    init() { calls += 1; return pending.promise; }
  });

  await assert.rejects(fixture.auth.initPi(), /PI_SDK_INIT_TIMEOUT/);
  assert.equal(calls, 1);
  await assert.rejects(fixture.auth.initPi(), /PI_SDK_INIT_TIMEOUT/);
  assert.equal(calls, 1);

  pending.resolve();
  await delay(0);
  assert.equal(await fixture.auth.initPi(), true);
  assert.equal(calls, 1);
});

test("A genuine Pi.init rejection permits a clean retry", async () => {
  let calls = 0;
  const fixture = makeAuthContext({
    init() {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error("PI_BRIDGE_REJECTED"))
        : Promise.resolve();
    }
  });
  await assert.rejects(fixture.auth.initPi(), /PI_BRIDGE_REJECTED/);
  assert.equal(await fixture.auth.initPi(), true);
  assert.equal(calls, 2);
});

test("Concurrent authenticate calls share one Pi.authenticate operation", async () => {
  const pending = deferred();
  let initCalls = 0;
  let authCalls = 0;
  const fixture = makeAuthContext({
    init() { initCalls += 1; return Promise.resolve(); },
    authenticate() { authCalls += 1; return pending.promise; }
  });

  const first = fixture.auth.authenticate();
  const second = fixture.auth.authenticate();
  await delay(0);
  assert.equal(initCalls, 1);
  assert.equal(authCalls, 1);

  await Promise.all([
    assert.rejects(first, /PI_AUTHENTICATION_TIMEOUT/),
    assert.rejects(second, /PI_AUTHENTICATION_TIMEOUT/)
  ]);
  assert.equal(authCalls, 1);

  pending.resolve({
    accessToken: "mainnet-pi-token",
    user: { uid: "mainnet-uid", username: "mainnet-user" }
  });
  await delay(0);
  await delay(0);

  assert.equal(fixture.auth.isAuthenticated(), true);
  assert.equal(fixture.auth.getNetwork(), "mainnet");
  assert.equal(fixture.auth.getAccessToken(), "mainnet-pi-token");
  assert.equal(authCalls, 1);
});

test("Wrong network blocks Pi initialization before Pi.init is called", async () => {
  let calls = 0;
  const fixture = makeAuthContext({
    init() { calls += 1; return Promise.resolve(); }
  });
  fixture.window.ALBukhrEnvironment = {
    ...fixture.window.ALBukhrEnvironment,
    getNetwork: () => "testnet",
    isMainnet: () => false
  };
  assert.throws(() => fixture.auth.initPi(), /Mainnet identity API cannot be used from Testnet/);
  assert.equal(calls, 0);
});

test("Pi SDK script load failure produces a specific error", async () => {
  const fixture = makeAuthContext();
  fixture.window.__ALBUKHR_PI_SDK_LOAD_ERROR = true;
  assert.throws(() => fixture.auth.initPi(), /PI_SDK_SCRIPT_LOAD_FAILED/);
});

test("Mainnet login page exposes bounded auth errors and retains Testnet handoff", () => {
  assert.match(loginSource, /PI_SDK_INIT_TIMEOUT/);
  assert.match(loginSource, /PI_AUTHENTICATION_TIMEOUT/);
  assert.match(loginSource, /ensurePiAuth\(\)/);
  assert.match(loginSource, /handoffToTestnet\(\)/);
  assert.match(loginSource, /issueProjectOwnerProof\(projectCode\)/);
});
