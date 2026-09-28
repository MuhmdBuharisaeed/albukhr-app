/* =========================================================
   ALBUKHR CONTRIBUTOR ONBOARDING
   - Invitation token remains memory-only
   - No LocalStorage / sessionStorage
   - Policy acceptance is recorded server-side
   - Contributor activation is enforced by DB trigger
   ========================================================= */
(function(window){
  "use strict";

  let invitationToken = null;
  let currentPolicy = null;
  let invitation = null;

  const $ = (id) => document.getElementById(id);

  function setStatus(message, kind="info") {
    const el = $("status");
    if (!el) return;
    el.textContent = String(message || "");
    el.dataset.kind = kind;
  }

  function show(el, visible=true) {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
  }

  function updateAcceptButton() {
    const required = ["consentPolicy","consentPrivacy","consentRules","consentProject"]
      .map($)
      .every((el) => Boolean(el && el.checked));
    const button = $("acceptButton");
    if (button) button.disabled = !required;
  }

  function getToken() {
    const hash = String(window.location.hash || "").replace(/^#/, "");
    const fragment = new URLSearchParams(hash).get("token");
    if (fragment && fragment.trim()) return fragment.trim();

    // Backward-compatible fallback for links issued by the earlier Phase 2 build.
    const query = new URLSearchParams(window.location.search).get("token");
    return query ? query.trim() : null;
  }

  function getSupabase() {
    const core = window.ALBUKHR_SUPABASE;
    if (!core || typeof core.rpc !== "function") {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }
    return core;
  }

  async function rpc(name, params) {
    const response = await getSupabase().rpc(name, params);
    if (response.error) throw new Error(response.error.message || `RPC ${name} failed.`);
    return response.data;
  }

  function renderInvitation(data) {
    invitation = data || null;
    const panel = $("identityPanel");
    if (!panel || !data) return;
    const emailText = data.email_bound ? "Email-bound invitation" : "Invitation is not email-bound";
    panel.innerHTML = `<div><strong>Invitation:</strong> verified</div><div><strong>Access:</strong> ${emailText}</div><div><strong>Expires:</strong> ${new Date(data.expires_at).toLocaleString()}</div>`;
    show(panel, true);
  }

  function renderPolicy(data) {
    currentPolicy = data || null;
    if (!data) throw new Error("Current Contributor policy is unavailable.");
    const version = $("policyVersion");
    if (version) version.textContent = `Policy v${data.policy_version} · Privacy Notice v${data.privacy_version} · Effective ${new Date(data.effective_at).toLocaleDateString()}`;
  }

  async function loadInitialState() {
    if (!invitationToken) throw new Error("Missing Contributor invitation token.");
    if (!window.AlbukhrPiAuth) throw new Error("ALBUKHR Pi Auth Core is unavailable.");

    setStatus("Verifying your Pi identity…");
    const user = await window.AlbukhrPiAuth.ensurePiAuth();
    if (!user || !user.id) throw new Error("Authenticated ALBUKHR identity is unavailable.");

    setStatus("Verifying your Contributor invitation…");
    const [invitationResponse, policyResponse] = await Promise.all([
      rpc("validate_contributor_invitation", { p_invitation_token: invitationToken }),
      rpc("get_current_contributor_policy")
    ]);

    if (!invitationResponse || invitationResponse.valid !== true) {
      throw new Error(invitationResponse?.message || "Contributor invitation is not valid.");
    }
    if (!policyResponse || policyResponse.success !== true) {
      throw new Error(policyResponse?.message || "Current Contributor policy is unavailable.");
    }

    renderInvitation(invitationResponse);
    renderPolicy(policyResponse);
    setStatus("Ready for your required acceptance.");
  }

  async function loadCommunityAccess() {
    const response = await rpc("get_contributor_community_resources", {
      p_network: "mainnet"
    });
    const resources = Array.isArray(response?.resources) ? response.resources : [];
    const telegram = resources.find((r) => r && r.resource_type === "telegram_private_group" && r.invite_url);
    const panel = $("communityPanel");
    const text = $("communityText");
    const button = $("telegramButton");

    show(panel, true);
    if (telegram) {
      if (text) text.textContent = "Your active Contributor status gives you access to the private Contributor community.";
      if (button) {
        button.href = telegram.invite_url;
        button.textContent = telegram.resource_name || "Join Private Group";
        show(button, true);
      }
    } else {
      if (text) text.textContent = "Your Contributor status is active. The private group link will appear here once the official community resource is configured.";
    }
  }

  async function handleAccept(event) {
    event.preventDefault();
    updateAcceptButton();
    const button = $("acceptButton");
    if (!button || button.disabled) return;
    if (!currentPolicy || !invitationToken) return;

    try {
      button.disabled = true;
      button.textContent = "Recording acceptance…";
      setStatus("Recording your policy and privacy acceptance…");

      const consent = await rpc("record_contributor_policy_consent", {
        p_invitation_token: invitationToken,
        p_policy_version: currentPolicy.policy_version,
        p_privacy_version: currentPolicy.privacy_version
      });

      if (!consent || consent.success !== true) {
        throw new Error(consent?.message || "Policy acceptance could not be recorded.");
      }

      setStatus("Policy accepted. Completing Contributor activation…");
      const activation = await rpc("accept_contributor_invitation", {
        p_invitation_token: invitationToken
      });

      if (!activation || activation.success !== true) {
        throw new Error(activation?.message || "Contributor activation could not be completed.");
      }

      show($("consentForm"), false);
      show($("successPanel"), true);
      setStatus("");

      try {
        await loadCommunityAccess();
      } catch (communityError) {
        console.warn("Contributor community access is not available yet:", communityError);
      }
    } catch (error) {
      console.error("[ALBUKHR CONTRIBUTOR ONBOARDING]", error);
      setStatus(error?.message || "Contributor onboarding failed.", "error");
      button.disabled = false;
      button.textContent = "Accept & Join Contributor Program";
    }
  }

  async function init() {
    ["consentPolicy","consentPrivacy","consentRules","consentProject"].forEach((id) => {
      $(id)?.addEventListener("change", updateAcceptButton);
    });
    $("consentForm")?.addEventListener("submit", handleAccept);

    try {
      invitationToken = getToken();
      await loadInitialState();
    } catch (error) {
      console.error("[ALBUKHR CONTRIBUTOR INIT]", error);
      setStatus(error?.message || "Contributor onboarding is unavailable.", "error");
      const button = $("acceptButton");
      if (button) button.disabled = true;
    }
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once: true })
    : init();
})(window);
