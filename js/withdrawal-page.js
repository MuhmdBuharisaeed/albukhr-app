(function (w, d) {
  "use strict";

  const $ = (id) => d.getElementById(id);
  const API = () => w.AlbukhrApi;
  const AUTH = () => w.AlbukhrPiAuth;
  let stakes = [];
  let requests = [];
  let isBusy = false;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const num = (value) => {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  };
  const pi = (value) => `${num(value).toLocaleString(undefined, { maximumFractionDigits: 3 })} Pi`;
  const dateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  };
  const statusText = (value) => String(value ?? "").replace(/_/g, " ").toUpperCase();

  function setStatus(text, isError = false) {
    const el = $("securityStatus");
    el.textContent = text || "";
    el.className = "status" + (isError ? " error" : "");
  }
  function setStakesStatus(text, isError = false) {
    const el = $("stakesStatus");
    el.textContent = text || "";
    el.className = "muted" + (isError ? " error" : "");
  }
  function setHistoryStatus(text, isError = false) {
    const el = $("historyStatus");
    el.textContent = text || "";
    el.className = "muted" + (isError ? " error" : "");
  }

  function assertMainnet() {
    const env = w.ALBukhrEnvironment;
    const core = w.ALBUKHR_SUPABASE;
    if (!env || typeof env.isKnown !== "function" || typeof env.isMainnet !== "function" || !env.isKnown() || !env.isMainnet()) {
      throw new Error("ALBUKHR withdrawals are available only in the verified Mainnet environment.");
    }
    if (!core || !core.client || String(core.environment || "").toLowerCase() !== "mainnet" || String(core.network || "").toLowerCase() !== "mainnet") {
      throw new Error("ALBUKHR Mainnet Supabase Core is unavailable or mismatched.");
    }
    if (!AUTH() || !API()) throw new Error("ALBUKHR Pi Auth or API Core is unavailable.");
  }

  function isMatured(stake) {
    const unlock = Date.parse(stake.unlock_at || "");
    return Number.isFinite(unlock) && unlock <= Date.now();
  }
  function eligibleStake(stake) {
    return ["active", "matured"].includes(String(stake.status || "").toLowerCase()) && isMatured(stake);
  }
  function baseAmount(stake, type) {
    return Math.max(0, type === "capital" ? num(stake.amount) : num(stake.reward_amount));
  }
  function reservedAmount(stake, type) {
    return requests.reduce((total, row) => {
      const sameStake = String(row.stake_id || "") === String(stake.id || "");
      const sameType = String(row.withdrawal_type || "").toLowerCase() === type;
      const status = String(row.status || "").toLowerCase();
      if (sameStake && sameType && ["pending", "approved", "paid"].includes(status)) {
        return total + num(row.requested_amount) + num(row.fee_amount);
      }
      return total;
    }, 0);
  }
  function availableAmount(stake, type) {
    return Math.max(0, baseAmount(stake, type) - reservedAmount(stake, type));
  }
  function hasOpenRequest(stake, type) {
    return requests.some((row) => String(row.stake_id || "") === String(stake.id || "") &&
      String(row.withdrawal_type || "").toLowerCase() === type &&
      ["pending", "approved"].includes(String(row.status || "").toLowerCase()));
  }

  function requestForm(stake, type, remaining) {
    const label = type === "capital" ? "Capital" : "Reward";
    const busy = !eligibleStake(stake);
    const open = hasOpenRequest(stake, type);
    if (remaining <= 0) {
      return `<div class="request-box"><h4>${label} withdrawal</h4><p>Estimated remaining balance: ${pi(remaining)}</p><div class="locked-note">No remaining balance is currently available for this withdrawal type.</div></div>`;
    }
    if (busy || open) {
      const note = open
        ? "A pending or approved request already exists for this stake and type. Wait for it to be resolved before creating another."
        : `This position is not yet eligible. Unlock time: ${esc(dateTime(stake.unlock_at))}.`;
      return `<div class="request-box"><h4>${label} withdrawal</h4><p>Estimated remaining balance: ${pi(remaining)}</p><div class="locked-note">${note}</div></div>`;
    }
    return `<form class="request-box" data-withdraw-form data-stake-id="${esc(stake.id)}" data-type="${type}">
      <h4>${label} withdrawal</h4>
      <p>Estimated remaining balance before the fee: <b>${pi(remaining)}</b>. The server checks the fee and final balance against the active Mainnet policy.</p>
      <label>Requested amount (Pi)
        <input name="requested_amount" type="number" min="1" step="0.001" inputmode="decimal" placeholder="Minimum 1 Pi" required>
      </label>
      <button class="button primary" type="submit">Submit ${label.toLowerCase()} request</button>
    </form>`;
  }

  function renderStakes() {
    const host = $("stakeList");
    const mainnetStakes = stakes.filter((row) => String(row.network || "").toLowerCase() === "mainnet");
    if (!mainnetStakes.length) {
      host.innerHTML = '<div class="empty-state">No Mainnet staking positions were returned for this authenticated account. A withdrawal request cannot be created until a valid Mainnet stake exists.</div>';
      setStakesStatus("No Mainnet positions returned.");
      return;
    }
    setStakesStatus(`${mainnetStakes.length} Mainnet position(s) loaded. Eligibility and final balances are rechecked by the server.`);
    host.innerHTML = mainnetStakes.map((stake) => {
      const code = stake.project_code || "ALBUKHR Project";
      const state = String(stake.status || "unknown").toUpperCase();
      const rewardAvailable = availableAmount(stake, "reward");
      const capitalAvailable = availableAmount(stake, "capital");
      const maturity = eligibleStake(stake);
      return `<article class="stake-card">
        <div class="stake-header"><div><h3>${esc(code)}</h3><div class="meta">Stake ${esc(stake.id)} · ${esc(dateTime(stake.start_at))}</div></div><span class="badge ${maturity ? "" : "warning"}">${esc(state)}${maturity ? " · ELIGIBLE TO REQUEST" : " · LOCKED"}</span></div>
        <div class="metrics">
          <div class="metric"><span>Original capital</span><b>${pi(stake.amount)}</b></div>
          <div class="metric"><span>Reward balance before requests</span><b>${pi(stake.reward_amount)}</b></div>
          <div class="metric"><span>Estimated remaining capital</span><b>${pi(capitalAvailable)}</b></div>
          <div class="metric"><span>Estimated remaining reward</span><b>${pi(rewardAvailable)}</b></div>
          <div class="metric"><span>Unlock time</span><b>${esc(dateTime(stake.unlock_at))}</b></div>
          <div class="metric"><span>Duration</span><b>${esc(stake.duration_days)} days</b></div>
        </div>
        <div class="request-options">${requestForm(stake, "capital", capitalAvailable)}${requestForm(stake, "reward", rewardAvailable)}</div>
      </article>`;
    }).join("");
  }

  function renderHistory() {
    const host = $("historyList");
    $("historyCount").textContent = String(requests.length);
    if (!requests.length) {
      host.innerHTML = '<div class="empty-state">No withdrawal requests were returned for your authenticated Mainnet identity.</div>';
      setHistoryStatus("No withdrawal history returned.");
      return;
    }
    setHistoryStatus(`${requests.length} withdrawal record(s) returned.`);
    const ordered = [...requests].sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
    host.innerHTML = ordered.map((row) => {
      const status = String(row.status || "unknown").toLowerCase();
      const badgeClass = status === "rejected" ? "danger" : ["pending", "approved"].includes(status) ? "warning" : "";
      return `<article class="history-card">
        <div class="history-header"><div><h3>${esc(row.project_code || "ALBUKHR Project")} · ${esc(statusText(row.withdrawal_type))}</h3><div class="meta">Request ${esc(row.id)} · ${esc(dateTime(row.created_at))}</div></div><span class="badge ${badgeClass}">${esc(statusText(row.status))}</span></div>
        <div class="history-grid">
          <div class="metric"><span>Requested</span><b>${pi(row.requested_amount)}</b></div>
          <div class="metric"><span>Fee</span><b>${pi(row.fee_amount)}</b></div>
          <div class="metric"><span>Total balance deduction</span><b>${pi(num(row.requested_amount) + num(row.fee_amount))}</b></div>
          <div class="metric"><span>Wallet receives</span><b>${pi(row.net_amount)}</b></div>
        </div>
        ${row.txid ? `<p class="meta">Recorded TXID: <code>${esc(row.txid)}</code></p>` : ""}
      </article>`;
    }).join("");
  }

  async function refresh(force = false) {
    if (isBusy && !force) return;
    const button = $("refreshButton");
    button.disabled = true;
    setStakesStatus("Loading Mainnet positions…");
    setHistoryStatus("Loading withdrawal history…");
    try {
      assertMainnet();
      const user = await AUTH().ensurePiAuth();
      if (!user || String(user.network || "").toLowerCase() !== "mainnet") throw new Error("Authenticated Mainnet identity is required.");
      const result = await Promise.all([
        API().get("/api/my-stakes?network=mainnet"),
        API().get("/api/my-withdrawals?network=mainnet")
      ]);
      if (!Array.isArray(result[0]) || !Array.isArray(result[1])) throw new Error("The Mainnet API returned an unexpected withdrawal data shape.");
      stakes = result[0];
      requests = result[1];
      renderStakes();
      renderHistory();
      setStatus("Mainnet identity verified. Withdrawal requests only; no Pi payment was sent.");
    } catch (error) {
      console.error("[ALBUKHR WITHDRAWAL PAGE] Read failed", error);
      stakes = [];
      requests = [];
      $("stakeList").innerHTML = "";
      $("historyList").innerHTML = "";
      $("historyCount").textContent = "0";
      setStakesStatus(error?.message || "Unable to load Mainnet staking positions.", true);
      setHistoryStatus("Unable to load history. Refresh after resolving the Mainnet API error.", true);
      setStatus(error?.message || "Mainnet withdrawal initialization failed.", true);
    } finally {
      button.disabled = false;
    }
  }

  async function submitRequest(form) {
    if (isBusy) return;
    assertMainnet();
    const stakeId = String(form.dataset.stakeId || "").trim();
    const type = String(form.dataset.type || "").toLowerCase();
    const amount = Number(new FormData(form).get("requested_amount"));
    if (!stakeId || !["capital", "reward"].includes(type)) throw new Error("Withdrawal form is invalid.");
    if (!Number.isFinite(amount) || amount < 1) throw new Error("The minimum withdrawal request is 1 Pi.");
    const stake = stakes.find((row) => String(row.id) === stakeId);
    if (!stake || !eligibleStake(stake)) throw new Error("This Mainnet position is not currently eligible for withdrawal.");
    if (hasOpenRequest(stake, type)) throw new Error("A pending or approved request already exists for this stake and type.");
    const remaining = availableAmount(stake, type);
    if (remaining <= 0 || amount > remaining) throw new Error("Requested amount exceeds the displayed remaining balance. Refresh and check the fee before submitting.");
    if (!w.confirm(`Submit a ${type} withdrawal request for ${pi(amount)}? The Mainnet server will calculate the fee and recheck the remaining balance. This request will not send Pi.`)) return;

    isBusy = true;
    form.querySelector("button[type=submit]").disabled = true;
    setStatus("Submitting request to the trusted Mainnet API…");
    try {
      const result = await API().post("/api/withdrawal-request", {
        stake_id: stakeId,
        withdrawal_type: type,
        requested_amount: amount
      });
      if (!result || result.success !== true || !result.request_id) throw new Error("The server did not confirm that the withdrawal request was created.");
      const feeRate = num(result.fee_rate) * 100;
      const rateText = Number.isFinite(feeRate) ? `${feeRate.toLocaleString(undefined, { maximumFractionDigits: 3 })}%` : "server policy";
      const successMessage = `Request submitted. Request ID: ${result.request_id}. Fee: ${pi(result.fee_amount)} (${rateText}); total balance deduction: ${pi(result.total_deduction)}; wallet amount: ${pi(result.wallet_receive ?? result.net_amount)}. No Pi was sent.`;
      form.reset();
      await refresh(true);
      setStatus(successMessage);
    } catch (error) {
      console.error("[ALBUKHR WITHDRAWAL PAGE] Request submit failed", error);
      setStatus(error?.message || "Withdrawal request could not be submitted.", true);
    } finally {
      isBusy = false;
      if (form.isConnected) form.querySelector("button[type=submit]").disabled = false;
    }
  }

  d.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches("[data-withdraw-form]")) return;
    event.preventDefault();
    submitRequest(form).catch((error) => setStatus(error?.message || "Withdrawal request failed.", true));
  });
  $("refreshButton").addEventListener("click", refresh);

  d.readyState === "loading"
    ? d.addEventListener("DOMContentLoaded", refresh)
    : refresh();
})(window, document);
