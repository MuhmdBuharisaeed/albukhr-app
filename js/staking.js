/* =========================================================
   ALBUKHR STAKING ENGINE v2
   Mainnet-safe financial boundary
   ---------------------------------------------------------
   Architecture:
   - Pi identity: js/core/pi-auth-core.js
   - API gateway: js/core/albukhr-api-core.js
   - Mainnet financial authority: ALBUKHR API + Supabase RPC
   - NO LocalStorage
   - NO direct browser writes to financial tables
   - NO browser-authoritative reward/capital accounting

   IMPORTANT:
   The current Mainnet database exposes the atomic treasury
   settlement RPC, but does NOT currently expose a Mainnet
   stakes/rewards/withdrawal contract. Therefore this engine
   refuses unsupported stake/withdraw mutations instead of
   writing to guessed/non-existent tables or RPCs.

   Once the authoritative staking contract is deployed,
   this file is the single frontend boundary to wire to it.
========================================================= */

(function (window) {
  "use strict";

  if (window.AlbukhrStaking) return;

  const MAINNET = "mainnet";
  const SUPPORTED_DURATIONS = Object.freeze([30, 60, 90]);

  /* ---------------------------------------------------------
     PROJECT RULES
     These are UI validation rules only.
     Financial authority must remain server-side.
  --------------------------------------------------------- */
  const PROJECT_RULES = Object.freeze({
    Raheem:  { minStake: 10 },
    Hauwal:  { minStake: 10 },
    Barsh:   { minStake: 10 },
    Khairat: { minStake: 10 },
    Urban:   { minStake: 10 },
    Labbaika:{ minStake: 10 },
    Azman:   { minStake: 10 }
  });

  const REWARD_RATES = Object.freeze({
    Raheem:  { 30: 0.01, 60: 0.025, 90: 0.05 },
    Hauwal:  { 30: 0.02, 60: 0.04,  90: 0.08 },
    Khairat: { 30: 0.025,60: 0.05, 90: 0.09 },
    Barsh:   { 30: 0.03, 60: 0.06, 90: 0.10 },
    Labbaika:{ 30: 0.02, 60: 0.045,90: 0.075 },
    Urban:   { 30: 0.12, 60: 0.12, 90: 0.12 },
    Azman:   { 30: 0.04, 60: 0.07, 90: 0.12 }
  });

  let operationLock = false;

  /* ---------------------------------------------------------
     CORE DEPENDENCIES
  --------------------------------------------------------- */
  function requireEnvironment() {
    const env = window.ALBukhrEnvironment;
    if (!env || typeof env.getNetwork !== "function") {
      throw new Error("ALBUKHR Environment Core is not loaded.");
    }
    return env;
  }

  function requireMainnet() {
    const env = requireEnvironment();
    const network = String(env.getNetwork() || "").toLowerCase();
    if (network !== MAINNET) {
      throw new Error("Mainnet staking is unavailable outside Mainnet.");
    }
    return env;
  }

  function requireAuthCore() {
    const auth = window.AlbukhrPiAuth;
    if (!auth || typeof auth.ensurePiAuth !== "function") {
      throw new Error("ALBUKHR Pi Auth Core is not loaded.");
    }
    return auth;
  }

  function requireApi() {
    const api = window.AlbukhrApi;
    if (!api || typeof api.post !== "function") {
      throw new Error("ALBUKHR API Core is not loaded.");
    }
    return api;
  }

  function requirePi() {
    if (!window.Pi) {
      throw new Error("Pi SDK is not available. Open ALBUKHR in Pi Browser.");
    }
    return window.Pi;
  }

  /* ---------------------------------------------------------
     NORMALIZATION
  --------------------------------------------------------- */
  function normalizeProject(project) {
    const input = String(project || "").trim();
    if (!input) return null;

    const key = Object.keys(PROJECT_RULES).find(
      name => name.toLowerCase() === input.toLowerCase()
    );

    return key || null;
  }

  function normalizeAmount(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  }

  function normalizeDuration(duration) {
    const value = Number(duration);
    return SUPPORTED_DURATIONS.includes(value) ? value : null;
  }

  function getRate(project, duration) {
    const p = normalizeProject(project);
    const d = normalizeDuration(duration);
    if (!p || !d) return 0;
    return Number(REWARD_RATES[p]?.[d] || 0);
  }

  function getMinStake(project) {
    const p = normalizeProject(project);
    return p ? Number(PROJECT_RULES[p].minStake || 0) : 0;
  }

  function validateStakeInput({ project, amount, duration }) {
    const normalizedProject = normalizeProject(project);
    const normalizedAmount = normalizeAmount(amount);
    const normalizedDuration = normalizeDuration(duration);

    if (!normalizedProject) {
      throw new Error("Invalid project.");
    }

    if (normalizedAmount === null) {
      throw new Error("Invalid amount.");
    }

    if (normalizedAmount < getMinStake(normalizedProject)) {
      throw new Error("Minimum stake not reached.");
    }

    if (normalizedDuration === null) {
      throw new Error("Invalid staking duration.");
    }

    return Object.freeze({
      project: normalizedProject,
      amount: normalizedAmount,
      duration: normalizedDuration,
      rate: getRate(normalizedProject, normalizedDuration)
    });
  }

  /* ---------------------------------------------------------
     USER
     The Pi Auth Core is the only identity source.
  --------------------------------------------------------- */
  async function getCurrentUser() {
    const auth = requireAuthCore();
    const user = await auth.ensurePiAuth();

    if (!user?.pi_uid) {
      throw new Error("Pi authentication is required.");
    }

    return user;
  }

  /* ---------------------------------------------------------
     PROJECT AUTHORITY
     The frontend does not invent project IDs/codes.
     If the authoritative project catalog exposes a resolver,
     use it; otherwise return the normalized UI project name.
  --------------------------------------------------------- */
  function resolveProjectCode(project) {
    const normalized = normalizeProject(project);
    if (!normalized) return null;

    const config = window.AlbukhrProjectConfig;

    try {
      if (config) {
        const candidates = [
          config.getProject,
          config.getProjectByName,
          config.resolveProject,
          config.getProjectCode
        ];

        for (const resolver of candidates) {
          if (typeof resolver !== "function") continue;
          const result = resolver.call(config, normalized);
          if (result && typeof result === "object") {
            const code = result.project_code || result.projectCode || result.code;
            if (code) return String(code);
          }
          if (typeof result === "string" && result.trim()) {
            return result.trim();
          }
        }
      }
    } catch (error) {
      console.warn("Project code resolver failed.", error);
    }

    return null;
  }

  /* ---------------------------------------------------------
     PAYMENT HELPERS
     --------------------------------------------------------- */
  function paymentIdentifier(payment) {
    return (
      payment?.identifier ||
      payment?.paymentId ||
      payment?.payment_id ||
      null
    );
  }

  function paymentTransactionId(payment) {
    return (
      payment?.transaction?.txid ||
      payment?.transaction?.id ||
      payment?.txid ||
      payment?.transaction_id ||
      null
    );
  }

  /*
     IMPORTANT:
     The existing Mainnet gateway settles an already completed
     Pi payment. It does not expose browser-side approve/complete
     endpoints. We therefore do not pretend that createPayment()
     alone is a completed financial settlement.
  */
  async function settleCompletedTreasuryPayment({
    projectCode,
    paymentId,
    amount
  }) {
    requireMainnet();
    const api = requireApi();

    if (!projectCode) {
      throw new Error("Authoritative project code is required.");
    }

    if (!paymentId) {
      throw new Error("Completed Pi payment ID is required.");
    }

    const safeAmount = normalizeAmount(amount);
    if (safeAmount === null) {
      throw new Error("Invalid payment amount.");
    }

    return api.post("/api/pi-project-treasury-payment", {
      project_code: projectCode,
      payment_id: paymentId,
      amount: safeAmount
    });
  }

  /* ---------------------------------------------------------
     SAFE STAKE ENTRY POINT

     Current Mainnet contract has no staking table/RPC.
     Do NOT create a fake pending row in Supabase.
  --------------------------------------------------------- */
  async function addStake({ project, amount, duration }) {
    if (operationLock) {
      return { error: "Processing..." };
    }

    operationLock = true;

    try {
      requireMainnet();
      await getCurrentUser();

      const input = validateStakeInput({
        project,
        amount,
        duration
      });

      const projectCode = resolveProjectCode(input.project);

      if (!projectCode) {
        throw new Error(
          "The authoritative Mainnet project code is not available."
        );
      }

      /*
         There is intentionally no direct Supabase INSERT here.

         The current Mainnet financial contract only provides:
         settle_project_liquidity_payment(...)

         It does not provide a staking contract for:
         - pending stakes
         - stake creation
         - rewards
         - unlocks
         - withdrawals

         Calling an unknown RPC/table would be unsafe.
      */
      return {
        error:
          "Mainnet staking is not enabled yet: the authoritative staking " +
          "database/API contract is not deployed."
      };
    } catch (error) {
      console.error("ALBUKHR STAKING:", error);
      return {
        error: error?.message || "Unable to create stake."
      };
    } finally {
      operationLock = false;
    }
  }

  /* ---------------------------------------------------------
     PI PAYMENT CREATION

     This helper is deliberately separate from addStake().
     It creates a Pi payment only when the caller explicitly
     provides an approved, authoritative project code and
     the current Mainnet payment contract supports the flow.

     Because the current API does not expose approve/complete,
     this function does NOT claim the resulting payment is
     settled.
  --------------------------------------------------------- */
  async function createPiPayment({ project, amount, duration }) {
    requireMainnet();
    const Pi = requirePi();
    await getCurrentUser();

    const input = validateStakeInput({
      project,
      amount,
      duration
    });

    const projectCode = resolveProjectCode(input.project);

    if (!projectCode) {
      throw new Error(
        "The authoritative Mainnet project code is not available."
      );
    }

    if (typeof Pi.createPayment !== "function") {
      throw new Error("Pi payment creation is unavailable.");
    }

    return new Promise((resolve, reject) => {
      let settled = false;

      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };

      const metadata = {
        network: MAINNET,
        action: "add_liquidity",
        project_code: projectCode,
        duration: input.duration
      };

      try {
        Pi.createPayment(
          {
            amount: input.amount,
            memo: `ALBUKHR ${projectCode} liquidity`,
            metadata
          },
          {
            onReadyForServerApproval: (paymentId) => {
              /*
                 The current ALBUKHR API intentionally has no
                 public approve endpoint. Do not attempt to
                 approve a payment from the browser.
              */
              console.warn(
                "Pi payment ready for server approval:",
                paymentId
              );
            },

            onReadyForServerCompletion: (paymentId, txid) => {
              /*
                 The current ALBUKHR API expects a completed
                 payment for treasury settlement. Do not mark
                 the payment settled here.
              */
              console.warn(
                "Pi payment ready for server completion:",
                { paymentId, txid }
              );
            },

            onCancel: () => {
              finish(reject, new Error("Payment cancelled."));
            },

            onError: (error) => {
              finish(
                reject,
                new Error(error?.message || "Pi payment failed.")
              );
            }
          }
        ).then?.(
          payment => finish(resolve, payment),
          error => finish(reject, error)
        );
      } catch (error) {
        finish(reject, error);
      }
    });
  }

  /* ---------------------------------------------------------
     SETTLE PAYMENT
     This is the only financial write exposed by this engine
     against the currently deployed Mainnet contract.
  --------------------------------------------------------- */
  async function settlePayment({ project, amount, paymentId }) {
    requireMainnet();
    await getCurrentUser();

    const input = validateStakeInput({
      project,
      amount,
      duration: 30
    });

    const projectCode = resolveProjectCode(input.project);

    if (!projectCode) {
      throw new Error(
        "The authoritative Mainnet project code is not available."
      );
    }

    return settleCompletedTreasuryPayment({
      projectCode,
      paymentId,
      amount: input.amount
    });
  }

  /* ---------------------------------------------------------
     READ APIs

     There is currently no authoritative Mainnet stakes
     endpoint/table available to this frontend.
  --------------------------------------------------------- */
  async function getUserStakes() {
    requireMainnet();
    await getCurrentUser();

    return [];
  }

  async function getAllStakesMerged() {
    return getUserStakes();
  }

  async function getGlobalStakes() {
    requireMainnet();
    return [];
  }

  async function getProjectTotals(project) {
    const normalizedProject = normalizeProject(project);
    if (!normalizedProject) {
      return { stake: 0, reward: 0, stakes: [] };
    }

    const stakes = await getGlobalStakes();
    const projectStakes = stakes.filter(
      stake =>
        String(stake.project || "").trim().toLowerCase() ===
        normalizedProject.toLowerCase()
    );

    let stakeTotal = 0;
    let rewardTotal = 0;

    for (const stake of projectStakes) {
      const amount = Number(stake.amount || 0);
      const reward = Number(stake.reward || 0);
      const withdrawnReward = Number(stake.withdrawnReward || 0);

      stakeTotal += Number.isFinite(amount) ? amount : 0;
      rewardTotal += Math.max(
        0,
        (Number.isFinite(reward) ? reward : 0) -
        (Number.isFinite(withdrawnReward) ? withdrawnReward : 0)
      );
    }

    return {
      stake: stakeTotal,
      reward: rewardTotal,
      stakes: projectStakes
    };
  }

  /* ---------------------------------------------------------
     WITHDRAWALS
     Explicitly blocked until authoritative withdrawal RPC/API
     exists. Browser PATCHes are prohibited.
  --------------------------------------------------------- */
  async function withdrawProjectReward() {
    requireMainnet();
    await getCurrentUser();

    return {
      error:
        "Reward withdrawal is not enabled: authoritative Mainnet " +
        "withdrawal settlement is not deployed."
    };
  }

  async function withdrawCapital() {
    requireMainnet();
    await getCurrentUser();

    return {
      error:
        "Capital withdrawal is not enabled: authoritative Mainnet " +
        "withdrawal settlement is not deployed."
    };
  }

  /* ---------------------------------------------------------
     LOAD DATA
  --------------------------------------------------------- */
  async function loadData() {
    return getUserStakes();
  }

  /* ---------------------------------------------------------
     LEGACY COMPATIBILITY NAMES
     Keep callers from crashing, but route through the new
     security boundary. No LocalStorage fallback exists.
  --------------------------------------------------------- */
  function getStakes() {
    return getAllStakesMerged();
  }

  function getInternalTotals(project) {
    return getProjectTotals(project);
  }

  function getInternalProjectTotals(project) {
    return getProjectTotals(project);
  }

  function addInternalStake(data) {
    return addStake(data);
  }

  /* ---------------------------------------------------------
     PUBLIC API
  --------------------------------------------------------- */
  window.AlbukhrStaking = Object.freeze({
    version: "2.0.0-mainnet-safe",

    PROJECT_RULES,
    REWARD_RATES,
    SUPPORTED_DURATIONS,

    getMinStake,
    getRate,
    normalizeProject,
    resolveProjectCode,
    validateStakeInput,

    getCurrentUser,

    addStake,
    createPiPayment,
    settlePayment,

    getUserStakes,
    getAllStakesMerged,
    getGlobalStakes,
    getProjectTotals,

    withdrawProjectReward,
    withdrawCapital,

    loadData,

    getStakes,
    getInternalTotals,
    getInternalProjectTotals,
    addInternalStake
  });

  /*
     Legacy global aliases.
     These are API aliases only; they do not restore the old
     LocalStorage/direct-Supabase financial behavior.
  */
  window.addStake = addStake;
  window.getStakes = getStakes;
  window.getAllStakesMerged = getAllStakesMerged;
  window.getGlobalStakes = getGlobalStakes;
  window.getProjectTotals = getProjectTotals;
  window.getUserStakes = getUserStakes;
  window.withdrawProjectReward = withdrawProjectReward;
  window.withdrawCapital = withdrawCapital;
  window.loadData = loadData;
  window.getMinStake = getMinStake;
  window.getRate = getRate;

})(window);
