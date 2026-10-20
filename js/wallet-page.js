/* ALBUKHR Wallet V1
 * Read-only investor wallet overview through the existing trusted Mainnet API.
 * No direct Supabase queries, browser-side ledger, LocalStorage, or Pi payment calls.
 */
(function (window, document) {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const API = () => window.AlbukhrApi;
  const AUTH = () => window.AlbukhrPiAuth;
  const MAINNET = "mainnet";
  const CONTRACT_VERSION = "ALBUKHR_WALLET_BALANCE_V1";

  let isLoading = false;
  let hideBalances = false;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function pi(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} Pi`;
  }

  function dateTime(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Not recorded";
    return date.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  function dateOnly(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Not recorded";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function setStatus(message, kind = "") {
    const node = $("securityStatus");
    node.textContent = message;
    node.className = `wallet-status${kind ? ` is-${kind}` : ""}`;
  }

  function setState(id, message, kind = "") {
    const node = $(id);
    node.textContent = message;
    node.className = `wallet-state${kind ? ` is-${kind}` : ""}`;
    node.hidden = false;
  }

  function clearState(id) {
    const node = $(id);
    node.textContent = "";
    node.hidden = true;
  }

  function assertMainnetReady() {
    const env = window.ALBukhrEnvironment;
    const core = window.ALBUKHR_SUPABASE;
    if (!env || typeof env.isKnown !== "function" || typeof env.isMainnet !== "function" ||
        !env.isKnown() || !env.isMainnet()) {
      throw new Error("ALBUKHR Wallet is available only in the verified Mainnet environment.");
    }
    if (!core || typeof core.isNetwork !== "function" || !core.isNetwork(MAINNET)) {
      throw new Error("Mainnet Supabase Core is unavailable or does not match the current environment.");
    }
    if (!AUTH() || typeof AUTH().ensurePiAuth !== "function" || typeof AUTH().getWalletAddress !== "function" ||
        !API() || typeof API().get !== "function") {
      throw new Error("ALBUKHR authentication or trusted API Core is unavailable.");
    }
  }

  function validatePayload(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("The trusted Mainnet API returned an unexpected Wallet response.");
    }
    if (data.contract_version !== CONTRACT_VERSION || normalize(data.network) !== MAINNET ||
        !data.summary || typeof data.summary !== "object" || !Array.isArray(data.positions) ||
        !Array.isArray(data.recent_withdrawals) || !data.withdrawal_destination || typeof data.withdrawal_destination !== "object") {
      throw new Error("The trusted Mainnet API returned a Wallet response that does not match the approved contract.");
    }
    return data;
  }

  function setAmountText(node, value) {
    if (!node) return;
    const text = pi(value);
    node.dataset.visibleAmount = text;
    node.textContent = hideBalances ? "•••••• Pi" : text;
    node.classList.toggle("is-hidden", hideBalances);
    node.setAttribute("aria-label", hideBalances ? "Amount hidden" : text);
  }

  function updateHiddenBalances() {
    document.querySelectorAll("[data-visible-amount]").forEach((node) => {
      node.textContent = hideBalances ? "•••••• Pi" : (node.dataset.visibleAmount || "—");
      node.classList.toggle("is-hidden", hideBalances);
      node.setAttribute("aria-label", hideBalances ? "Amount hidden" : (node.dataset.visibleAmount || "Amount unavailable"));
    });
    const button = $("toggleBalances");
    button.textContent = hideBalances ? "Show amounts" : "Hide amounts";
    button.setAttribute("aria-pressed", String(hideBalances));
  }

  function renderSummary(data) {
    const s = data.summary;
    setAmountText($("totalRequestable"), s.total_requestable_pi);
    setAmountText($("totalPrincipal"), s.total_invested_principal_pi);
    setAmountText($("recordedRewards"), s.recorded_reward_total_pi);
    $("openRequestsCount").textContent = Number.isInteger(Number(s.open_withdrawal_requests_count))
      ? Number(s.open_withdrawal_requests_count).toLocaleString() : "—";
    setAmountText($("activePrincipal"), s.active_principal_recorded_pi);
    setAmountText($("capitalRequestable"), s.matured_capital_requestable_pi);
    setAmountText($("rewardRequestable"), s.matured_reward_requestable_pi);
    setAmountText($("pendingToUser"), s.pending_withdrawal_to_user_pi);
    setAmountText($("pendingFees"), s.pending_withdrawal_fee_pi);
    setAmountText($("pendingDeduction"), s.pending_total_deduction_pi);
    setAmountText($("paidToUser"), s.withdrawals_paid_to_user_pi);
    setAmountText($("paidFees"), s.withdrawal_fees_paid_pi);
    setAmountText($("reviewRewards"), s.closed_position_rewards_held_for_review_pi);
    updateHiddenBalances();
  }

  function maskAddress(value) {
    const address = String(value ?? "").trim();
    if (!address) return "Not available";
    if (address.length <= 16) return address;
    return `${address.slice(0, 7)}…${address.slice(-6)}`;
  }

  function renderDestination(data, sessionWalletAddress) {
    const registered = String(data.withdrawal_destination.registered_address ?? "").trim();
    const session = String(sessionWalletAddress ?? "").trim();
    $("sessionAddress").textContent = maskAddress(session);
    $("registeredAddress").textContent = maskAddress(registered);

    const badge = $("destinationBadge");
    const message = $("destinationMessage");
    const link = $("withdrawLink");
    const note = $("withdrawLinkNote");
    link.classList.remove("is-disabled");
    link.removeAttribute("aria-disabled");
    link.removeAttribute("tabindex");
    link.setAttribute("href", "withdraw.html");

    if (!registered) {
      badge.className = "wallet-badge wallet-badge-warning";
      badge.textContent = "Destination missing";
      message.className = "wallet-destination-message is-warning";
      message.textContent = "No withdrawal destination is registered for this Mainnet account. Wallet will not label withdrawals as ready. Use only ALBUKHR’s authorized destination-registration process; do not submit an address through this page.";
      disableWithdrawLink(link, note, "Withdrawal destination is missing. The current page does not register or change wallet addresses.");
      return false;
    }

    if (!session) {
      badge.className = "wallet-badge wallet-badge-warning";
      badge.textContent = "Session address unavailable";
      message.className = "wallet-destination-message is-warning";
      message.textContent = "The current authenticated Pi SDK session did not expose a wallet address, so Wallet cannot verify that the saved withdrawal destination matches it.";
      disableWithdrawLink(link, note, "Wallet cannot verify the current Pi SDK session address. Refresh or re-authenticate before requesting a withdrawal.");
      return false;
    }

    // Pi addresses are compared exactly after trimming. Do not lowercase a Base58 address.
    if (registered !== session) {
      badge.className = "wallet-badge wallet-badge-warning";
      badge.textContent = "Address mismatch";
      message.className = "wallet-destination-message is-warning";
      message.textContent = "The saved ALBUKHR withdrawal destination does not exactly match your current Pi SDK session address. Wallet has disabled the withdrawal link to avoid encouraging a request to an unexpected destination. Resolve the saved destination through the authorized ALBUKHR process.";
      disableWithdrawLink(link, note, "Saved destination and current Pi SDK session do not match. Withdrawal request link is disabled here.");
      return false;
    }

    badge.className = "wallet-badge wallet-badge-match";
    badge.textContent = "Address matched";
    message.className = "wallet-destination-message is-match";
    message.textContent = "The saved destination matches the current authenticated Pi SDK session address. This is a destination check only; each withdrawal request remains subject to server-side eligibility, fees and authorized review.";
    note.textContent = "Address matched. The existing withdrawal page still validates eligibility and does not send Pi when a request is submitted.";
    return true;
  }

  function disableWithdrawLink(link, note, reason) {
    link.removeAttribute("href");
    link.setAttribute("aria-disabled", "true");
    link.setAttribute("tabindex", "-1");
    link.classList.add("is-disabled");
    note.textContent = reason;
  }

  function humanize(value) {
    return String(value ?? "unknown").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
      .replace(/\b\w/g, (char) => char.toUpperCase()) || "Unknown";
  }

  function statusClass(value) {
    const status = normalize(value);
    if (["active", "matured", "paid"].includes(status)) return "is-good";
    if (["pending", "approved"].includes(status)) return "is-waiting";
    if (["rejected", "cancelled", "capital_withdrawn"].includes(status)) return "is-danger";
    return "";
  }

  function renderPositions(positions) {
    const list = $("positionsList");
    $("positionCount").textContent = positions.length.toLocaleString();
    list.replaceChildren();
    if (!positions.length) {
      setState("positionsState", "No Mainnet investment positions were returned for this verified account. This may be an empty account or no settled positions in the current Mainnet records.");
      return;
    }
    clearState("positionsState");

    list.innerHTML = positions.map((position) => {
      const status = normalize(position.status) || "unknown";
      const issues = Array.isArray(position.eligibility_issue_codes) ? position.eligibility_issue_codes : [];
      const issueMarkup = issues.length
        ? `<div class="wallet-issues" aria-label="Eligibility notes">${issues.map((issue) => `<span class="wallet-issue">${escapeHtml(humanize(issue))}</span>`).join("")}</div>`
        : "";
      return `<article class="wallet-position-card">
        <div class="wallet-position-head"><div><h3 class="wallet-position-title">${escapeHtml(position.project_code || "ALBUKHR Project")}</h3><p class="wallet-position-subtitle">Position ${escapeHtml(position.stake_id || "Not available")} · Started ${escapeHtml(dateOnly(position.started_at))}</p></div><span class="wallet-status-pill ${statusClass(status)}">${escapeHtml(humanize(status))}</span></div>
        <div class="wallet-position-grid">
          <div class="wallet-position-metric"><span>Recorded principal</span><strong class="wallet-amount" data-visible-amount="${escapeHtml(pi(position.principal_pi))}">${escapeHtml(hideBalances ? "•••••• Pi" : pi(position.principal_pi))}</strong></div>
          <div class="wallet-position-metric"><span>Recorded reward</span><strong class="wallet-amount" data-visible-amount="${escapeHtml(pi(position.recorded_reward_pi))}">${escapeHtml(hideBalances ? "•••••• Pi" : pi(position.recorded_reward_pi))}</strong></div>
          <div class="wallet-position-metric"><span>Unlock date</span><strong>${escapeHtml(dateOnly(position.unlock_at))}</strong></div>
          <div class="wallet-position-metric"><span>Capital eligible to request</span><strong class="wallet-amount" data-visible-amount="${escapeHtml(pi(position.capital_requestable_pi))}">${escapeHtml(hideBalances ? "•••••• Pi" : pi(position.capital_requestable_pi))}</strong></div>
          <div class="wallet-position-metric"><span>Rewards eligible to request</span><strong class="wallet-amount" data-visible-amount="${escapeHtml(pi(position.reward_requestable_pi))}">${escapeHtml(hideBalances ? "•••••• Pi" : pi(position.reward_requestable_pi))}</strong></div>
          <div class="wallet-position-metric"><span>Maturity check</span><strong>${position.is_matured === true ? "Matured" : "Not matured"}</strong></div>
        </div>${issueMarkup}
      </article>`;
    }).join("");
    updateHiddenBalances();
  }

  function renderActivity(rows) {
    const list = $("activityList");
    list.replaceChildren();
    if (!rows.length) {
      setState("activityState", "No withdrawal requests were returned for this verified Mainnet account.");
      return;
    }
    clearState("activityState");
    list.innerHTML = rows.map((row) => {
      const status = normalize(row.status) || "unknown";
      const txid = row.txid ? `<div class="wallet-activity-txid">Recorded transaction ID: <code>${escapeHtml(row.txid)}</code></div>` : "";
      return `<article class="wallet-activity-card">
        <div class="wallet-activity-head"><div><strong>${escapeHtml(row.project_code || "ALBUKHR Project")} · ${escapeHtml(humanize(row.withdrawal_type))} withdrawal</strong><p class="wallet-activity-meta">${escapeHtml(dateTime(row.created_at))} · Request ${escapeHtml(row.id || "Not available")}</p></div><span class="wallet-status-pill ${statusClass(status)}">${escapeHtml(humanize(status))}</span></div>
        <div class="wallet-activity-amounts">
          <div><span>Requested</span><strong class="wallet-amount" data-visible-amount="${escapeHtml(pi(row.requested_amount_pi))}">${escapeHtml(hideBalances ? "•••••• Pi" : pi(row.requested_amount_pi))}</strong></div>
          <div><span>Fee</span><strong class="wallet-amount" data-visible-amount="${escapeHtml(pi(row.fee_amount_pi))}">${escapeHtml(hideBalances ? "•••••• Pi" : pi(row.fee_amount_pi))}</strong></div>
          <div><span>Net amount</span><strong class="wallet-amount" data-visible-amount="${escapeHtml(pi(row.net_amount_pi))}">${escapeHtml(hideBalances ? "•••••• Pi" : pi(row.net_amount_pi))}</strong></div>
        </div>${txid}
      </article>`;
    }).join("");
    updateHiddenBalances();
  }

  async function refresh() {
    if (isLoading) return;
    isLoading = true;
    const button = $("refreshButton");
    button.disabled = true;
    button.textContent = "Refreshing…";
    setStatus("Verifying your Mainnet identity and reading Wallet data…");
    setState("positionsState", "Loading positions…");
    setState("activityState", "Loading recent withdrawals…");

    try {
      assertMainnetReady();
      const guard = window.AlbukhrPageAuthGuard;
      if (!guard || typeof guard.waitForAuth !== "function") {
        throw new Error("ALBUKHR Page Auth Guard is unavailable.");
      }
      const user = await guard.waitForAuth();
      if (!user || normalize(user.network) !== MAINNET || !user.id || !user.pi_uid) {
        throw new Error("A verified ALBUKHR Mainnet identity is required to view Wallet data.");
      }
      const sessionWalletAddress = AUTH().getWalletAddress();
      const data = validatePayload(await API().get("/api/my-wallet?network=mainnet"));
      renderSummary(data);
      renderDestination(data, sessionWalletAddress);
      renderPositions(data.positions);
      renderActivity(data.recent_withdrawals);
      $("lastUpdated").textContent = `Last updated: ${dateTime(data.as_of)}`;
      setStatus("Mainnet identity verified. Wallet figures were read from the trusted API. No payment or withdrawal was initiated.", "success");
    } catch (error) {
      console.error("[ALBUKHR WALLET PAGE] Wallet read failed", error);
      setStatus(error?.message || "Wallet data could not be loaded. Retry after checking your authenticated Mainnet session.", "error");
      setState("positionsState", "Positions could not be loaded. No balance has been estimated in the browser.", "error");
      setState("activityState", "Recent withdrawal activity could not be loaded.", "error");
      $("positionCount").textContent = "—";
      $("positionsList").replaceChildren();
      $("activityList").replaceChildren();
      $("lastUpdated").textContent = "Last updated: unavailable";
      ["totalRequestable", "totalPrincipal", "recordedRewards", "activePrincipal", "capitalRequestable", "rewardRequestable", "pendingToUser", "pendingFees", "pendingDeduction", "paidToUser", "paidFees", "reviewRewards"].forEach((id) => {
        const node = $(id);
        node.textContent = "—";
        node.dataset.visibleAmount = "—";
      });
      $("openRequestsCount").textContent = "—";
      $("sessionAddress").textContent = "Unavailable";
      $("registeredAddress").textContent = "Unavailable";
      $("destinationBadge").className = "wallet-badge wallet-badge-warning";
      $("destinationBadge").textContent = "Not verified";
      $("destinationMessage").className = "wallet-destination-message is-warning";
      $("destinationMessage").textContent = "The destination could not be checked because Wallet data failed to load.";
      disableWithdrawLink($("withdrawLink"), $("withdrawLinkNote"), "Wallet data is unavailable. Refresh before using the withdrawal workflow.");
    } finally {
      isLoading = false;
      button.disabled = false;
      button.textContent = "Refresh";
      updateHiddenBalances();
    }
  }

  $("refreshButton").addEventListener("click", refresh);
  $("toggleBalances").addEventListener("click", () => {
    hideBalances = !hideBalances;
    updateHiddenBalances();
  });

  document.querySelectorAll(".wallet-amount[data-visible-amount]").forEach((node) => {
    node.dataset.visibleAmount = "—";
    node.textContent = "—";
    node.setAttribute("aria-label", "Amount not loaded");
  });
  updateHiddenBalances();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh, { once: true });
  } else {
    refresh();
  }
})(window, document);
