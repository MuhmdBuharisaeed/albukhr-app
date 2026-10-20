/* ALBUKHR Investor Transaction History v1
 * Read-only UI over the existing trusted Mainnet API.
 * This page never writes financial rows and never starts Pi payments.
 */
(function (window, document) {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const API = () => window.AlbukhrApi;
  const AUTH = () => window.AlbukhrPiAuth;
  let records = [];
  let isLoading = false;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

  const num = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const pi = (value) => `${num(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7
  })} Pi`;

  const dateTime = (value) => {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
  };

  const normalize = (value) => String(value ?? "").trim().toLowerCase();
  const humanize = (value) => String(value ?? "Unknown").replace(/[_-]+/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());

  function setStatus(message, kind = "info") {
    const node = $("securityStatus");
    node.textContent = message;
    node.className = `transactions-status ${kind === "error" ? "is-error" : kind === "success" ? "is-success" : ""}`.trim();
  }

  function assertMainnetReady() {
    const env = window.ALBukhrEnvironment;
    const core = window.ALBUKHR_SUPABASE;
    if (!env || typeof env.isKnown !== "function" || typeof env.isMainnet !== "function" ||
        !env.isKnown() || !env.isMainnet()) {
      throw new Error("Investor transaction history is available only in the verified Mainnet environment.");
    }
    if (!core || !core.client || normalize(core.environment) !== "mainnet" || normalize(core.network) !== "mainnet") {
      throw new Error("Mainnet Supabase Core is unavailable or does not match the current environment.");
    }
    if (!AUTH() || typeof AUTH().ensurePiAuth !== "function" || !API() || typeof API().get !== "function") {
      throw new Error("ALBUKHR authentication or trusted API Core is unavailable.");
    }
  }

  function normalizeInvestment(stake) {
    const snapshot = stake.contract_snapshot && typeof stake.contract_snapshot === "object"
      ? stake.contract_snapshot : {};
    const projectType = normalize(snapshot.project_type || (stake.internal_investment_payment_id ? "internal" : "core"));
    const status = normalize(stake.status) || "unknown";
    const ref = String(stake.payment_id || stake.payment_record_id || stake.id || "");
    const occurredAt = stake.start_at || stake.created_at || stake.verified_at || null;
    return {
      key: `investment:${stake.id || ref}`,
      kind: "investment",
      kindLabel: projectType === "internal" ? "Internal investment" : "Core investment",
      projectCode: String(stake.project_code || snapshot.project_code || "ALBUKHR Project"),
      amount: num(stake.amount),
      date: occurredAt,
      sortTime: Date.parse(occurredAt || "") || 0,
      status: "settled",
      statusLabel: "Settled",
      reference: ref,
      stakeId: String(stake.id || "—"),
      durationDays: Number(stake.duration_days) || null,
      positionStatus: status,
      unlockAt: stake.unlock_at || null,
      rewardAmount: num(stake.reward_amount),
      paymentId: String(stake.payment_id || ""),
      network: normalize(stake.network),
      searchText: ["investment", projectType, stake.project_code, stake.payment_id, stake.id, snapshot.project_code].join(" ").toLowerCase()
    };
  }

  function normalizeWithdrawal(row) {
    const status = normalize(row.status) || "unknown";
    const occurredAt = row.created_at || null;
    const isPaid = status === "paid";
    return {
      key: `withdrawal:${row.id}`,
      kind: "withdrawal",
      kindLabel: `${humanize(row.withdrawal_type)} withdrawal`,
      projectCode: String(row.project_code || "ALBUKHR Project"),
      amount: num(row.requested_amount),
      feeRate: num(row.fee_rate),
      feeAmount: num(row.fee_amount),
      netAmount: num(row.net_amount),
      date: occurredAt,
      sortTime: Date.parse(occurredAt || "") || 0,
      status,
      statusLabel: humanize(status),
      reference: String(row.id || ""),
      withdrawalId: String(row.id || "—"),
      stakeId: String(row.stake_id || "—"),
      txid: String(row.txid || ""),
      network: normalize(row.network),
      paidAmount: isPaid ? num(row.net_amount) : 0,
      searchText: ["withdrawal", row.withdrawal_type, row.project_code, row.id, row.stake_id, row.txid, status].join(" ").toLowerCase()
    };
  }

  function buildRecords(stakes, withdrawals) {
    const safeStakes = stakes
      .filter((row) => row && typeof row === "object" && normalize(row.network) === "mainnet")
      .map(normalizeInvestment);
    const safeWithdrawals = withdrawals
      .filter((row) => row && typeof row === "object" && normalize(row.network) === "mainnet")
      .map(normalizeWithdrawal);
    return [...safeStakes, ...safeWithdrawals].sort((a, b) => b.sortTime - a.sortTime);
  }

  function updateSummary() {
    $("summaryCount").textContent = records.length.toLocaleString();
    const invested = records.reduce((sum, row) => sum + (row.kind === "investment" ? row.amount : 0), 0);
    const withdrawn = records.reduce((sum, row) => sum + (row.kind === "withdrawal" ? row.paidAmount : 0), 0);
    const pending = records.filter((row) => row.kind === "withdrawal" && ["pending", "approved"].includes(row.status)).length;
    $("summaryInvested").textContent = pi(invested);
    $("summaryWithdrawn").textContent = pi(withdrawn);
    $("summaryPending").textContent = String(pending);
  }

  function renderRow(row) {
    const statusClass = ["pending", "approved"].includes(row.status) ? "status-waiting"
      : ["rejected", "failed", "cancelled"].includes(row.status) ? "status-negative"
      : row.status === "paid" || row.status === "settled" ? "status-positive" : "status-neutral";
    const amountTitle = row.kind === "investment" ? "Investment amount" : "Requested amount";
    const amountLine = `<div class="transaction-metric"><span>${amountTitle}</span><strong>${pi(row.amount)}</strong></div>`;
    const withdrawalMetrics = row.kind === "withdrawal" ? `
      <div class="transaction-metric"><span>Fee</span><strong>${pi(row.feeAmount)}</strong></div>
      <div class="transaction-metric"><span>Expected net amount</span><strong>${pi(row.netAmount)}</strong></div>` : `
      <div class="transaction-metric"><span>Duration</span><strong>${row.durationDays ? `${esc(row.durationDays)} days` : "—"}</strong></div>
      <div class="transaction-metric"><span>Position status</span><strong>${esc(humanize(row.positionStatus))}</strong></div>`;
    const referenceLabel = row.kind === "investment" ? "Payment reference" : "Withdrawal request ID";
    const referenceLine = `<div class="transaction-detail-line"><span>${referenceLabel}</span><code>${esc(row.reference || "Not recorded")}</code></div>`;
    const txidLine = row.kind === "withdrawal" && row.txid
      ? `<div class="transaction-detail-line"><span>Recorded blockchain TXID</span><code>${esc(row.txid)}</code></div>` : "";
    const unlockLine = row.kind === "investment" && row.unlockAt
      ? `<div class="transaction-detail-line"><span>Unlock time</span><span>${esc(dateTime(row.unlockAt))}</span></div>` : "";
    const stakeLine = row.kind === "withdrawal"
      ? `<div class="transaction-detail-line"><span>Related stake</span><code>${esc(row.stakeId)}</code></div>` : `<div class="transaction-detail-line"><span>Stake ID</span><code>${esc(row.stakeId)}</code></div>`;

    return `<article class="transaction-row" data-kind="${esc(row.kind)}" data-status="${esc(row.status)}">
      <div class="transaction-row-main">
        <div class="transaction-type-icon ${row.kind === "investment" ? "icon-investment" : "icon-withdrawal"}" aria-hidden="true">${row.kind === "investment" ? "↗" : "↙"}</div>
        <div class="transaction-primary">
          <div class="transaction-title-line"><h3>${esc(row.kindLabel)}</h3><span class="transaction-status ${statusClass}">${esc(row.statusLabel)}</span></div>
          <p class="transaction-project">${esc(row.projectCode)}</p>
          <p class="transaction-date">${esc(dateTime(row.date))}</p>
        </div>
        <div class="transaction-amount-block"><span>${row.kind === "investment" ? "Settled amount" : row.status === "paid" ? "Paid to wallet" : "Requested net"}</span><strong>${pi(row.kind === "investment" ? row.amount : row.status === "paid" ? row.netAmount : row.netAmount)}</strong></div>
      </div>
      <details class="transaction-details">
        <summary>View transaction details</summary>
        <div class="transaction-details-grid">
          ${amountLine}${withdrawalMetrics}
          <div class="transaction-metric"><span>Network</span><strong>MAINNET</strong></div>
        </div>
        <div class="transaction-reference-list">${referenceLine}${stakeLine}${txidLine}${unlockLine}</div>
      </details>
    </article>`;
  }

  function visibleRecords() {
    const query = normalize($("transactionSearch").value);
    const type = $("typeFilter").value;
    const status = $("statusFilter").value;
    return records.filter((row) => {
      if (type !== "all" && row.kind !== type) return false;
      if (status !== "all" && row.status !== status) return false;
      if (query && !row.searchText.includes(query) && !row.reference.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  function render() {
    const loading = $("transactionsLoading");
    const error = $("transactionsError");
    const empty = $("transactionsEmpty");
    const host = $("transactionsList");
    loading.hidden = true;
    error.hidden = true;
    const filtered = visibleRecords();
    host.innerHTML = filtered.map(renderRow).join("");
    empty.hidden = filtered.length > 0;
    if (filtered.length === 0) {
      $("emptyMessage").textContent = records.length
        ? "No records match the selected search and filters. Change your filters or clear the search."
        : "No settled investment records or withdrawal requests were returned for this verified Mainnet account.";
    }
    $("resultDescription").textContent = `Showing ${filtered.length.toLocaleString()} of ${records.length.toLocaleString()} record(s), newest first.`;
    updateSummary();
  }

  async function refresh() {
    if (isLoading) return;
    isLoading = true;
    const button = $("refreshButton");
    button.disabled = true;
    $("transactionsLoading").hidden = false;
    $("transactionsError").hidden = true;
    $("transactionsEmpty").hidden = true;
    $("transactionsList").innerHTML = "";
    $("resultDescription").textContent = "Loading records from the Mainnet API…";
    setStatus("Verifying your Mainnet identity…");
    try {
      assertMainnetReady();
      const user = await AUTH().ensurePiAuth();
      if (!user || normalize(user.network) !== "mainnet" || !user.pi_uid) {
        throw new Error("A verified Mainnet Pi identity is required to view transaction history.");
      }
      const [stakes, withdrawals] = await Promise.all([
        API().get("/api/my-stakes?network=mainnet"),
        API().get("/api/my-withdrawals?network=mainnet")
      ]);
      if (!Array.isArray(stakes) || !Array.isArray(withdrawals)) {
        throw new Error("The trusted Mainnet API returned an unexpected transaction history response.");
      }
      records = buildRecords(stakes, withdrawals);
      render();
      setStatus("Mainnet identity verified. Only this account’s returned Mainnet records are shown.", "success");
    } catch (error) {
      console.error("[ALBUKHR TRANSACTION HISTORY] Read failed", error);
      records = [];
      $("transactionsLoading").hidden = true;
      $("transactionsEmpty").hidden = true;
      $("transactionsList").innerHTML = "";
      $("transactionsError").hidden = false;
      $("transactionsErrorMessage").textContent = error?.message || "Could not load transaction history. Please try again.";
      $("resultDescription").textContent = "Records could not be loaded.";
      updateSummary();
      setStatus("Transaction history could not be verified.", "error");
    } finally {
      button.disabled = false;
      isLoading = false;
    }
  }

  $("refreshButton").addEventListener("click", refresh);
  $("retryButton").addEventListener("click", refresh);
  $("transactionSearch").addEventListener("input", render);
  $("typeFilter").addEventListener("change", render);
  $("statusFilter").addEventListener("change", render);
  document.querySelectorAll(".dock-item").forEach((link) => {
    if (link.getAttribute("href") === (window.location.pathname.split("/").pop() || "index.html")) {
      link.classList.add("active");
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh, { once: true });
  } else {
    refresh();
  }
})(window, document);
