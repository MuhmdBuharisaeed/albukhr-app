/* =========================================================
   ALBUKHR CONTRIBUTOR ONBOARDING
   UI/controller layer

   Security model:
   - Invitation token is memory-only.
   - No LocalStorage or sessionStorage.
   - Supabase Core is the only database client.
   - Current policy/version comes from server RPC.
   - Consent is recorded server-side.
   - Contributor activation is separately verified server-side.
========================================================= */
(function(window){
  "use strict";

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

  function getSupabase(){
    const core = window.ALBUKHR_SUPABASE;
    if (!core || typeof core.rpc !== "function") {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }
    return core;
  }

  async function rpc(name, params){
    const response = await getSupabase().rpc(name, params || {});
    if (response?.error) {
      throw new Error(response.error.message || `RPC ${name} failed.`);
    }
    return response?.data;
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

    authenticatedUser = await window.AlbukhrPiAuth.ensurePiAuth();
    if (!authenticatedUser?.id || !authenticatedUser?.pi_uid || !authenticatedUser?.username) {
      throw new Error("Authenticated ALBUKHR identity is unavailable.");
    }

    return authenticatedUser;
  }

  async function loadInitialState(){
    if (!invitationToken) throw new Error("Missing Contributor invitation token.");

    setStatus("Verifying your Pi identity…");
    await ensureAuthenticatedUser();

    setStatus("Verifying your Contributor invitation and current policy…");
    const results = await Promise.all([
      rpc("validate_contributor_invitation", { p_invitation_token: invitationToken }),
      rpc("get_current_contributor_policy")
    ]);

    const invitationResponse = results[0];
    const policyResponse = results[1];

    if (!invitationResponse || invitationResponse.valid !== true) {
      throw new Error(invitationResponse?.message || "Contributor invitation is not valid.");
    }

    if (!policyResponse || policyResponse.success !== true) {
      throw new Error(policyResponse?.message || "Current Contributor policy is unavailable.");
    }

    renderInvitation(invitationResponse);
    renderPolicy(policyResponse);
    setOnboardingStep(2);
    setStatus("Everything is ready. Review the policy and complete the required acknowledgements.", "success");
  }

  async function loadCommunityAccess(){
    const response = await rpc("get_contributor_community_resources", { p_network: "mainnet" });
    const resources = Array.isArray(response?.resources) ? response.resources : [];
    const telegram = resources.find((item) => item && item.resource_type === "telegram_private_group" && item.invite_url);

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

      const consent = await rpc("record_contributor_policy_consent", {
        p_invitation_token: invitationToken,
        p_policy_version: currentPolicy.policy_version,
        p_privacy_version: currentPolicy.privacy_version
      });

      if (!consent || consent.success !== true) {
        throw new Error(consent?.message || "Policy acceptance could not be recorded.");
      }

      setOnboardingStep(3);
      setStatus("Acceptance recorded. Completing Contributor activation…", "success");

      const activation = await rpc("accept_contributor_invitation", {
        p_invitation_token: invitationToken
      });

      if (!activation || activation.success !== true) {
        throw new Error(activation?.message || "Contributor activation could not be completed.");
      }

      show($("consentForm"), false);
      show($("successPanel"), true);
      setStatus("");

      try{
        await loadCommunityAccess();
      }catch (communityError){
        console.warn("Contributor community access is not available yet:", communityError);
      }
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
