"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const enginePath = path.join(__dirname, "../js/marketplace/marketplace-engine.js");
const engineSource = fs.readFileSync(enginePath, "utf8");

test("marketplace refuses U2A investment before Pi payment when offer acceptance UI is absent", async () => {
  let paymentCalls = 0;
  const project = {
    id: "project-mainnet-1",
    project_code: "RAHEEM",
    slug: "raheem",
    name: "Raheem Pharmacy",
    project_type: "core",
    network: "mainnet",
    status: "active"
  };
  const window = {
    ALBUKHR_SUPABASE: {
      client: {
        async rpc(name, args) {
          assert.equal(name, "get_public_project_registry");
          assert.equal(args.p_network, "mainnet");
          return { data: [project], error: null };
        }
      }
    },
    ALBukhrEnvironment: { isKnown: () => true, getNetwork: () => "mainnet" },
    AlbukhrStaking: { async addStake() { paymentCalls += 1; return { success: true }; } }
  };
  vm.runInNewContext(engineSource, { window, Date, Set, Map, Object, String, Number, Array, Error });
  await assert.rejects(
    window.AlbukhrMarketplace.invest({ project: "RAHEEM", amount: 10, duration: 90, network: "mainnet" }),
    /open this project's detail page/i
  );
  assert.equal(paymentCalls, 0, "marketplace must not start Pi payment without explicit offer acceptance");
});
