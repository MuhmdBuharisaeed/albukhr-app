(function (w, d) {
  "use strict";

  const API = "https://albukhr-api.onrender.com/api/dapp-service/v2";
  const CONSENT = "v1";
  const EXTERNAL_REGISTRATION = "external-create.html";
  const $ = id => d.getElementById(id);
  let ownedProjects = [];
  let currentAuth = null;
  let projectLookupSequence = 0;

  function status(message, kind) {
    const wrap = $("statusWrap");
    const node = $("status");
    if (!wrap || !node) return;
    wrap.hidden = false;
    node.textContent = String(message || "");
    node.dataset.kind = kind || "info";
  }

  function projectStatus(message, kind) {
    const node = $("projectLookupStatus");
    if (!node) return;
    node.textContent = String(message || "");
    node.dataset.kind = kind || "info";
  }

  function cleanText(value, max) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }

  function escapeText(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  async function auth() {
    const environment = w.ALBukhrEnvironment;
    const piAuth = w.AlbukhrPiAuth;
    if (!environment || !environment.isKnown || !environment.isKnown() || !environment.isMainnet()) {
      throw new Error("This service is currently Mainnet-only. Switch to MAINNET to continue.");
    }
    if (!piAuth) throw new Error("Pi Auth Core is unavailable. Refresh the page and try again.");
    if (!piAuth.isAuthenticated()) await piAuth.requireAuth(null);
    if (!piAuth.isAuthenticated() || !piAuth.getPiUid() || !piAuth.getAccessToken()) {
      throw new Error("Open ALBUKHR in Pi Browser and sign in with Pi to continue.");
    }
    const username = "@" + String(piAuth.getUsername() || "").replace(/^@/, "");
    $("username").textContent = username || "Verified Pi user";
    $("authAvatar").textContent = String(piAuth.getUsername() || "A").replace(/^@/, "").charAt(0).toUpperCase() || "A";
    $("authCaption").textContent = "Pi identity verified for this session";
    $("authTag").textContent = "VERIFIED";
    return piAuth;
  }

  async function api(path, body, method) {
    const piAuth = await auth();
    const options = {
      method: method || (body === undefined ? "GET" : "POST"),
      cache: "no-store",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + piAuth.getAccessToken()
      }
    };
    if (body !== undefined) options.body = JSON.stringify(body);
    const response = await fetch(API + path, options);
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.success !== true) {
      const detail = data && typeof data.error === "string" ? data.error : "The service could not complete this request.";
      const error = new Error(detail);
      error.status = response.status;
      throw error;
    }
    if (data.network !== "mainnet") throw new Error("Network mismatch. Request stopped for safety.");
    return data;
  }

  function selectedType() {
    const node = d.querySelector('input[name="serviceType"]:checked');
    return node ? node.value : "";
  }

  function selectedProject() {
    const id = $("ownedProjectSelect").value;
    return ownedProjects.find(project => String(project.id) === id) || null;
  }

  function updateOwnerPresentation() {
    const isOwnerRoute = selectedType() === "albukhr_project";
    $("ownerProjectBox").classList.toggle("is-visible", isOwnerRoute);
    $("ownerProjectBox").setAttribute("aria-hidden", isOwnerRoute ? "false" : "true");
    $("projectNameHelp").textContent = isOwnerRoute
      ? "This will be filled from the verified ALBUKHR project selected above."
      : "Use the name you want associated with this dApp request.";
    $("projectName").readOnly = isOwnerRoute;
    $("projectName").placeholder = isOwnerRoute ? "Choose an authorized project first" : "e.g. My Business dApp";
    if (!isOwnerRoute) {
      $("selectedProjectSummaryWrap").hidden = true;
      $("selectedProjectSummary").value = "";
      return;
    }
    // Never keep a project chosen through a previous service selection without rechecking it.
    $("selectedProjectSummaryWrap").hidden = true;
    $("selectedProjectSummary").value = "";
    lookupOwnedProjects();
  }

  async function lookupOwnedProjects() {
    const sequence = ++projectLookupSequence;
    ownedProjects = [];
    $("projectSelectWrap").hidden = true;
    $("externalRegistrationLink").hidden = true;
    $("ownedProjectSelect").innerHTML = '<option value="">Select an authorized project</option>';
    $("projectName").value = "";
    projectStatus("Verifying your project-management access with ALBUKHR…", "info");

    try {
      // This endpoint is part of the staged API addition; it is not in the current production gateway.
      const result = await api("/projects/eligible");
      if (sequence !== projectLookupSequence || selectedType() !== "albukhr_project") return;

      const projects = Array.isArray(result.projects) ? result.projects : [];
      ownedProjects = projects.filter(p => p && typeof p.id === "string" && typeof p.name === "string");
      if (!ownedProjects.length) {
        projectStatus("No eligible Internal or External project was found for your verified owner identity. Manager-permission verification is not connected yet, so this does not prove that you have no project. Core projects are managed by the ALBUKHR Team and are not available in this service path. If you believe you own an Internal or registered External project, contact ALBUKHR Admin to verify its ownership link; otherwise you can register an External Project below.", "warning");
        $("externalRegistrationLink").hidden = false;
        return;
      }

      ownedProjects.forEach(project => {
        const option = d.createElement("option");
        option.value = project.id;
        option.textContent = project.name + (project.project_type ? " • " + project.project_type : "");
        $("ownedProjectSelect").appendChild(option);
      });
      $("projectSelectWrap").hidden = false;
      projectStatus(ownedProjects.length === 1
        ? "One project is available to this account. Confirm it below."
        : "Select the Internal or registered External project linked to your verified owner identity.", "success");
      if (ownedProjects.length === 1) {
        $("ownedProjectSelect").value = ownedProjects[0].id;
        applySelectedProject();
      }
    } catch (error) {
      if (sequence !== projectLookupSequence || selectedType() !== "albukhr_project") return;
      // Do not mistake an unavailable API for a person having no project.
      projectStatus("Project access verification is not connected yet. Your eligibility has not been determined. Use one of the existing services, or try again after the project-access API is enabled.", "error");
      console.warn("[ALBUKHR DApp Service] Project eligibility check unavailable:", error && error.message);
    }
  }

  function applySelectedProject() {
    const project = selectedProject();
    $("projectName").value = project ? cleanText(project.name, 120) : "";
    $("selectedProjectSummary").value = project ? project.name + (project.project_type ? " • " + project.project_type : "") : "";
    $("selectedProjectSummaryWrap").hidden = !project;
    if (project) projectStatus("Project selected. The server will re-check your permission when the request is submitted.", "success");
  }

  async function init() {
    try {
      currentAuth = await auth();
      const catalog = await api("/catalog");
      const paymentsOn = !!(catalog.paymentChannels && catalog.paymentChannels.pi);
      status(paymentsOn
        ? "Secure Mainnet session ready. Payment is still available only after an Admin-issued quote is accepted."
        : "Secure Mainnet session ready. Payment channels are currently disabled.", "success");
    } catch (error) {
      status(error.message || "Unable to initialize the secure session.", "error");
    }
  }

  d.querySelectorAll('input[name="serviceType"]').forEach(node => {
    node.addEventListener("change", updateOwnerPresentation);
  });
  $("ownedProjectSelect").addEventListener("change", applySelectedProject);

  $("dappRequestForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("submitRequest");
    const type = selectedType();
    const projectName = cleanText($("projectName").value, 120);
    const description = cleanText($("description").value, 4000);
    const consentAccepted = $("consent").checked;

    try {
      if (!type) throw new Error("Choose a service before submitting your request.");
      if (!projectName || !description) throw new Error("Enter the app/project name and describe the required features.");
      if (!consentAccepted) throw new Error("Please accept the service policy before submitting.");

      let payload = {
        projectName,
        description,
        serviceType: type,
        consentAccepted: true,
        consentVersion: CONSENT
      };

      if (type === "albukhr_project") {
        const project = selectedProject();
        if (!project) throw new Error("Select a project returned by ALBUKHR's eligibility check before submitting.");
        // These fields require the corresponding additive API/schema update. Do not silently fall back.
        payload.projectId = project.id;
        payload.projectType = cleanText(project.project_type, 30);
      } else if (!["pi_studio", "developer"].includes(type)) {
        throw new Error("Unsupported service selection.");
      }

      button.disabled = true;
      button.textContent = "Submitting securely…";
      const result = await api("/requests", payload, "POST");
      const reference = result.request && result.request.id ? result.request.id : "submitted";
      status("Request submitted successfully. Reference: " + reference + ". Open My dApp Requests to follow updates.", "success");
      $("projectName").value = "";
      $("description").value = "";
      $("consent").checked = false;
      if (type === "albukhr_project") {
        $("ownedProjectSelect").value = "";
        applySelectedProject();
      } else {
        d.querySelectorAll('input[name="serviceType"]').forEach(node => { node.checked = false; });
        updateOwnerPresentation();
      }
    } catch (error) {
      status(error.message || "Request submission failed. Please try again.", "error");
    } finally {
      button.disabled = false;
      button.innerHTML = 'Submit request for review <span aria-hidden="true">→</span>';
    }
  });

  d.addEventListener("DOMContentLoaded", init, { once: true });
})(window, document);
