/* ALBUKHR External Project Funding Workspace
 * Mainnet Owner UI. Identity is verified by Pi Auth Core and the API gateway.
 * No direct Supabase RPC calls and no client-supplied identity authority.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = {
    user: null,
    network: null,
    applicationId: null,
    data: null,
    busy: false
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showStatus(message, isError = false) {
    const element = $("status");
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("error", Boolean(isError));
  }

  function getNetwork() {
    const environment = window.ALBukhrEnvironment;
    if (!environment || typeof environment.getNetwork !== "function" || !environment.isKnown()) {
      throw new Error("ALBUKHR environment is unavailable or unknown.");
    }

    const network = String(environment.getNetwork() || "").trim().toLowerCase();
    if (network !== "mainnet") {
      throw new Error("External Project Funding is currently available on Mainnet only.");
    }
    return network;
  }

  function getApplicationId() {
    const value = new URLSearchParams(window.location.search).get("application_id");
    const normalized = String(value || "").trim();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(normalized)) {
      throw new Error("A valid External Project application ID is required.");
    }
    return normalized;
  }

  function getApi() {
    const api = window.ALBukhrExternalProjectApi;
    if (!api || typeof api.getFundingPlan !== "function" ||
        typeof api.saveFundingPlan !== "function" ||
        typeof api.submitFundingPlan !== "function") {
      throw new Error("External Project trusted API is unavailable.");
    }
    return api;
  }

  function numberValue(value, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function isoToLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function renderItems(items) {
    const container = $("items");
    container.replaceChildren();

    (Array.isArray(items) ? items : []).forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "item";
      row.dataset.index = String(index);
      row.dataset.supportingDocumentId = String(item.supporting_document_id || "");
      row.innerHTML = `
        <div class="item-grid">
          <label>Category<input data-k="category" value="${escapeHtml(item.category || "")}"></label>
          <label>Description<input data-k="description" value="${escapeHtml(item.description || "")}"></label>
          <label>Quantity<input data-k="quantity" type="number" min="0.0000001" step="0.0000001" value="${escapeHtml(item.quantity ?? 1)}"></label>
          <label>Unit Cost<input data-k="unit_cost" type="number" min="0" step="0.0000001" value="${escapeHtml(item.unit_cost ?? 0)}"></label>
          <label>Use Type<select data-k="use_type">
            ${["capex", "opex", "working_capital", "reserve", "contingency", "other"].map((type) =>
              `<option value="${type}"${type === (item.use_type || "other") ? " selected" : ""}>${type.replaceAll("_", " ")}</option>`
            ).join("")}
          </select></label>
        </div>
        <div class="item-grid" style="margin-top:7px">
          <label>Deployment Stage<input data-k="deployment_stage" value="${escapeHtml(item.deployment_stage || "")}"></label>
          <label class="full">Notes<textarea data-k="notes" rows="2">${escapeHtml(item.notes || "")}</textarea></label>
        </div>
        <button class="remove" type="button">Remove line</button>
      `;

      row.querySelector(".remove").addEventListener("click", () => {
        row.remove();
        recalculateTotals();
      });
      container.appendChild(row);
    });

    recalculateTotals();
  }

  function currentItems() {
    return Array.from(document.querySelectorAll("#items .item")).map((row) => {
      const field = (key) => row.querySelector(`[data-k="${key}"]`);
      return {
        category: field("category")?.value.trim() || "",
        description: field("description")?.value.trim() || "",
        quantity: numberValue(field("quantity")?.value, 1),
        unit: "unit",
        unit_cost: numberValue(field("unit_cost")?.value, 0),
        use_type: field("use_type")?.value || "other",
        deployment_stage: field("deployment_stage")?.value.trim() || "",
        notes: field("notes")?.value.trim() || "",
        supporting_document_id: row.dataset.supportingDocumentId || null
      };
    });
  }

  function recalculateTotals() {
    const subtotal = currentItems().reduce((total, item) =>
      total + numberValue(item.quantity, 1) * numberValue(item.unit_cost, 0), 0);
    const reserve = numberValue($("requiredReserve")?.value, 0);
    const contingency = numberValue($("contingencyReserve")?.value, 0);

    $("itemSubtotal").textContent = `${subtotal.toLocaleString()} PI`;
    $("totalCapital").textContent = `${(subtotal + reserve + contingency).toLocaleString()} PI`;
  }

  function populate(data) {
    if (!data || typeof data !== "object") {
      throw new Error("The funding service returned an invalid response.");
    }

    state.data = data;
    const application = data.application || {};
    const plan = data.funding_plan || null;

    $("network").textContent = state.network.toUpperCase();
    $("projectName").textContent = application.project_name || application.business_name || "External Project";
    $("applicationMeta").textContent = `${application.application_code || "—"} • ${application.project_code || "—"}`;

    const facts = [
      ["Application Status", application.status || "—"],
      ["Declared Funding", application.funding_required == null
        ? "—"
        : `${Number(application.funding_required).toLocaleString()} ${String(application.funding_asset || "PI").toUpperCase()}`],
      ["Project Stage", plan?.business_stage || "Not set"],
      ["Plan Version", plan?.version_number ?? "—"]
    ];

    $("applicationFacts").innerHTML = facts.map(([label, value]) =>
      `<div class="fact"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`
    ).join("");

    $("planStatus").textContent = plan
      ? String(plan.status || "draft").replaceAll("_", " ").toUpperCase()
      : "NO PLAN";

    if (plan) {
      $("businessStage").value = plan.business_stage || "";
      $("fundingModel").value = plan.funding_model || "BUILD";
      $("fundingPurpose").value = plan.funding_purpose || "";
      $("existingAssetBase").value = plan.declared_existing_asset_base ?? 0;
      $("existingLiquidity").value = plan.declared_existing_liquidity ?? 0;
      $("windowStart").value = isoToLocal(plan.funding_window_start);
      $("windowEnd").value = isoToLocal(plan.funding_window_end);
      $("operatingCycle").value = plan.operating_cycle_days ?? "";
      $("capitalCycle").value = plan.expected_capital_cycle_days ?? "";
      $("requiredReserve").value = plan.required_reserve ?? 0;
      $("contingencyReserve").value = plan.contingency_reserve ?? 0;
      $("notes").value = plan.notes || "";
      renderItems(data.items || []);
    } else {
      renderItems([]);
    }

    const editable = !plan || ["draft", "revision_requested"].includes(plan.status);
    ["save", "addItem"].forEach((id) => {
      $(id).disabled = !editable;
    });
    // Preserve the AAL2 security boundary: Owner submission stays locked
    // until a verified Owner step-up mechanism is separately implemented.
    $("submit").disabled = true;
    $("submit").title = "Owner step-up verification is not yet integrated.";
    $("workspace").hidden = false;
  }

  async function loadFundingPlan() {
    showStatus("Loading funding structure…");
    const data = await getApi().getFundingPlan(state.applicationId);
    populate(data);
    $("security").textContent = "PI IDENTITY VERIFIED";
    showStatus("Funding structure loaded.");
  }

  function buildPayload() {
    return {
      business_stage: $("businessStage").value || null,
      funding_model: $("fundingModel").value,
      funding_purpose: $("fundingPurpose").value.trim(),
      declared_existing_asset_base: numberValue($("existingAssetBase").value),
      declared_existing_liquidity: numberValue($("existingLiquidity").value),
      funding_window_start: $("windowStart").value
        ? new Date($("windowStart").value).toISOString()
        : null,
      funding_window_end: $("windowEnd").value
        ? new Date($("windowEnd").value).toISOString()
        : null,
      operating_cycle_days: $("operatingCycle").value
        ? parseInt($("operatingCycle").value, 10)
        : null,
      expected_capital_cycle_days: $("capitalCycle").value
        ? parseInt($("capitalCycle").value, 10)
        : null,
      required_reserve: numberValue($("requiredReserve").value),
      contingency_reserve: numberValue($("contingencyReserve").value),
      notes: $("notes").value.trim() || null,
      items: currentItems()
    };
  }

  async function saveFundingPlan() {
    if (state.busy) return;
    state.busy = true;
    setBusy(true);

    try {
      showStatus("Saving funding draft…");
      const data = await getApi().saveFundingPlan(state.applicationId, buildPayload());
      populate(data);
      showStatus("Funding plan draft saved.");
    } catch (error) {
      showStatus(error.message || "Unable to save funding plan.", true);
    } finally {
      state.busy = false;
      setBusy(false);
    }
  }

  async function submitFundingPlan() {
    if (state.busy) return;
    if (!window.confirm("Submit this funding structure for assessment?")) return;

    state.busy = true;
    setBusy(true);

    try {
      showStatus("Saving the final funding draft…");
      const saved = await getApi().saveFundingPlan(state.applicationId, buildPayload());
      populate(saved);

      showStatus("Submitting funding structure for assessment…");
      const submitted = await getApi().submitFundingPlan(state.applicationId);
      populate(submitted);
      showStatus("Funding structure submitted. The project review team can now assess it.");
    } catch (error) {
      showStatus(error.message || "Unable to submit funding structure.", true);
    } finally {
      state.busy = false;
      setBusy(false);
    }
  }

  function setBusy(busy) {
    const plan = state.data?.funding_plan || null;
    const editable = !plan || ["draft", "revision_requested"].includes(plan.status);
    ["save", "addItem"].forEach((id) => {
      const button = $(id);
      if (button) button.disabled = Boolean(busy) || !editable;
    });
    const submitButton = $("submit");
    if (submitButton) submitButton.disabled = true;
  }

  function bindEvents() {
    ["requiredReserve", "contingencyReserve"].forEach((id) => {
      $(id).addEventListener("input", recalculateTotals);
    });

    $("items").addEventListener("input", recalculateTotals);
    $("items").addEventListener("change", recalculateTotals);
    $("addItem").addEventListener("click", () => {
      const items = currentItems();
      items.push({
        category: "",
        description: "",
        quantity: 1,
        unit: "unit",
        unit_cost: 0,
        use_type: "other",
        deployment_stage: "",
        notes: "",
        supporting_document_id: null
      });
      renderItems(items);
    });

    $("save").addEventListener("click", saveFundingPlan);
    $("submit").addEventListener("click", submitFundingPlan);
  }

  async function initialize() {
    try {
      if (!window.AlbukhrPageAuthGuard || typeof window.AlbukhrPageAuthGuard.waitForAuth !== "function") {
        throw new Error("ALBUKHR Page Auth Guard is unavailable.");
      }
      if (!window.AlbukhrApi || typeof window.AlbukhrApi.request !== "function") {
        throw new Error("ALBUKHR API Core is unavailable.");
      }

      state.network = getNetwork();
      state.applicationId = getApplicationId();
      state.user = await window.AlbukhrPageAuthGuard.waitForAuth();
      if (!state.user) throw new Error("Pi authentication is required.");

      bindEvents();
      await loadFundingPlan();
    } catch (error) {
      $("security").textContent = "ACCESS ERROR";
      showStatus(error.message || "Unable to load the funding workspace.", true);
      setBusy(true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
