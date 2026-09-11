/* =========================================================
   ALBUKHR PROJECT DETAIL CONTROLLER
   Destination: /js/project.js

   Reads only from the server-authoritative public project
   registry RPC. No LocalStorage. No direct projects-table
   access. APPROVED projects are viewable; investment remains
   unavailable until the lifecycle reaches ACTIVE.
========================================================= */
(function (window) {
  "use strict";

  const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  function db() {
    const core = window.ALBUKHR_SUPABASE;
    const client = core?.client || core;
    if (!client || typeof client.rpc !== "function") {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }
    return client;
  }

  function network() {
    const e = window.ALBukhrEnvironment;
    if (!e || !e.isKnown()) throw new Error("ALBUKHR environment is unavailable.");
    return String(e.getNetwork() || "").toLowerCase();
  }

  async function load() {
    const params = new URLSearchParams(location.search);
    const requested = String(params.get("project") || "").trim().toLowerCase();
    if (!requested) throw new Error("Project identifier is missing.");

    const { data, error } = await db().rpc("get_public_project_registry", {
      p_network: network()
    });
    if (error) throw error;

    const list = Array.isArray(data) ? data : [];
    const project = list.find(p =>
      String(p.project_code || "").toLowerCase() === requested ||
      String(p.slug || "").toLowerCase() === requested ||
      String(p.id || "").toLowerCase() === requested
    );

    if (!project) throw new Error("Project is not available in the current network.");
    render(project);
  }

  function render(p) {
    document.title = `${p.name} | ALBUKHR`;
    document.getElementById("projectName").textContent = p.name || "Project";
    document.getElementById("projectCode").textContent = p.project_code || "";
    document.getElementById("projectDescription").textContent =
      p.description || "No public project description is available.";

    const logo = document.getElementById("projectLogo");
    if (p.logo_url) {
      logo.src = p.logo_url;
      logo.hidden = false;
    } else {
      logo.hidden = true;
    }

    document.getElementById("projectType").textContent =
      String(p.project_type || "project").toUpperCase();
    document.getElementById("projectNetwork").textContent =
      String(p.network || "").toUpperCase();
    document.getElementById("projectStatus").textContent =
      String(p.status || "").toUpperCase();
    document.getElementById("projectSlot").textContent =
      p.core_slot == null ? "—" : String(p.core_slot);
    document.getElementById("projectLiquidity").textContent =
      `${Number(p.liquidity || 0).toLocaleString()} Pi`;
    document.getElementById("projectInvestors").textContent =
      Number(p.investors || 0).toLocaleString();

    const note = document.getElementById("lifecycleNote");
    const status = String(p.status || "").toLowerCase();
    if (status === "active") {
      note.textContent = "This project is ACTIVE in the current network.";
    } else if (status === "approved") {
      note.textContent =
        "This Core Project is APPROVED. Investment becomes available only after the server-authoritative lifecycle reaches ACTIVE.";
    } else {
      note.textContent = `Project lifecycle status: ${status.toUpperCase()}.`;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await load();
    } catch (error) {
      document.getElementById("projectError").textContent =
        error.message || "Unable to load project.";
      document.getElementById("projectError").hidden = false;
    }
  });
})(window);
