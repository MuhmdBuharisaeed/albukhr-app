/* ALBUKHR — Contributor Internal Dashboard V1
 * Mainnet-only financial workspace.
 *
 * Uses:
 *   - Pi Auth Core for identity
 *   - Page Auth Guard for protected-page access
 *   - ALBUKHR API Core for all protected financial operations
 *
 * No LocalStorage / sessionStorage.
 * No direct browser reads from financial tables.
 * Core financial and Core staking engines remain untouched.
 */
(function(window){
  "use strict";

  const MAINNET = "mainnet";
  const ENGINE = "CONTRIBUTOR_INTERNAL_LIQUIDITY_V1";
  const WORKSPACE_API = "/api/contributor/workspace";
  const LIQUIDITY_WORKSPACE_API = "/api/internal-liquidity-workspace";
  const LIQUIDITY_HISTORY_API = "/api/internal-liquidity-history";
  const LIQUIDITY_APPROVE_API = "/api/internal-liquidity-approve";
  const LIQUIDITY_COMPLETE_API = "/api/internal-liquidity-complete";

  let currentUser = null;
  let contributorWorkspace = null;
  let project = null;
  let liquidityWorkspace = null;
  let paymentInProgress = false;

  const $ = (id) => document.getElementById(id);

  function text(id, value){
    const el = $(id);
    if (el) el.textContent = value == null ? "—" : String(value);
  }

  function show(id, visible){
    const el = $(id);
    if (el) el.classList.toggle("hidden", !visible);
  }

  function errorMessage(error, fallback){
    if (error instanceof Error && error.message) return error.message;
    if (error?.message) return String(error.message);
    if (error?.error?.message) return String(error.error.message);
    return fallback || "Request failed.";
  }

  function numberValue(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function formatPi(value){
    return `${numberValue(value).toFixed(3)} Pi`;
  }

  function formatDate(value){
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
  }

  function mask(value, start = 6, end = 5){
    const v = String(value || "").trim();
    if (!v) return "Not configured";
    if (v.length <= start + end + 3) return "••••••";
    return `${v.slice(0,start)}••••••${v.slice(-end)}`;
  }

  function api(){
    if (!window.AlbukhrApi || typeof window.AlbukhrApi.get !== "function"){
      throw new Error("ALBUKHR API Core is unavailable.");
    }
    return window.AlbukhrApi;
  }

  function assertMainnet(){
    const network = String(
      currentUser?.network ||
      window.AlbukhrPiAuth?.getNetwork?.() ||
      window.ALBukhrEnvironment?.getNetwork?.() ||
      ""
    ).trim().toLowerCase();

    if (network !== MAINNET){
      throw new Error("Contributor Internal Dashboard is available on Mainnet only.");
    }
  }

  function setPageStatus(message, kind = "info"){
    text("pageStatus", message || "");
    const el = $("securityState");
    if (!el) return;
    el.textContent = kind === "error" ? "ACCESS / SERVICE ERROR" : "SECURE · MAINNET";
    el.classList.toggle("danger", kind === "error");
  }

  function showError(message){
    text("errorText", message || "Unknown dashboard error.");
    show("errorPanel", true);
    setPageStatus(message, "error");
  }

  function clearError(){
    show("errorPanel", false);
  }

  function renderProject(p){
    project = p || null;

    text("projectName", p?.name || "Internal Project");
    text("projectCode", p?.project_code || "—");
    text("projectStatus", String(p?.status || "unknown").toUpperCase());
    text("userHandle", currentUser?.username || "Contributor");

    const statusEl = $("projectStatus");
    if (statusEl){
      statusEl.classList.remove("approved","active","draft","danger");
      statusEl.classList.add(String(p?.status || "").toLowerCase());
    }

    const logo = $("projectLogo");
    if (logo){
      const url = String(p?.logo_url || "").trim();
      if (url) logo.src = url;
    }
  }

  function renderTreasury(workspace){
    liquidityWorkspace = workspace || null;

    const treasury = workspace?.treasury || null;
    const configured = workspace?.treasury_configured === true;
    const required = numberValue(
      treasury?.required_liquidity ?? workspace?.required_liquidity
    );
    const verified = numberValue(
      treasury?.verified_liquidity ?? workspace?.verified_liquidity
    );
    const gap = numberValue(
      treasury?.liquidity_gap ?? workspace?.liquidity_gap
    );
    const ready = workspace?.liquidity_ready === true;

    text("requiredLiquidity", formatPi(required));
    text("verifiedLiquidity", formatPi(verified));
    text("liquidityGap", formatPi(gap));
    text("liquidityReady", ready ? "READY" : "NOT READY");

    const wallet = treasury?.treasury_wallet || "";
    text("treasuryWallet", mask(wallet));
    text(
      "treasuryStatus",
      configured
        ? String(treasury?.status || "configured").toUpperCase()
        : "NOT CONFIGURED"
    );

    show("treasuryWarning", !configured);

    const amount = $("liquidityAmount");
    const button = $("addLiquidityButton");

    if (amount){
      amount.disabled = !configured || !["active","locked"].includes(
        String(treasury?.status || "").toLowerCase()
      );
    }

    if (button){
      button.disabled = !configured || paymentInProgress || ![
        "active",
        "locked"
      ].includes(String(treasury?.status || "").toLowerCase());
    }

    if (ready){
      setPageStatus(
        "Internal liquidity threshold is satisfied. Investment remains subject to the remaining server-side activation gates."
      );
      text(
        "investmentGateTitle",
        "Liquidity requirement satisfied"
      );
      text(
        "investmentGateText",
        "Verified liquidity is at or above the server-defined threshold. Project activation, published Internal contract terms, and the Internal investment runtime must still be ready before investment is enabled."
      );
    } else if (configured){
      setPageStatus(
        `Internal liquidity is not ready. Current verified liquidity: ${formatPi(verified)}.`
      );
      text(
        "investmentGateTitle",
        "Liquidity threshold not yet satisfied"
      );
      text(
        "investmentGateText",
        `Add at least ${formatPi(gap)} more verified liquidity to meet the current treasury requirement. Investment remains server-gated until readiness is confirmed.`
      );
    } else {
      setPageStatus(
        "Treasury is not configured yet. Add Liquidity is unavailable."
      );
      text(
        "investmentGateTitle",
        "Treasury configuration required"
      );
      text(
        "investmentGateText",
        "ALBUKHR administration must configure the Mainnet Internal treasury wallet before the Contributor can submit liquidity."
      );
    }
  }

  async function loadContributorWorkspace(){
    const data = await api().get(WORKSPACE_API);

    if (!data?.success){
      throw new Error(
        data?.message ||
        data?.error ||
        "Contributor workspace could not be loaded."
      );
    }

    contributorWorkspace = data;

    if (
      !data?.contributor ||
      String(data.contributor.status || "").toLowerCase() !== "active"
    ){
      throw new Error("Active Contributor authorization is required.");
    }

    if (data.profile_complete === false){
      throw new Error("Contributor registration profile must be completed before using the Internal Dashboard.");
    }

    if (!data?.project){
      throw new Error("No Contributor Internal Project is currently assigned to this Contributor.");
    }

    renderProject(data.project);
    return data;
  }

  async function loadLiquidityWorkspace(){
    if (!project?.project_code){
      throw new Error("Internal Project code is unavailable.");
    }

    const data = await api().get(
      `${LIQUIDITY_WORKSPACE_API}?project_code=${encodeURIComponent(project.project_code)}`
    );

    if (!data?.success){
      throw new Error(
        data?.message ||
        data?.error ||
        "Internal liquidity workspace could not be loaded."
      );
    }

    renderTreasury(data);
    return data;
  }

  function createHistoryRow(row, index){
    const item = document.createElement("article");
    item.className = "history-item";

    const icon = document.createElement("div");
    icon.className = "history-icon";
    icon.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';

    const body = document.createElement("div");
    body.className = "history-body";

    const title = document.createElement("strong");
    title.textContent = `Liquidity Credit #${index + 1}`;

    const meta = document.createElement("span");
    meta.textContent =
      `${String(row?.verification_status || "verified").toUpperCase()} · ${formatDate(row?.verified_at || row?.created_at)}`;

    const reference = document.createElement("span");
    reference.textContent =
      row?.verification_reference
        ? `Tx: ${mask(row.verification_reference, 6, 6)}`
        : "Verification reference pending";

    body.append(title, meta, reference);

    const amount = document.createElement("strong");
    amount.className = "history-amount";
    amount.textContent = `+${formatPi(row?.amount).replace(" Pi","")} Pi`;

    item.append(icon, body, amount);
    return item;
  }

  async function loadHistory(){
    const list = $("historyList");
    const empty = $("historyEmpty");
    const historyError = $("historyError");

    if (!list) return;

    list.replaceChildren();
    show("historyEmpty", false);
    show("historyError", false);

    const data = await api().get(
      `${LIQUIDITY_HISTORY_API}?project_code=${encodeURIComponent(project.project_code)}`
    );

    /*
     * ALBUKHR API Core unwraps the API response and returns data directly.
     * The history gateway therefore returns:
     *   {
     *     project_code,
     *     network,
     *     payments,
     *     transactions
     *   }
     * rather than the outer { success, data } wrapper.
     */
    if (!data || typeof data !== "object"){
      throw new Error(
        "Internal liquidity history returned an invalid response."
      );
    }

    const payments = Array.isArray(data?.payments)
      ? data.payments
      : [];

    payments.forEach((row, index) => {
      list.appendChild(createHistoryRow(row, index));
    });

    show("historyEmpty", payments.length === 0);

    if (empty) empty.hidden = payments.length !== 0;
    if (historyError) historyError.hidden = true;
  }

  async function refreshDashboard(){
    clearError();
    try {
      await loadContributorWorkspace();
      await loadLiquidityWorkspace();

      try {
        await loadHistory();
      } catch (historyError){
        console.warn("[ALBUKHR INTERNAL DASHBOARD] History error", historyError);
        const message = errorMessage(
          historyError,
          "Liquidity history is currently unavailable."
        );
        text("historyError", message);
        show("historyError", true);
      }
    } catch (error){
      console.error("[ALBUKHR INTERNAL DASHBOARD]", error);
      showError(
        errorMessage(
          error,
          "Internal Project Dashboard could not be loaded."
        )
      );
    }
  }

  async function startLiquidityPayment(amount){
    if (paymentInProgress){
      throw new Error("A liquidity payment is already being processed.");
    }

    assertMainnet();

    if (!project?.project_code){
      throw new Error("Internal Project identity is unavailable.");
    }

    const treasury = liquidityWorkspace?.treasury;
    const treasuryStatus = String(treasury?.status || "").toLowerCase();

    if (
      liquidityWorkspace?.treasury_configured !== true ||
      !["active","locked"].includes(treasuryStatus)
    ){
      throw new Error("Internal Project treasury is not configured or active.");
    }

    if (!window.Pi || typeof window.Pi.createPayment !== "function"){
      throw new Error("Pi payment API is unavailable. Open ALBUKHR in Pi Browser.");
    }

    paymentInProgress = true;
    const button = $("addLiquidityButton");
    if (button){
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Processing…</span>';
    }

    const paymentState = $("paymentState");
    if (paymentState){
      paymentState.textContent = "Waiting for Pi payment confirmation…";
      paymentState.className = "payment-state active";
    }

    return new Promise((resolve, reject) => {
      let settled = false;

      function finishReject(error){
        if (settled) return;
        settled = true;
        reject(error);
      }

      function finishResolve(value){
        if (settled) return;
        settled = true;
        resolve(value);
      }

      const metadata = {
        network: MAINNET,
        action: "add_liquidity",
        project_code: project.project_code,
        contract_version: "internal_liquidity_v1",
        engine: ENGINE
      };

      try {
        window.Pi.createPayment(
          {
            amount,
            memo: `ALBUKHR ${project.project_code} internal liquidity`,
            metadata
          },
          {
            onReadyForServerApproval: async (paymentId) => {
              try {
                if (paymentState){
                  paymentState.textContent =
                    "Pi payment created. ALBUKHR server approval is in progress…";
                }

                await api().post(LIQUIDITY_APPROVE_API, {
                  payment_id: paymentId,
                  project_code: project.project_code,
                  amount
                });

                if (paymentState){
                  paymentState.textContent =
                    "Payment approved. Complete the Pi transaction to settle the liquidity.";
                }
              } catch (error){
                finishReject(error);
              }
            },

            onReadyForServerCompletion: async (paymentId, txid) => {
              try {
                if (paymentState){
                  paymentState.textContent =
                    "Pi transaction received. ALBUKHR is verifying and settling the liquidity…";
                }

                const result = await api().post(
                  LIQUIDITY_COMPLETE_API,
                  {
                    payment_id: paymentId,
                    project_code: project.project_code,
                    amount,
                    txid
                  }
                );

                if (paymentState){
                  paymentState.textContent =
                    "Liquidity settled successfully.";
                  paymentState.className = "payment-state success";
                }

                finishResolve(result);

              } catch (error){
                finishReject(error);
              }
            },

            onCancel: () => {
              finishReject(
                new Error("Pi liquidity payment was cancelled.")
              );
            },

            onError: (error) => {
              finishReject(
                new Error(
                  error?.message ||
                  "Pi liquidity payment failed."
                )
              );
            }
          }
        );
      } catch (error){
        finishReject(error);
      }
    });
  }

  async function submitLiquidity(event){
    event.preventDefault();

    const input = $("liquidityAmount");
    if (!input) return;

    const amount = Number(input.value);

    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000){
      text("amountHint", "Enter a valid positive Pi amount.");
      const hint = $("amountHint");
      if (hint) hint.classList.add("error");
      return;
    }

    const hint = $("amountHint");
    if (hint) {
      hint.textContent =
        "The amount will be sent through Pi and verified by the Mainnet gateway before settlement.";
      hint.classList.remove("error");
    }

    try {
      await startLiquidityPayment(amount);

      input.value = "";
      await refreshDashboard();

      setPageStatus(
        "Internal liquidity settlement completed successfully."
      );
    } catch (error){
      console.error("[ALBUKHR INTERNAL LIQUIDITY PAYMENT]", error);

      const message = errorMessage(
        error,
        "Internal liquidity payment could not be completed."
      );

      const state = $("paymentState");
      if (state){
        state.textContent = message;
        state.className = "payment-state error";
      }

      showError(message);
    } finally {
      paymentInProgress = false;
      const button = $("addLiquidityButton");
      const treasuryStatus = String(
        liquidityWorkspace?.treasury?.status || ""
      ).toLowerCase();
      const canAdd =
        liquidityWorkspace?.treasury_configured === true &&
        ["active","locked"].includes(treasuryStatus);

      if (button){
        button.disabled = !canAdd;
        button.innerHTML =
          '<i class="fa-solid fa-plus"></i><span>Add Liquidity</span>';
      }
    }
  }

  function bindEvents(){
    $("liquidityForm")?.addEventListener("submit", submitLiquidity);
    $("refreshButton")?.addEventListener("click", refreshDashboard);
    $("refreshBottomButton")?.addEventListener("click", refreshDashboard);
    $("errorRefresh")?.addEventListener("click", refreshDashboard);

    $("backButton")?.addEventListener("click", () => {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "contributor.html";
    });

    $("closeButton")?.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  async function init(){
    bindEvents();

    try {
      if (!window.ALBukhrEnvironment?.isMainnet?.()){
        throw new Error("Contributor Internal Dashboard is Mainnet-only.");
      }

      if (!window.AlbukhrPageAuthGuard){
        throw new Error("ALBUKHR Page Auth Guard is unavailable.");
      }

      currentUser = await window.AlbukhrPageAuthGuard.waitForAuth();

      if (!currentUser){
        return;
      }

      assertMainnet();

      await refreshDashboard();
    } catch (error){
      console.error("[ALBUKHR INTERNAL DASHBOARD INIT]", error);
      showError(
        errorMessage(
          error,
          "Contributor Internal Dashboard initialization failed."
        )
      );
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})(window);
