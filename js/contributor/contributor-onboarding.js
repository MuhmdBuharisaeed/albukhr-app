/* =========================================================
   ALBUKHR CONTRIBUTOR ONBOARDING
   UI/controller layer

   Security model:
   - Invitation token is memory-only.
   - No LocalStorage or sessionStorage.
   - Pi identity is authenticated by ALBUKHR Pi Auth Core.
   - Contributor onboarding RPCs are NOT called directly from the browser.
   - Mainnet Contributor onboarding uses the ALBUKHR API Gateway.
   - The API verifies the Pi access token server-side and calls the
     service-role-only Supabase gateway RPCs.
   - The browser never supplies the authoritative Pi UID.
========================================================= */
(function(window){
  "use strict";

  const AUTH_TIMEOUT_MS = 20000;

  let invitationToken = null;
  let currentPolicy = null;
  let invitation = null;
  let authenticatedUser = null;

  const $ = (id) => document.getElementById(id);

  function setStatus(message, kind="info"){
    const el = $("status");
    if (!el) return;
    el.textContent = String(message || "");
    el.dataset.kind = kind;
  }

  function show(el, visible=true){
    if (!el) return;
    el.classList.toggle("hidden", !visible);
  }

  function getToken(){
    const token = new URLSearchParams(window.location.search).get("token");
    return token ? token.trim() : null;
  }

  function getApi(){
    const api = window.AlbukhrApi;

    if (!api || typeof api.post !== "function") {
      throw new Error("ALBUKHR API Core is unavailable.");
    }

    return api;
  }

  async function apiPost(path, payload){
    const response = await getApi().post(path, payload || {});

    if (!response || response.success !== true) {
      throw new Error(response?.message || response?.error || "ALBUKHR onboarding request failed.");
    }

    return response;
  }

  function withTimeout(promise, timeoutMs, message){
    let timer = null;

    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);
    });

    return Promise.race([promise, timeout]).finally(() => {
      if (timer !== null) window.clearTimeout(timer);
    });
  }

  function setOnboardingStep(step){
    const nodes = document.querySelectorAll("#onboardingSteps .onboarding-step");
    nodes.forEach((node) => {
      const value = Number(node.dataset.step || 0);
      node.classList.toggle("active", value === step);
      node.classList.toggle("completed", value < step);
    });
  }

  function updateAcceptButton(){
    const required = [
      "consentPolicy",
      "consentPrivacy",
      "consentRules",
      "consentProject"
    ]
      .map($)
      .every((el) => Boolean(el && el.checked));

    const button = $("acceptButton");
    if (button) button.disabled = !required;
  }

  function renderInvitation(data){
    invitation = data || null;
    const panel = $("identityPanel");
    if (!panel || !data) return;

    panel.innerHTML = "";

    const rows = [
      ["Invitation", "Verified", "verified"],
      ["Access", data.email_bound ? "Email-bound invitation" : "Invitation is not email-bound", ""],
      ["Expires", data.expires_at ? new Date(data.expires_at).toLocaleString() : "Not available", ""]
    ];

    rows.forEach(([label, value, cls]) => {
      const row = document.createElement("div");
      row.className = "identity-row";

      const labelEl = document.createElement("span");
      labelEl.className = "identity-label";
      labelEl.textContent = label;

      const valueEl = document.createElement("strong");
      valueEl.className = `identity-value${cls ? ` ${cls}` : ""}`;
      valueEl.textContent = value;

      row.append(labelEl, valueEl);
      panel.appendChild(row);
    });

    show(panel, true);
  }

  function renderPolicy(data){
    currentPolicy = data || null;
    if (!data) throw new Error("Current Contributor policy is unavailable.");

    const version = $("policyVersion");
    if (version){
      const effective = data.effective_at
        ? new Date(data.effective_at).toLocaleDateString()
        : "Not available";
      version.textContent = `Policy v${data.policy_version} · Privacy Notice v${data.privacy_version} · Effective ${effective}`;
    }
  }

  async function ensureAuthenticatedUser(){
    if (!window.AlbukhrPiAuth || typeof window.AlbukhrPiAuth.ensurePiAuth !== "function") {
      throw new Error("ALBUKHR Pi Auth Core is unavailable.");
    }

    setStatus("Verifying your Pi identity…");

    authenticatedUser = await withTimeout(
      window.AlbukhrPiAuth.ensurePiAuth(),
      AUTH_TIMEOUT_MS,
      "Pi authentication did not complete. Open ALBUKHR inside Pi Browser and try again."
    );

    if (!authenticatedUser?.id || !authenticatedUser?.pi_uid || !authenticatedUser?.username) {
      throw new Error("Authenticated ALBUKHR identity is unavailable.");
    }

    return authenticatedUser;
  }

  async function loadInitialState(){
    if (!invitationToken) throw new Error("Missing Contributor invitation token.");

    await ensureAuthenticatedUser();

    setStatus("Verifying your Contributor invitation and current policy…");

    const response = await apiPost("/api/contributor/bootstrap", {
      invitation_token: invitationToken
    });

    if (!response.invitation || !response.policy) {
      throw new Error("Contributor onboarding data is incomplete.");
    }

    renderInvitation(response.invitation);
    renderPolicy(response.policy);
    setOnboardingStep(2);
    setStatus("Everything is ready. Review the policy and complete the required acknowledgements.", "success");
  }

  function loadCommunityAccess(resources){
    const list = Array.isArray(resources) ? resources : [];
    const telegram = list.find((item) =>
      item &&
      item.resource_type === "telegram_private_group" &&
      item.invite_url
    );

    const panel = $("communityPanel");
    const text = $("communityText");
    const button = $("telegramButton");

    show(panel, true);

    if (telegram){
      if (text) text.textContent = "Your active Contributor status gives you access to the private Contributor community.";
      if (button){
        button.href = telegram.invite_url;
        button.textContent = telegram.resource_name || "Join Private Group";
        show(button, true);
      }
    } else if (text){
      text.textContent = "Your Contributor status is active. The private group link will appear here once the official community resource is configured.";
    }
  }

  async function handleAccept(event){
    event.preventDefault();
    updateAcceptButton();

    const button = $("acceptButton");
    if (!button || button.disabled || !currentPolicy || !invitationToken) return;

    try{
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Recording acceptance…';
      setOnboardingStep(2);
      setStatus("Recording your policy and privacy acceptance…");

      const consent = await apiPost("/api/contributor/consent", {
        invitation_token: invitationToken,
        policy_version: currentPolicy.policy_version,
        privacy_version: currentPolicy.privacy_version
      });

      if (!consent.consent_id) {
        throw new Error("Policy acceptance could not be confirmed by the server.");
      }

      setOnboardingStep(3);
      setStatus("Acceptance recorded. Completing Contributor activation…", "success");

      const activation = await apiPost("/api/contributor/accept", {
        invitation_token: invitationToken
      });

      if (!activation.contributor_id) {
        throw new Error("Contributor activation could not be confirmed by the server.");
      }

      show($("consentForm"), false);
      show($("successPanel"), true);
      setStatus("");

      loadCommunityAccess(activation.community_resources);
    }catch(error){
      console.error("[ALBUKHR CONTRIBUTOR ONBOARDING]", error);
      setStatus(error?.message || "Contributor onboarding failed.", "error");
      setOnboardingStep(2);
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-check"></i> Accept &amp; Join Contributor Program';
    }
  }

  async function init(){
    ["consentPolicy","consentPrivacy","consentRules","consentProject"].forEach((id) => {
      $(id)?.addEventListener("change", updateAcceptButton);
    });
    $("consentForm")?.addEventListener("submit", handleAccept);
    updateAcceptButton();

    try{
      invitationToken = getToken();
      await loadInitialState();
    }catch(error){
      console.error("[ALBUKHR CONTRIBUTOR INIT]", error);
      setStatus(error?.message || "Contributor onboarding is unavailable.", "error");
      const button = $("acceptButton");
      if (button) button.disabled = true;
    }
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once:true })
    : init();
})(window);
