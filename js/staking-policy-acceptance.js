/* ALBUKHR Mainnet staking policy acceptance bridge v1.
 * Loads after the existing staking, Internal staking and project page engines.
 * It records explicit acceptance through the trusted API before any U2A flow.
 * No policy, identity, wallet, fee, network or acceptance fields are trusted
 * from browser storage or from a request supplied by the investor.
 */
(function (window, document) {
  "use strict";

  if (window.AlbukhrStakingPolicyAcceptance) return;

  const POLICY_LABEL = "ALBUKHR Global Financial Governance Standard v1.0";
  const ACCEPTANCE_ROUTE = "/api/staking-policy-acceptance";
  const API_PAYMENT_ROUTES = new Set([
    "/api/pi-payment-approve",
    "/api/pi-payment-complete",
    "/api/internal-payment-approve",
    "/api/internal-payment-complete"
  ]);

  let activeAcceptance = null;
  let originalFetch = null;
  let originalPiCreatePayment = null;
  let currentProject = null;
  let renderSequence = 0;
  let reviewPanel = null;
  let reviewSummary = null;
  let consentCheckbox = null;
  let reviewStatus = null;

  const $ = (id) => document.getElementById(id);
  const clean = (value) => String(value == null ? "" : value).trim();

  function fail(message) {
    const error = new Error(message);
    error.code = "STAKING_POLICY_ACCEPTANCE_REQUIRED";
    throw error;
  }

  function makeIdempotencyKey() {
    if (!window.crypto || typeof window.crypto.randomUUID !== "function") {
      fail("This browser cannot create a secure acceptance request ID. Update Pi Browser and try again.");
    }
    return window.crypto.randomUUID();
  }

  async function resolveCurrentProject(projectKey) {
    if (window.AlbukhrProjectPage && typeof window.AlbukhrProjectPage.resolveProject === "function") {
      const resolved = await window.AlbukhrProjectPage.resolveProject();
      if (resolved && resolved.network === "mainnet") return resolved;
    }

    if (typeof window.getProjectConfig === "function") {
      const config = window.getProjectConfig(projectKey);
      if (config) return config;
    }

    fail("The authoritative project details are unavailable. Reload the project page.");
  }

  async function loadTerm(project, durationDays) {
    const projectKey = clean(project.project_code || project.project_id || project.slug);
    if (typeof window.getStakingTerms !== "function") {
      fail("The published staking terms service is unavailable.");
    }

    const terms = await window.getStakingTerms(projectKey);
    const term = (Array.isArray(terms) ? terms : []).find((item) =>
      Number(item.duration_days) === Number(durationDays)
    );
    if (!term) fail("This exact staking offer is not currently published and available.");
    if (!clean(term.term_version_id)) fail("The published offer has no authoritative term version ID.");
    if (!clean(term.disclosure_version) || !clean(term.consent_version)) {
      fail("This offer cannot be accepted because its disclosure or consent version is missing.");
    }
    return term;
  }

  function formatValue(value) {
    if (value == null || value === "") return "Not specified in this published offer";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    try { return JSON.stringify(value, null, 2); } catch (_) { return "Offer detail unavailable"; }
  }

  function appendDetail(parent, label, value) {
    const item = document.createElement("div");
    item.className = "albukhr-acceptance-detail";
    const heading = document.createElement("strong");
    heading.textContent = label;
    const content = document.createElement("span");
    content.textContent = formatValue(value);
    item.appendChild(heading);
    item.appendChild(content);
    parent.appendChild(item);
  }

  function ensureReviewPanel() {
    if (reviewPanel && reviewPanel.isConnected) return reviewPanel;
    const durationSelect = $("durationSelect");
    if (!durationSelect || !durationSelect.parentElement) return null;

    reviewPanel = document.createElement("section");
    reviewPanel.id = "stakingPolicyAcceptancePanel";
    reviewPanel.className = "staking-policy-acceptance-panel";
    reviewPanel.setAttribute("aria-live", "polite");

    const title = document.createElement("h4");
    title.textContent = "Review your exact staking offer";
    reviewPanel.appendChild(title);

    const policySummary = document.createElement("p");
    policySummary.className = "staking-policy-standard-summary";
    policySummary.textContent = "Standard v1.0 controls apply globally: investor principal, Reward Reserve, Withdrawal Liquidity Reserve, operating capital and restricted funds remain separate; accepted terms are immutable; eligibility, payment verification, reserve controls and settlement are decided by the trusted ALBUKHR backend; financial corrections use an auditable compensating entry rather than overwriting history.";
    reviewPanel.appendChild(policySummary);

    reviewSummary = document.createElement("div");
    reviewSummary.id = "stakingPolicyOfferSummary";
    reviewPanel.appendChild(reviewSummary);

    reviewStatus = document.createElement("p");
    reviewStatus.id = "stakingPolicyAcceptanceStatus";
    reviewStatus.className = "staking-policy-status";
    reviewPanel.appendChild(reviewStatus);

    const consentRow = document.createElement("label");
    consentRow.className = "staking-policy-consent";
    consentCheckbox = document.createElement("input");
    consentCheckbox.type = "checkbox";
    consentCheckbox.id = "stakingPolicyConsentCheckbox";
    consentCheckbox.disabled = true;
    const consentText = document.createElement("span");
    consentText.textContent = `I have read and accept the approved ${POLICY_LABEL}, this project's exact published staking terms, and the displayed disclosure and consent versions.`;
    consentRow.appendChild(consentCheckbox);
    consentRow.appendChild(consentText);
    reviewPanel.appendChild(consentRow);

    durationSelect.insertAdjacentElement("afterend", reviewPanel);
    return reviewPanel;
  }

  async function renderSelectedOffer() {
    const sequence = ++renderSequence;
    const panel = ensureReviewPanel();
    if (!panel) return;
    reviewSummary.replaceChildren();
    if (consentCheckbox) {
      consentCheckbox.checked = false;
      consentCheckbox.disabled = true;
    }
    if (reviewStatus) reviewStatus.textContent = "Loading the authoritative published offer…";

    try {
      const project = await resolveCurrentProject(new URLSearchParams(window.location.search).get("project") || "");
      if (sequence !== renderSequence) return;
      currentProject = project;
      const durationDays = Number($("durationSelect")?.value);
      if (!Number.isInteger(durationDays) || durationDays <= 0) {
        if (reviewStatus) reviewStatus.textContent = "Choose a published duration to review its terms.";
        return;
      }
      const term = await loadTerm(project, durationDays);
      if (sequence !== renderSequence) return;
      appendDetail(reviewSummary, "Project", project.name || project.title || project.project_code);
      appendDetail(reviewSummary, "Network", "MAINNET");
      appendDetail(reviewSummary, "Term version", term.term_version_id);
      appendDetail(reviewSummary, "Duration", `${term.duration_days} days`);
      appendDetail(reviewSummary, "Minimum investment", `${term.min_stake} Pi`);
      appendDetail(reviewSummary, "Maximum investment", term.max_stake == null ? "No maximum stated" : `${term.max_stake} Pi`);
      appendDetail(reviewSummary, "Reward model", term.reward_model);
      appendDetail(reviewSummary, "Reward rate", term.reward_rate == null ? "Not specified" : term.reward_rate);
      appendDetail(reviewSummary, "Reward definition", term.reward_definition);
      appendDetail(reviewSummary, "Early withdrawal policy", term.early_withdrawal_policy);
      appendDetail(reviewSummary, "Capital withdrawal policy", term.capital_withdrawal_policy);
      appendDetail(reviewSummary, "Reward withdrawal policy", term.reward_withdrawal_policy);
      appendDetail(reviewSummary, "Disclosure version", term.disclosure_version);
      appendDetail(reviewSummary, "Consent version", term.consent_version);
      if (reviewStatus) reviewStatus.textContent = "Read the offer details, then explicitly tick the acceptance box before confirming.";
      if (consentCheckbox) consentCheckbox.disabled = false;
      panel.dataset.termVersionId = term.term_version_id;
      panel.dataset.projectCode = clean(project.project_code);
    } catch (error) {
      if (reviewStatus) reviewStatus.textContent = error?.message || "The published offer could not be loaded.";
      if (panel) panel.dataset.termVersionId = "";
    }
  }

  async function recordAcceptance(input) {
    const durationDays = Number(input.duration || $("durationSelect")?.value);
    const project = await resolveCurrentProject(input.project);
    if (String(project.network || "").toLowerCase() !== "mainnet") fail("Staking policy acceptance is Mainnet only.");
    if (String(project.status || "").toLowerCase() !== "active") fail("Only ACTIVE projects can accept new staking commitments.");

    const term = await loadTerm(project, durationDays);
    if (!consentCheckbox || consentCheckbox.checked !== true || consentCheckbox.disabled) {
      fail("Read the exact offer and tick the acceptance box before continuing.");
    }
    if (clean(reviewPanel?.dataset.termVersionId) !== clean(term.term_version_id)) {
      fail("The displayed offer changed. Review it again before accepting.");
    }

    const api = window.AlbukhrApi;
    if (!api || typeof api.post !== "function") fail("The trusted ALBUKHR API is not available.");

    const response = await api.post(ACCEPTANCE_ROUTE, {
      accepted: true,
      project_code: project.project_code,
      term_version_id: term.term_version_id,
      idempotency_key: makeIdempotencyKey()
    });

    const acceptanceId = clean(response?.acceptance_id);
    const termHash = clean(response?.term_hash);
    const policyHash = clean(response?.policy_hash);
    const policyRevision = clean(response?.policy_revision);
    if (!acceptanceId || !/^[0-9a-f]{64}$/i.test(termHash) || !/^[0-9a-f]{64}$/i.test(policyHash) || !policyRevision) {
      fail("The server did not return a complete, verified acceptance record.");
    }

    return {
      acceptance_id: acceptanceId,
      term_hash: termHash,
      policy_hash: policyHash,
      policy_revision: policyRevision,
      project_id: clean(project.project_id || project.id),
      project_code: clean(project.project_code),
      term_version_id: clean(term.term_version_id)
    };
  }

  function withAcceptanceContext(acceptance, operation) {
    if (activeAcceptance) fail("Another staking acceptance/payment is already active in this page.");
    activeAcceptance = acceptance;

    const originalCreatePayment = window.Pi?.createPayment;
    if (typeof originalCreatePayment !== "function") {
      activeAcceptance = null;
      fail("Pi payment API is unavailable. Open ALBUKHR in Pi Browser.");
    }
    originalPiCreatePayment = originalCreatePayment;
    try {
      window.Pi.createPayment = function (paymentData, callbacks) {
        if (!activeAcceptance) return originalCreatePayment.apply(this, arguments);
        const metadata = {
          ...(paymentData?.metadata || {}),
          acceptance_id: activeAcceptance.acceptance_id,
          term_hash: activeAcceptance.term_hash,
          policy_hash: activeAcceptance.policy_hash,
          policy_revision: activeAcceptance.policy_revision
        };
        return originalCreatePayment.call(this, { ...paymentData, metadata }, callbacks);
      };
      if (window.Pi.createPayment === originalCreatePayment) {
        throw new Error("Pi payment metadata hook could not be installed.");
      }

      originalFetch = window.fetch;
      window.fetch = function (input, init = {}) {
      if (!activeAcceptance || !init || String(init.method || "GET").toUpperCase() !== "POST") {
        return originalFetch.apply(this, arguments);
      }
      let url = "";
      try { url = typeof input === "string" ? input : input?.url || ""; } catch (_) { url = ""; }
      const pathname = (() => { try { return new URL(url, window.location.href).pathname; } catch (_) { return ""; } })();
      if (!API_PAYMENT_ROUTES.has(pathname) || typeof init.body !== "string") {
        return originalFetch.apply(this, arguments);
      }
      let payload;
      try { payload = JSON.parse(init.body); } catch (_) { return originalFetch.apply(this, arguments); }
      const amended = {
        ...payload,
        acceptance_id: activeAcceptance.acceptance_id
      };
      return originalFetch.call(this, input, { ...init, body: JSON.stringify(amended) });
      };
    } catch (error) {
      if (originalFetch) window.fetch = originalFetch;
      if (window.Pi) window.Pi.createPayment = originalCreatePayment;
      originalFetch = null;
      originalPiCreatePayment = null;
      activeAcceptance = null;
      fail(error?.message || "Unable to bind the exact policy acceptance to this Pi payment.");
    }

    return Promise.resolve().then(operation).finally(() => {
      if (originalFetch) window.fetch = originalFetch;
      if (window.Pi && originalCreatePayment) window.Pi.createPayment = originalCreatePayment;
      originalFetch = null;
      originalPiCreatePayment = null;
      activeAcceptance = null;
    });
  }

  function wrapStakeMethod(owner, key) {
    if (!owner || typeof owner[key] !== "function" || owner[key].__stakingAcceptanceWrapped) return;
    const original = owner[key];
    const wrapped = async function (input = {}) {
      const acceptance = await recordAcceptance(input);
      return withAcceptanceContext(acceptance, () => original.call(this, input));
    };
    Object.defineProperty(wrapped, "__stakingAcceptanceWrapped", { value: true });
    owner[key] = wrapped;
  }

  function install() {
    const durationSelect = $("durationSelect");
    if (durationSelect && !durationSelect.__policyAcceptanceBound) {
      durationSelect.addEventListener("change", renderSelectedOffer);
      durationSelect.__policyAcceptanceBound = true;
      const observer = new MutationObserver(renderSelectedOffer);
      observer.observe(durationSelect, { childList: true });
    }

    wrapStakeMethod(window, "addStake");

    if (typeof window.confirmStake === "function" && !window.confirmStake.__policyAcceptanceBound) {
      const originalConfirm = window.confirmStake;
      const guarded = async function () {
        if (!consentCheckbox || consentCheckbox.checked !== true || consentCheckbox.disabled) {
          if (window.showAlert) window.showAlert("Acceptance Required", "Review the exact published offer and tick the acceptance box first.");
          else window.alert("Review the exact published offer and tick the acceptance box first.");
          return;
        }
        return originalConfirm.apply(this, arguments);
      };
      Object.defineProperty(guarded, "__policyAcceptanceBound", { value: true });
      window.confirmStake = guarded;
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    .staking-policy-acceptance-panel{margin:14px 0;padding:14px;border:1px solid #d8e2dc;border-radius:12px;background:#f8fbf9;color:#213329;font-size:13px;max-height:260px;overflow:auto}
    .staking-policy-acceptance-panel h4{margin:0 0 10px;font-size:14px}
    .staking-policy-standard-summary{margin:0 0 10px;padding:8px 10px;border-left:3px solid #3d7759;background:#eef5f0;line-height:1.5}
    .albukhr-acceptance-detail{display:grid;grid-template-columns:minmax(110px,34%) 1fr;gap:8px;padding:6px 0;border-bottom:1px solid #e5ece7;overflow-wrap:anywhere}
    .albukhr-acceptance-detail strong{font-weight:700}
    .albukhr-acceptance-detail span{white-space:pre-wrap;min-width:0}
    .staking-policy-status{margin:10px 0;color:#52665a}
    .staking-policy-consent{display:flex;align-items:flex-start;gap:9px;line-height:1.45;font-weight:600}
    .staking-policy-consent input{margin-top:3px;flex:0 0 auto}
  `;
  document.head.appendChild(style);

  window.AlbukhrStakingPolicyAcceptance = Object.freeze({
    renderSelectedOffer,
    recordAcceptance,
    install
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})(window, document);
