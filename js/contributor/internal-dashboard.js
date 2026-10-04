/* ALBUKHR — Contributor Internal Dashboard V2
 *
 * Flow:
 *   Project facts
 *      ↓
 *   Funding Plan
 *      ↓
 *   Server Assessment
 *      ↓
 *   Admin-approved liquidity
 *      ↓
 *   Server-computed remaining gap
 *      ↓
 *   Pi settlement
 *
 * Security rules:
 *   - Mainnet only.
 *   - No LocalStorage / SessionStorage.
 *   - Browser never chooses approved liquidity.
 *   - Contributor-declared liquidity/capital is input context only.
 *   - Server calculates the authoritative capital requirement.
 *   - Server assessment determines recommended liquidity.
 *   - Admin approval determines approved liquidity.
 *   - Treasury workspace determines the remaining payable gap.
 *   - Final settlement amount MUST equal the current server-computed gap.
 */

(function (window) {
  "use strict";

  const MAINNET = "mainnet";

  const ENGINE = "CONTRIBUTOR_INTERNAL_LIQUIDITY_V1";

  const WORKSPACE_API =
    "/api/contributor/workspace";

  const FUNDING_PLAN_API =
    "/api/contributor/project/funding-plan";

  const FUNDING_SUBMIT_API =
    "/api/contributor/project/funding-plan/submit";

  const LIQUIDITY_WORKSPACE_API =
    "/api/internal-liquidity-workspace";

  const LIQUIDITY_HISTORY_API =
    "/api/internal-liquidity-history";

  const LIQUIDITY_APPROVE_API =
    "/api/internal-liquidity-approve";

  const LIQUIDITY_COMPLETE_API =
    "/api/internal-liquidity-complete";

  const ALLOWED_FUNDING_MODES = new Set([
    "startup",
    "expansion",
    "working_capital",
    "replacement",
    "mixed"
  ]);

  let currentUser = null;
  let contributorWorkspace = null;
  let project = null;

  let liquidityWorkspace = null;
  let fundingWorkspace = null;

  let paymentInProgress = false;

  /* -----------------------------------------------------------
   * DOM HELPERS
   * --------------------------------------------------------- */

  const $ = (id) => document.getElementById(id);

  function text(id, value) {
    const el = $(id);

    if (!el) {
      return;
    }

    el.textContent =
      value === null || value === undefined
        ? "—"
        : String(value);
  }

  function show(id, visible) {
    const el = $(id);

    if (!el) {
      return;
    }

    el.classList.toggle("hidden", !visible);
  }

  function setInput(id, value) {
    const el = $(id);

    if (!el) {
      return;
    }

    el.value =
      value === null || value === undefined
        ? ""
        : String(value);
  }

  /* -----------------------------------------------------------
   * ERROR / NUMBER / DATE HELPERS
   * --------------------------------------------------------- */

  function errorMessage(error, fallback) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (error?.message) {
      return String(error.message);
    }

    if (error?.error?.message) {
      return String(error.error.message);
    }

    if (error?.data?.message) {
      return String(error.data.message);
    }

    if (error?.data?.error) {
      return String(error.data.error);
    }

    return fallback || "Request failed.";
  }

  function numberValue(value) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  function formatPi(value) {
    return `${numberValue(value).toFixed(3)} Pi`;
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString();
  }

  function mask(value, start = 6, end = 5) {
    const stringValue = String(value || "").trim();

    if (!stringValue) {
      return "Not configured";
    }

    if (stringValue.length <= start + end + 3) {
      return "••••••";
    }

    return (
      `${stringValue.slice(0, start)}` +
      "••••••" +
      `${stringValue.slice(-end)}`
    );
  }

  function api() {
    if (
      !window.AlbukhrApi ||
      typeof window.AlbukhrApi.get !== "function"
    ) {
      throw new Error(
        "ALBUKHR API Core is unavailable."
      );
    }

    return window.AlbukhrApi;
  }

  /* -----------------------------------------------------------
   * MAINNET GUARD
   * --------------------------------------------------------- */

  function getCurrentNetwork() {
    const authNetwork =
      window.AlbukhrPiAuth?.getNetwork?.();

    const environmentNetwork =
      window.ALBukhrEnvironment?.getNetwork?.();

    const userNetwork =
      currentUser?.network;

    return String(
      userNetwork ||
      authNetwork ||
      environmentNetwork ||
      ""
    )
      .trim()
      .toLowerCase();
  }

  function assertMainnet() {
    const network = getCurrentNetwork();

    if (network !== MAINNET) {
      throw new Error(
        "Contributor Internal Dashboard is available on Mainnet only."
      );
    }
  }

  /* -----------------------------------------------------------
   * PAGE STATUS
   * --------------------------------------------------------- */

  function setPageStatus(message, kind = "info") {
    text("pageStatus", message || "");

    const state = $("securityState");

    if (!state) {
      return;
    }

    state.textContent =
      kind === "error"
        ? "ACCESS / SERVICE ERROR"
        : "SECURE · MAINNET";

    state.classList.toggle(
      "danger",
      kind === "error"
    );
  }

  function showError(message) {
    text(
      "errorText",
      message || "Unknown dashboard error."
    );

    show("errorPanel", true);

    setPageStatus(
      message,
      "error"
    );
  }

  function clearError() {
    show("errorPanel", false);
  }

  function setStateMessage(id, message, kind) {
    const el = $(id);

    if (!el) {
      return;
    }

    el.textContent = message || "";

    el.classList.remove(
      "active",
      "success",
      "error"
    );

    if (kind) {
      el.classList.add(kind);
    }
  }

  /* -----------------------------------------------------------
   * API RESPONSE NORMALIZATION
   * --------------------------------------------------------- */

  function unwrapApiData(response) {
    if (
      response &&
      typeof response === "object" &&
      response.data &&
      typeof response.data === "object" &&
      !Array.isArray(response.data)
    ) {
      return response.data;
    }

    return response;
  }

  function normalizeFundingResponse(response) {
    const data = unwrapApiData(response);

    if (!data || typeof data !== "object") {
      return {};
    }

    if (
      data.funding_plan &&
      typeof data.funding_plan === "object"
    ) {
      return data.funding_plan;
    }

    return data;
  }

  function normalizeLiquidityResponse(response) {
    const data = unwrapApiData(response);

    if (!data || typeof data !== "object") {
      return {};
    }

    return data;
  }

  /* -----------------------------------------------------------
   * PROJECT RENDER
   * --------------------------------------------------------- */

  function renderProject(projectData) {
    project = projectData || null;

    text(
      "projectName",
      projectData?.name || "Internal Project"
    );

    text(
      "projectCode",
      projectData?.project_code || "—"
    );

    text(
      "projectStatus",
      String(
        projectData?.status || "unknown"
      ).toUpperCase()
    );

    text(
      "userHandle",
      currentUser?.username || "Contributor"
    );

    const statusEl = $("projectStatus");

    if (statusEl) {
      statusEl.classList.remove(
        "approved",
        "active",
        "draft",
        "danger",
        "pending",
        "rejected"
      );

      const status = String(
        projectData?.status || ""
      ).toLowerCase();

      if (status) {
        statusEl.classList.add(status);
      }
    }

    const logo = $("projectLogo");

    if (
      logo &&
      String(projectData?.logo_url || "").trim()
    ) {
      logo.src = String(
        projectData.logo_url
      ).trim();
    }
  }

  /* -----------------------------------------------------------
   * DATETIME
   * --------------------------------------------------------- */

  function toDatetimeLocal(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const pad = (number) =>
      String(number).padStart(2, "0");

    return (
      `${date.getFullYear()}-` +
      `${pad(date.getMonth() + 1)}-` +
      `${pad(date.getDate())}T` +
      `${pad(date.getHours())}:` +
      `${pad(date.getMinutes())}`
    );
  }

  /* -----------------------------------------------------------
   * FUNDING RESPONSE SOURCES
   *
   * These helpers tolerate both:
   *
   * {
   *   funding_plan: {
   *      plan: {...},
   *      items: [...],
   *      assessment: {...}
   *   }
   * }
   *
   * and direct:
   *
   * {
   *   plan: {...},
   *   items: [...],
   *   assessment: {...}
   * }
   * --------------------------------------------------------- */

  function fundingPayloadSource() {
    const raw =
      fundingWorkspace?.funding_plan ||
      fundingWorkspace ||
      {};

    if (
      raw?.plan &&
      typeof raw.plan === "object"
    ) {
      return raw.plan;
    }

    if (
      raw?.funding_plan?.plan &&
      typeof raw.funding_plan.plan === "object"
    ) {
      return raw.funding_plan.plan;
    }

    return raw;
  }

  function assessmentSource() {
    const raw =
      fundingWorkspace?.funding_plan ||
      fundingWorkspace ||
      {};

    if (
      raw?.assessment &&
      typeof raw.assessment === "object"
    ) {
      return raw.assessment;
    }

    if (
      raw?.funding_plan?.assessment &&
      typeof raw.funding_plan.assessment === "object"
    ) {
      return raw.funding_plan.assessment;
    }

    if (
      fundingWorkspace?.assessment &&
      typeof fundingWorkspace.assessment === "object"
    ) {
      return fundingWorkspace.assessment;
    }

    return null;
  }

  function fundingItemsSource() {
    const raw =
      fundingWorkspace?.funding_plan ||
      fundingWorkspace ||
      {};

    if (Array.isArray(raw?.items)) {
      return raw.items;
    }

    if (
      Array.isArray(
        raw?.funding_plan?.items
      )
    ) {
      return raw.funding_plan.items;
    }

    if (
      Array.isArray(
        fundingWorkspace?.items
      )
    ) {
      return fundingWorkspace.items;
    }

    return [];
  }

  /* -----------------------------------------------------------
   * FUNDING ITEM UI
   * --------------------------------------------------------- */

  function clearFundingItems() {
    const container = $("fundingItems");

    if (!container) {
      return;
    }

    container.replaceChildren();
  }

  function makeField(
    labelText,
    className,
    type,
    value,
    attrs
  ) {
    const wrapper =
      document.createElement("div");

    wrapper.className =
      className || "item-field";

    const label =
      document.createElement("label");

    label.textContent = labelText;

    wrapper.appendChild(label);

    const input =
      document.createElement("input");

    input.type = type;

    input.value =
      value === null ||
      value === undefined
        ? ""
        : String(value);

    Object.entries(attrs || {})
      .forEach(([key, val]) => {
        input.setAttribute(
          key,
          val
        );
      });

    wrapper.appendChild(input);

    return {
      wrapper,
      input
    };
  }

  function renderFundingItem(
    item = {},
    index
  ) {
    const row =
      document.createElement("article");

    row.className =
      "funding-item-row";

    row.dataset.index =
      String(index);

    const head =
      document.createElement("div");

    head.className =
      "funding-item-row-head";

    const title =
      document.createElement("strong");

    title.textContent =
      `Cost line ${index + 1}`;

    const remove =
      document.createElement("button");

    remove.type = "button";
    remove.className =
      "small-button danger-button";

    remove.innerHTML =
      '<i class="fa-solid fa-trash"></i>' +
      "<span>Remove</span>";

    remove.disabled =
      index === 0;

    remove.addEventListener(
      "click",
      () => {
        row.remove();

        renumberFundingItems();

        calculateFundingTotal();
      }
    );

    head.append(
      title,
      remove
    );

    row.appendChild(head);

    const grid =
      document.createElement("div");

    grid.className =
      "funding-item-grid";

    const category = makeField(
      "Category",
      "item-field",
      "text",
      item.category,
      {
        maxlength: "100",
        required: "required",
        placeholder:
          "Equipment / stock / rent"
      }
    );

    const description = makeField(
      "Description",
      "item-field",
      "text",
      item.description,
      {
        maxlength: "500",
        required: "required",
        placeholder:
          "What will be purchased?"
      }
    );

    const quantity = makeField(
      "Quantity",
      "item-field",
      "number",
      item.quantity,
      {
        min: "0.001",
        step: "0.001",
        inputmode: "decimal",
        required: "required",
        placeholder: "1"
      }
    );

    const unit = makeField(
      "Unit",
      "item-field",
      "text",
      item.unit || "unit",
      {
        maxlength: "50",
        required: "required",
        placeholder:
          "unit / month / machine"
      }
    );

    const unitCost = makeField(
      "Unit Cost (Pi)",
      "item-field",
      "number",
      item.unit_cost,
      {
        min: "0",
        step: "0.001",
        inputmode: "decimal",
        required: "required",
        placeholder: "0.000"
      }
    );

    const stage = makeField(
      "Deployment Stage",
      "item-field",
      "text",
      item.deployment_stage || "",
      {
        maxlength: "100",
        placeholder:
          "Phase 1"
      }
    );

    const notes = makeField(
      "Line Notes",
      "item-field full",
      "text",
      item.notes || "",
      {
        maxlength: "1000",
        placeholder:
          "Optional"
      }
    );

    [
      category,
      description,
      quantity,
      unit,
      unitCost,
      stage,
      notes
    ].forEach((field) => {
      grid.appendChild(
        field.wrapper
      );
    });

    row.appendChild(grid);

    row._inputs = {
      category:
        category.input,

      description:
        description.input,

      quantity:
        quantity.input,

      unit:
        unit.input,

      unitCost:
        unitCost.input,

      stage:
        stage.input,

      notes:
        notes.input
    };

    [
      quantity.input,
      unitCost.input
    ].forEach((input) => {
      input.addEventListener(
        "input",
        calculateFundingTotal
      );
    });

    return row;
  }

  function renderFundingItems(items) {
    clearFundingItems();

    const list =
      Array.isArray(items) &&
      items.length
        ? items
        : [{}];

    const container =
      $("fundingItems");

    if (!container) {
      return;
    }

    list.forEach(
      (item, index) => {
        container.appendChild(
          renderFundingItem(
            item,
            index
          )
        );
      }
    );

    calculateFundingTotal();
  }

  function renumberFundingItems() {
    const rows = [
      ...document.querySelectorAll(
        "#fundingItems .funding-item-row"
      )
    ];

    rows.forEach(
      (row, index) => {
        row.dataset.index =
          String(index);

        const title =
          row.querySelector(
            ".funding-item-row-head strong"
          );

        if (title) {
          title.textContent =
            `Cost line ${index + 1}`;
        }

        const remove =
          row.querySelector(
            ".danger-button"
          );

        if (remove) {
          remove.disabled =
            index === 0;
        }
      }
    );
  }

  function calculateFundingTotal() {
    let total = 0;

    document
      .querySelectorAll(
        "#fundingItems .funding-item-row"
      )
      .forEach((row) => {
        const quantity =
          Number(
            row._inputs?.quantity?.value
          );

        const unitCost =
          Number(
            row._inputs?.unitCost?.value
          );

        if (
          Number.isFinite(quantity) &&
          quantity > 0 &&
          Number.isFinite(unitCost) &&
          unitCost >= 0
        ) {
          total +=
            quantity * unitCost;
        }
      });

    text(
      "fundingItemsTotal",
      formatPi(total)
    );

    return total;
  }

  /* -----------------------------------------------------------
   * FUNDING INPUT VALIDATION
   * --------------------------------------------------------- */

  function collectItems() {
    const rows = [
      ...document.querySelectorAll(
        "#fundingItems .funding-item-row"
      )
    ];

    if (!rows.length) {
      throw new Error(
        "At least one funding cost line is required."
      );
    }

    return rows.map(
      (row, index) => {
        const inputs =
          row._inputs || {};

        const category =
          String(
            inputs.category?.value || ""
          ).trim();

        const description =
          String(
            inputs.description?.value || ""
          ).trim();

        const quantity =
          Number(
            inputs.quantity?.value
          );

        const unit =
          String(
            inputs.unit?.value || ""
          ).trim() || "unit";

        const unitCost =
          Number(
            inputs.unitCost?.value
          );

        const deploymentStage =
          String(
            inputs.stage?.value || ""
          ).trim();

        const notes =
          String(
            inputs.notes?.value || ""
          ).trim();

        if (!category || !description) {
          throw new Error(
            `Cost line ${index + 1} requires a category and description.`
          );
        }

        if (
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            `Cost line ${index + 1} quantity is invalid.`
          );
        }

        if (
          !Number.isFinite(unitCost) ||
          unitCost < 0
        ) {
          throw new Error(
            `Cost line ${index + 1} unit cost is invalid.`
          );
        }

        return {
          category,
          description,
          quantity,
          unit,
          unit_cost: unitCost,
          deployment_stage:
            deploymentStage || null,
          notes:
            notes || null
        };
      }
    );
  }

  function optionalNumberInput(
    id,
    label
  ) {
    const raw =
      String(
        $(id)?.value || ""
      ).trim();

    if (!raw) {
      return null;
    }

    const number =
      Number(raw);

    if (
      !Number.isFinite(number) ||
      number < 0 ||
      number > 1_000_000_000
    ) {
      throw new Error(
        `${label} is invalid.`
      );
    }

    return number;
  }

  function optionalIntegerInput(
    id,
    label
  ) {
    const raw =
      String(
        $(id)?.value || ""
      ).trim();

    if (!raw) {
      return null;
    }

    const number =
      Number(raw);

    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > 3650
    ) {
      throw new Error(
        `${label} is invalid.`
      );
    }

    return number;
  }

  /* -----------------------------------------------------------
   * FUNDING PLAN PAYLOAD
   *
   * IMPORTANT:
   *
   * existing_verified_liquidity
   * and
   * incremental_capital_requirement
   *
   * are intentionally sent as contributor declarations.
   *
   * The server/database does NOT trust them as authoritative
   * verified values.
   * --------------------------------------------------------- */

  function collectFundingPayload() {
    assertMainnet();

    if (!project?.project_code) {
      throw new Error(
        "Internal Project code is unavailable."
      );
    }

    const businessStage =
      String(
        $("businessStage")?.value || ""
      ).trim();

    const fundingPurpose =
      String(
        $("fundingPurpose")?.value || ""
      ).trim();

    const fundingMode =
      String(
        $("fundingMode")?.value || ""
      )
        .trim()
        .toLowerCase();

    if (!businessStage) {
      throw new Error(
        "Business Stage is required."
      );
    }

    if (!fundingPurpose) {
      throw new Error(
        "Funding Purpose is required."
      );
    }

    if (
      !ALLOWED_FUNDING_MODES.has(
        fundingMode
      )
    ) {
      throw new Error(
        "Funding Mode is invalid."
      );
    }

    const assetRaw =
      String(
        $("existingAssetBase")?.value || ""
      ).trim();

    const existingAssetBase =
      assetRaw
        ? optionalNumberInput(
            "existingAssetBase",
            "Existing Asset Base"
          )
        : null;

    if (
      fundingMode !== "startup" &&
      existingAssetBase === null
    ) {
      throw new Error(
        "Existing Asset Base is required for a non-startup funding mode."
      );
    }

    const startRaw =
      String(
        $("fundingWindowStart")?.value || ""
      ).trim();

    const endRaw =
      String(
        $("fundingWindowEnd")?.value || ""
      ).trim();

    const start =
      startRaw
        ? new Date(startRaw)
        : null;

    const end =
      endRaw
        ? new Date(endRaw)
        : null;

    if (
      start &&
      Number.isNaN(start.getTime())
    ) {
      throw new Error(
        "Funding Window Start is invalid."
      );
    }

    if (
      end &&
      Number.isNaN(end.getTime())
    ) {
      throw new Error(
        "Funding Window End is invalid."
      );
    }

    if (
      start &&
      end &&
      end <= start
    ) {
      throw new Error(
        "Funding Window End must be later than Start."
      );
    }

    const items =
      collectItems();

    return {
      project_code:
        project.project_code,

      business_stage:
        businessStage,

      funding_purpose:
        fundingPurpose,

      funding_mode:
        fundingMode,

      existing_asset_base:
        existingAssetBase,

      /*
       * DECLARED INPUT ONLY.
       *
       * This must never be interpreted by the frontend
       * as verified liquidity.
       */
      existing_verified_liquidity:
        optionalNumberInput(
          "declaredExistingLiquidity",
          "Declared Existing Liquidity"
        ),

      /*
       * DECLARED INPUT ONLY.
       *
       * Server recalculates the authoritative
       * incremental_capital_requirement from itemized costs.
       */
      incremental_capital_requirement:
        optionalNumberInput(
          "declaredCapitalRequirement",
          "Declared Incremental Capital"
        ),

      funding_window_start:
        start
          ? start.toISOString()
          : null,

      funding_window_end:
        end
          ? end.toISOString()
          : null,

      operating_cycle_days:
        optionalIntegerInput(
          "operatingCycleDays",
          "Operating Cycle"
        ),

      expected_capital_cycle_days:
        optionalIntegerInput(
          "expectedCapitalCycleDays",
          "Expected Capital Cycle"
        ),

      required_reserve:
        optionalNumberInput(
          "requiredReserve",
          "Required Reserve"
        ),

      contingency_reserve:
        optionalNumberInput(
          "contingencyReserve",
          "Contingency Reserve"
        ),

      notes:
        String(
          $("fundingNotes")?.value || ""
        ).trim() || null,

      items
    };
  }

  /* -----------------------------------------------------------
   * FUNDING ASSESSMENT RENDER
   * --------------------------------------------------------- */

  function renderAssessment(funding) {
    fundingWorkspace =
      funding || null;

    const plan =
      fundingPayloadSource() || {};

    const assessment =
      assessmentSource() || {};

    const items =
      fundingItemsSource();

    setInput(
      "businessStage",
      plan.business_stage || ""
    );

    setInput(
      "fundingPurpose",
      plan.funding_purpose || ""
    );

    setInput(
      "fundingMode",
      plan.funding_mode || ""
    );

    setInput(
      "existingAssetBase",
      plan.existing_asset_base ?? ""
    );

    setInput(
      "declaredExistingLiquidity",
      plan.declared_existing_liquidity ?? ""
    );

    setInput(
      "declaredCapitalRequirement",
      plan.declared_capital_requirement ?? ""
    );

    setInput(
      "fundingWindowStart",
      toDatetimeLocal(
        plan.funding_window_start
      )
    );

    setInput(
      "fundingWindowEnd",
      toDatetimeLocal(
        plan.funding_window_end
      )
    );

    setInput(
      "operatingCycleDays",
      plan.operating_cycle_days ?? ""
    );

    setInput(
      "expectedCapitalCycleDays",
      plan.expected_capital_cycle_days ?? ""
    );

    setInput(
      "requiredReserve",
      plan.required_reserve ?? ""
    );

    setInput(
      "contingencyReserve",
      plan.contingency_reserve ?? ""
    );

    setInput(
      "fundingNotes",
      plan.notes ?? ""
    );

    renderFundingItems(items);

    text(
      "fundingPlanStatus",
      String(
        plan.status ||
        "not_submitted"
      )
        .replaceAll("_", " ")
        .toUpperCase()
    );

    /*
     * IMPORTANT:
     *
     * incremental_capital_requirement
     * is authoritative only when returned by the server.
     *
     * The browser does not calculate or approve it.
     */
    const capitalRequirement =
      plan.incremental_capital_requirement ??
      assessment.validated_capital_requirement ??
      plan.requested_capital;

    text(
      "capitalRequirement",
      capitalRequirement == null
        ? "Pending"
        : formatPi(
            capitalRequirement
          )
    );

    text(
      "systemLiquidityRecommendation",
      assessment.system_recommended_liquidity ==
        null
        ? "Pending"
        : formatPi(
            assessment.system_recommended_liquidity
          )
    );

    text(
      "assessmentStatus",
      String(
        assessment.liquidity_assessment_status ||
        "not_assessed"
      )
        .replaceAll("_", " ")
        .toUpperCase()
    );

    text(
      "assessmentReadiness",
      String(
        assessment.readiness_status ||
        "not_ready"
      )
        .replaceAll("_", " ")
        .toUpperCase()
    );

    const reasons =
      Array.isArray(
        assessment.blocking_reasons
      )
        ? assessment.blocking_reasons
        : [];

    const reasonsEl =
      $("assessmentReasons");

    if (reasonsEl) {
      reasonsEl.replaceChildren();

      reasons.forEach(
        (reason) => {
          const line =
            document.createElement("div");

          line.textContent =
            String(reason)
              .replaceAll("_", " ");

          reasonsEl.appendChild(line);
        }
      );

      reasonsEl.classList.toggle(
        "hidden",
        reasons.length === 0
      );
    }

    /* ---------------------------------------------------------
     * FUNDING NOTICE
     * ------------------------------------------------------- */

    const noticeTitle =
      $("fundingPlanNoticeTitle");

    const noticeText =
      $("fundingPlanNoticeText");

    const notice =
      $("fundingPlanNotice");

    if (notice) {
      let title =
        "Funding Plan Status";

      let message =
        "No funding plan has been saved yet.";

      const status =
        String(
          plan.status || ""
        ).toLowerCase();

      const readiness =
        String(
          assessment.readiness_status || ""
        ).toLowerCase();

      if (status === "draft") {
        title =
          "Draft saved";

        message =
          "The funding plan is editable. Submit it when the project facts and cost lines are complete.";
      } else if (
        status === "submitted"
      ) {
        title =
          "Submitted for assessment";

        message =
          "The plan has been submitted. System assessment and administrator liquidity approval remain separate controls.";
      } else if (
        status === "under_review"
      ) {
        title =
          "Under review";

        message =
          "The funding plan is currently under server/admin review. Contributor-declared values do not determine approved liquidity.";
      } else if (
        status === "approved"
      ) {
        title =
          "Funding plan approved";

        message =
          "This funding plan has passed its applicable approval stage. Treasury liquidity remains controlled by the server assessment and administrator approval workflow.";
      } else if (
        status === "rejected"
      ) {
        title =
          "Funding plan rejected";

        message =
          "This funding plan was rejected. Review the assessment or administrative feedback before submitting another version.";
      } else if (
        readiness === "blocked"
      ) {
        title =
          "Assessment blocked";

        message =
          reasons.length
            ? `Blocking reasons: ${reasons.join(", ")}`
            : "Additional server prerequisites are required.";
      }

      if (noticeTitle) {
        noticeTitle.textContent =
          title;
      }

      if (noticeText) {
        noticeText.textContent =
          message;
      }

      notice.classList.remove(
        "hidden"
      );
    }

    /*
     * Do not let a previously displayed server
     * recommendation look like an approved amount.
     */
    const approvedHint =
      $("approvedLiquidityHint");

    if (
      approvedHint &&
      assessment.system_recommended_liquidity != null
    ) {
      approvedHint.dataset.assessmentRecommendation =
        String(
          assessment.system_recommended_liquidity
        );
    }
  }

  /* -----------------------------------------------------------
   * LOAD FUNDING PLAN
   * --------------------------------------------------------- */

  async function loadFundingPlan() {
    assertMainnet();

    if (!project?.project_code) {
      throw new Error(
        "Internal Project code is unavailable."
      );
    }

    const data =
      await api().get(
        `${FUNDING_PLAN_API}?project_code=${encodeURIComponent(
          project.project_code
        )}`
      );

    const normalized =
      normalizeFundingResponse(
        data
      );

    if (
      !normalized ||
      typeof normalized !== "object"
    ) {
      throw new Error(
        "Internal funding plan returned an invalid response."
      );
    }

    fundingWorkspace =
      normalized;

    renderAssessment(
      fundingWorkspace
    );

    return fundingWorkspace;
  }

  /* -----------------------------------------------------------
   * FUNDING BUSY STATE
   * --------------------------------------------------------- */

  function setFundingBusy(busy) {
    const save =
      $("saveFundingPlanButton");

    const submit =
      $("submitFundingPlanButton");

    const add =
      $("addFundingItem");

    if (save) {
      save.disabled =
        busy;

      save.innerHTML =
        busy
          ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Saving…</span>'
          : '<i class="fa-solid fa-floppy-disk"></i><span>Save Draft</span>';
    }

    if (submit) {
      submit.disabled =
        busy;

      submit.innerHTML =
        busy
          ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Submitting…</span>'
          : '<i class="fa-solid fa-paper-plane"></i><span>Submit for Assessment</span>';
    }

    if (add) {
      add.disabled =
        busy;
    }
  }

  /* -----------------------------------------------------------
   * SAVE FUNDING PLAN
   * --------------------------------------------------------- */

  async function saveFundingPlan() {
    assertMainnet();

    const payload =
      collectFundingPayload();

    setFundingBusy(true);

    show(
      "fundingState",
      true
    );

    setStateMessage(
      "fundingState",
      "Saving funding plan draft…",
      "active"
    );

    try {
      const response =
        await api().post(
          FUNDING_PLAN_API,
          payload
        );

      fundingWorkspace =
        normalizeFundingResponse(
          response
        );

      renderAssessment(
        fundingWorkspace
      );

      setStateMessage(
        "fundingState",
        "Funding plan draft saved. The authoritative incremental capital requirement has been recalculated from the submitted cost lines.",
        "success"
      );

      return response;
    } catch (error) {
      setStateMessage(
        "fundingState",
        errorMessage(
          error,
          "Funding plan could not be saved."
        ),
        "error"
      );

      throw error;
    } finally {
      setFundingBusy(false);
    }
  }

  /* -----------------------------------------------------------
   * SUBMIT FUNDING PLAN
   * --------------------------------------------------------- */

  async function submitFundingPlan() {
    assertMainnet();

    /*
     * Always save the current browser form first.
     * The server recalculates authoritative values.
     */
    await saveFundingPlan();

    setFundingBusy(true);

    show(
      "fundingState",
      true
    );

    setStateMessage(
      "fundingState",
      "Submitting funding plan for server assessment…",
      "active"
    );

    try {
      const response =
        await api().post(
          FUNDING_SUBMIT_API,
          {
            project_code:
              project.project_code
          }
        );

      fundingWorkspace =
        normalizeFundingResponse(
          response
        );

      renderAssessment(
        fundingWorkspace
      );

      setStateMessage(
        "fundingState",
        "Funding plan submitted. Liquidity recommendation remains controlled by the server assessment and administrator approval workflow.",
        "success"
      );

      return response;
    } catch (error) {
      setStateMessage(
        "fundingState",
        errorMessage(
          error,
          "Funding plan could not be submitted."
        ),
        "error"
      );

      throw error;
    } finally {
      setFundingBusy(false);
    }
  }

  /* -----------------------------------------------------------
   * TREASURY RENDER
   * --------------------------------------------------------- */

  function renderTreasury(workspace) {
    liquidityWorkspace =
      normalizeLiquidityResponse(
        workspace
      );

    const treasury =
      liquidityWorkspace?.treasury ||
      null;

    const assessment =
      liquidityWorkspace?.funding_assessment ||
      liquidityWorkspace?.assessment ||
      null;

    const configured =
      liquidityWorkspace?.treasury_configured === true;

    const required =
      numberValue(
        treasury?.required_liquidity ??
        liquidityWorkspace?.required_liquidity ??
        assessment?.approved_required_liquidity
      );

    const verified =
      numberValue(
        treasury?.verified_liquidity ??
        liquidityWorkspace?.verified_liquidity
      );

    /*
     * Prefer the server-provided gap.
     *
     * Recalculate defensively as well so the browser
     * never displays a negative payable amount.
     */
    const serverGap =
      numberValue(
        treasury?.liquidity_gap ??
        liquidityWorkspace?.liquidity_gap
      );

    const calculatedGap =
      Math.max(
        required - verified,
        0
      );

    const gap =
      serverGap >= 0
        ? serverGap
        : calculatedGap;

    const ready =
      liquidityWorkspace?.liquidity_ready === true;

    text(
      "requiredLiquidity",
      formatPi(required)
    );

    text(
      "verifiedLiquidity",
      formatPi(verified)
    );

    text(
      "liquidityGap",
      formatPi(gap)
    );

    text(
      "liquidityReady",
      ready
        ? "READY"
        : "NOT READY"
    );

    text(
      "treasuryWallet",
      mask(
        treasury?.treasury_wallet || ""
      )
    );

    text(
      "treasuryStatus",
      configured
        ? String(
            treasury?.status ||
            "configured"
          ).toUpperCase()
        : "NOT CONFIGURED"
    );

    /*
     * This is display-only.
     *
     * It is NOT an editable input.
     */
    text(
      "approvedLiquidityAmount",
      formatPi(gap)
    );

    const treasuryStatus =
      String(
        treasury?.status || ""
      ).toLowerCase();

    const payable =
      configured &&
      ["active", "locked"].includes(
        treasuryStatus
      ) &&
      gap > 0 &&
      paymentInProgress !== true;

    const payButton =
      $("addLiquidityButton");

    if (payButton) {
      payButton.disabled =
        !payable;

      payButton.innerHTML =
        payable
          ? '<i class="fa-solid fa-arrow-up"></i><span>Pay Server-Computed Remaining Gap</span>'
          : '<i class="fa-solid fa-lock"></i><span>Liquidity Settlement Unavailable</span>';
    }

    const hint =
      $("approvedLiquidityHint");

    if (hint) {
      if (!configured) {
        hint.textContent =
          "Treasury must be configured by ALBUKHR administration.";
      } else if (gap <= 0) {
        hint.textContent =
          "No remaining verified liquidity gap is payable from this workspace.";
      } else {
        hint.textContent =
          `The next Pi payment will be exactly ${formatPi(
            gap
          )} according to the current server workspace.`;
      }
    }

    show(
      "treasuryWarning",
      !configured
    );

    /* ---------------------------------------------------------
     * INVESTMENT GATE
     * ------------------------------------------------------- */

    if (ready) {
      setPageStatus(
        "Internal liquidity threshold is satisfied. Investment remains subject to the remaining server-side activation gates."
      );

      text(
        "investmentGateTitle",
        "Liquidity requirement satisfied"
      );

      text(
        "investmentGateText",
        "Verified liquidity is at or above the server-defined threshold. Project activation, published Internal contract terms, and the Internal investment runtime must still be ready before investment is enabled."
      );
    } else if (configured) {
      setPageStatus(
        `Internal liquidity is not ready. Current verified liquidity: ${formatPi(
          verified
        )}.`
      );

      text(
        "investmentGateTitle",
        "Liquidity threshold not yet satisfied"
      );

      text(
        "investmentGateText",
        gap > 0
          ? `The server currently reports ${formatPi(
              gap
            )} remaining. The Contributor cannot override or replace that amount.`
          : "The treasury requirement is not currently payable from this workspace. Re-check the funding assessment and treasury state."
      );
    } else {
      setPageStatus(
        "Treasury is not configured yet. Liquidity settlement is unavailable."
      );

      text(
        "investmentGateTitle",
        "Treasury configuration required"
      );

      text(
        "investmentGateText",
        "ALBUKHR administration must configure the Mainnet Internal treasury after the funding plan and liquidity assessment stages are satisfied."
      );
    }
  }

  /* -----------------------------------------------------------
   * LOAD LIQUIDITY WORKSPACE
   * --------------------------------------------------------- */

  async function loadLiquidityWorkspace() {
    assertMainnet();

    if (!project?.project_code) {
      throw new Error(
        "Internal Project code is unavailable."
      );
    }

    const response =
      await api().get(
        `${LIQUIDITY_WORKSPACE_API}?project_code=${encodeURIComponent(
          project.project_code
        )}`
      );

    const data =
      normalizeLiquidityResponse(
        response
      );

    if (
      !data ||
      typeof data !== "object"
    ) {
      throw new Error(
        "Internal liquidity workspace could not be loaded."
      );
    }

    renderTreasury(data);

    return data;
  }

  /* -----------------------------------------------------------
   * LIQUIDITY HISTORY
   * --------------------------------------------------------- */

  function createHistoryRow(
    row,
    index
  ) {
    const item =
      document.createElement("article");

    item.className =
      "history-item";

    const icon =
      document.createElement("div");

    icon.className =
      "history-icon";

    icon.innerHTML =
      '<i class="fa-solid fa-arrow-down"></i>';

    const body =
      document.createElement("div");

    body.className =
      "history-body";

    const title =
      document.createElement("strong");

    title.textContent =
      `Liquidity Credit #${index + 1}`;

    const meta =
      document.createElement("span");

    meta.textContent =
      `${String(
        row?.verification_status ||
        "verified"
      ).toUpperCase()} · ${formatDate(
        row?.verified_at ||
        row?.created_at
      )}`;

    const reference =
      document.createElement("span");

    reference.textContent =
      row?.verification_reference
        ? `Tx: ${mask(
            row.verification_reference,
            6,
            6
          )}`
        : "Verification reference pending";

    body.append(
      title,
      meta,
      reference
    );

    const amount =
      document.createElement("strong");

    amount.className =
      "history-amount";

    amount.textContent =
      `+${numberValue(
        row?.amount
      ).toFixed(3)} Pi`;

    item.append(
      icon,
      body,
      amount
    );

    return item;
  }

  async function loadHistory() {
    assertMainnet();

    const list =
      $("historyList");

    if (!list) {
      return;
    }

    list.replaceChildren();

    show(
      "historyEmpty",
      false
    );

    show(
      "historyError",
      false
    );

    if (!project?.project_code) {
      throw new Error(
        "Internal Project code is unavailable."
      );
    }

    const response =
      await api().get(
        `${LIQUIDITY_HISTORY_API}?project_code=${encodeURIComponent(
          project.project_code
        )}`
      );

    const data =
      unwrapApiData(
        response
      );

    const payments =
      Array.isArray(
        data?.payments
      )
        ? data.payments
        : [];

    payments.forEach(
      (row, index) => {
        list.appendChild(
          createHistoryRow(
            row,
            index
          )
        );
      }
    );

    show(
      "historyEmpty",
      payments.length === 0
    );
  }

  /* -----------------------------------------------------------
   * CONTRIBUTOR WORKSPACE
   * --------------------------------------------------------- */

  async function loadContributorWorkspace() {
    assertMainnet();

    const response =
      await api().get(
        WORKSPACE_API
      );

    const data =
      unwrapApiData(
        response
      );

    if (
      !data ||
      data.success === false
    ) {
      throw new Error(
        data?.message ||
        data?.error ||
        "Contributor workspace could not be loaded."
      );
    }

    contributorWorkspace =
      data;

    if (
      !data?.contributor ||
      String(
        data.contributor.status || ""
      ).toLowerCase() !== "active"
    ) {
      throw new Error(
        "Active Contributor authorization is required."
      );
    }

    if (
      data.profile_complete === false
    ) {
      throw new Error(
        "Contributor registration profile must be completed before using the Internal Dashboard."
      );
    }

    if (!data?.project) {
      throw new Error(
        "No Contributor Internal Project is currently assigned to this Contributor."
      );
    }

    renderProject(
      data.project
    );

    return data;
  }

  /* -----------------------------------------------------------
   * FULL DASHBOARD REFRESH
   * --------------------------------------------------------- */

  async function refreshDashboard() {
    clearError();

    try {
      assertMainnet();

      await loadContributorWorkspace();

      await loadFundingPlan();

      await loadLiquidityWorkspace();

      try {
        await loadHistory();
      } catch (historyError) {
        setStateMessage(
          "historyError",
          errorMessage(
            historyError,
            "Liquidity history is currently unavailable."
          ),
          "error"
        );

        show(
          "historyError",
          true
        );
      }
    } catch (error) {
      console.error(
        "[ALBUKHR INTERNAL DASHBOARD]",
        error
      );

      showError(
        errorMessage(
          error,
          "Internal Project Dashboard could not be loaded."
        )
      );
    }
  }

  /* -----------------------------------------------------------
   * PI LIQUIDITY PAYMENT
   *
   * IMPORTANT:
   *
   * The contributor DOES NOT enter an amount.
   *
   * The amount is obtained from:
   *
   *   treasury.required_liquidity
   *   -
   *   treasury.verified_liquidity
   *
   * as exposed by the trusted server workspace.
   *
   * The API gateway and database settlement function
   * independently enforce the same amount.
   * --------------------------------------------------------- */

  async function startLiquidityPayment() {
    if (paymentInProgress) {
      throw new Error(
        "A liquidity payment is already being processed."
      );
    }

    assertMainnet();

    if (!project?.project_code) {
      throw new Error(
        "Internal Project identity is unavailable."
      );
    }

    /*
     * Always reload the workspace immediately before payment.
     * This prevents an old browser state from determining
     * the payment amount.
     */
    const freshWorkspace =
      await loadLiquidityWorkspace();

    const workspace =
      normalizeLiquidityResponse(
        freshWorkspace
      );

    const treasury =
      workspace?.treasury ||
      null;

    const treasuryStatus =
      String(
        treasury?.status || ""
      ).toLowerCase();

    if (
      workspace?.treasury_configured !== true
    ) {
      throw new Error(
        "Internal Project treasury is not configured."
      );
    }

    if (
      !["active", "locked"].includes(
        treasuryStatus
      )
    ) {
      throw new Error(
        "Internal Project treasury is not active or locked for settlement."
      );
    }

    /*
     * Server-computed gap.
     */
    const amount =
      numberValue(
        treasury?.liquidity_gap ??
        workspace?.liquidity_gap
      );

    if (!(amount > 0)) {
      throw new Error(
        "The server reports no remaining liquidity gap to settle."
      );
    }

    /*
     * Defensive consistency check.
     *
     * If required/verified values are present,
     * the displayed gap must agree with them.
     */
    const required =
      numberValue(
        treasury?.required_liquidity ??
        workspace?.required_liquidity
      );

    const verified =
      numberValue(
        treasury?.verified_liquidity ??
        workspace?.verified_liquidity
      );

    const calculatedGap =
      Math.max(
        required - verified,
        0
      );

    if (
      required > 0 &&
      Math.abs(
        calculatedGap - amount
      ) > 0.000000001
    ) {
      throw new Error(
        "The server liquidity workspace is internally inconsistent. Payment has been blocked."
      );
    }

    if (
      !window.Pi ||
      typeof window.Pi.createPayment !==
        "function"
    ) {
      throw new Error(
        "Pi payment API is unavailable. Open ALBUKHR in Pi Browser."
      );
    }

    paymentInProgress =
      true;

    liquidityWorkspace =
      workspace;

    renderTreasury(
      liquidityWorkspace
    );

    const button =
      $("addLiquidityButton");

    if (button) {
      button.disabled =
        true;

      button.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i>' +
        "<span>Processing…</span>";
    }

    setStateMessage(
      "paymentState",
      `Preparing server-computed liquidity payment of ${formatPi(
        amount
      )}…`,
      "active"
    );

    return new Promise(
      (resolve, reject) => {
        let settled =
          false;

        const rejectOnce =
          (error) => {
            if (!settled) {
              settled = true;
              reject(error);
            }
          };

        const resolveOnce =
          (value) => {
            if (!settled) {
              settled = true;
              resolve(value);
            }
          };

        const metadata = {
          network:
            MAINNET,

          action:
            "add_liquidity",

          project_code:
            project.project_code,

          contract_version:
            "internal_liquidity_v1",

          engine:
            ENGINE,

          /*
           * Informational only.
           *
           * Server remains authoritative.
           */
          settlement_amount_source:
            "server_computed_remaining_gap"
        };

        try {
          window.Pi.createPayment(
            {
              amount,

              memo:
                `ALBUKHR ${project.project_code} internal liquidity`,

              metadata
            },
            {
              onReadyForServerApproval:
                async (paymentId) => {
                  try {
                    setStateMessage(
                      "paymentState",
                      "Pi payment created. ALBUKHR server approval is in progress…",
                      "active"
                    );

                    /*
                     * Server gateway performs the authoritative
                     * amount validation.
                     */
                    await api().post(
                      LIQUIDITY_APPROVE_API,
                      {
                        payment_id:
                          paymentId,

                        project_code:
                          project.project_code,

                        amount
                      }
                    );

                    setStateMessage(
                      "paymentState",
                      "Payment approved. Complete the Pi transaction to settle the server-defined liquidity.",
                      "active"
                    );
                  } catch (error) {
                    rejectOnce(
                      error
                    );
                  }
                },

              onReadyForServerCompletion:
                async (
                  paymentId,
                  txid
                ) => {
                  try {
                    setStateMessage(
                      "paymentState",
                      "Pi transaction received. ALBUKHR is verifying and settling the liquidity…",
                      "active"
                    );

                    const result =
                      await api().post(
                        LIQUIDITY_COMPLETE_API,
                        {
                          payment_id:
                            paymentId,

                          project_code:
                            project.project_code,

                          amount,

                          txid
                        }
                      );

                    setStateMessage(
                      "paymentState",
                      "Liquidity settled successfully.",
                      "success"
                    );

                    resolveOnce(
                      result
                    );
                  } catch (error) {
                    rejectOnce(
                      error
                    );
                  }
                },

              onCancel:
                () => {
                  rejectOnce(
                    new Error(
                      "Pi liquidity payment was cancelled."
                    )
                  );
                },

              onError:
                (error) => {
                  rejectOnce(
                    new Error(
                      error?.message ||
                      "Pi liquidity payment failed."
                    )
                  );
                }
            }
          );
        } catch (error) {
          rejectOnce(
            error
          );
        }
      }
    );
  }

  /* -----------------------------------------------------------
   * SETTLE LIQUIDITY
   * --------------------------------------------------------- */

  async function settleLiquidity() {
    try {
      await startLiquidityPayment();

      /*
       * Reload everything after settlement.
       *
       * This makes verified liquidity, gap, history,
       * and readiness come from the new server state.
       */
      await refreshDashboard();

      setStateMessage(
        "paymentState",
        "Internal liquidity settlement completed successfully.",
        "success"
      );
    } catch (error) {
      const message =
        errorMessage(
          error,
          "Internal liquidity payment could not be completed."
        );

      setStateMessage(
        "paymentState",
        message,
        "error"
      );

      showError(
        message
      );
    } finally {
      paymentInProgress =
        false;

      /*
       * Re-render from the latest known workspace.
       */
      if (liquidityWorkspace) {
        renderTreasury(
          liquidityWorkspace
        );
      }
    }
  }

  /* -----------------------------------------------------------
   * EVENTS
   * --------------------------------------------------------- */

  function bindEvents() {
    /* Add funding cost line */
    $("addFundingItem")
      ?.addEventListener(
        "click",
        () => {
          const list =
            $("fundingItems");

          if (!list) {
            return;
          }

          const rows =
            list.querySelectorAll(
              ".funding-item-row"
            );

          list.appendChild(
            renderFundingItem(
              {},
              rows.length
            )
          );

          renumberFundingItems();

          calculateFundingTotal();
        }
      );

    /* Save draft */
    $("saveFundingPlanButton")
      ?.addEventListener(
        "click",
        async () => {
          try {
            await saveFundingPlan();
          } catch (error) {
            showError(
              errorMessage(
                error,
                "Funding plan could not be saved."
              )
            );
          }
        }
      );

    /* Submit */
    $("submitFundingPlanButton")
      ?.addEventListener(
        "click",
        async () => {
          try {
            await submitFundingPlan();

            /*
             * Reload all authoritative states after submission.
             */
            await refreshDashboard();
          } catch (error) {
            showError(
              errorMessage(
                error,
                "Funding plan could not be submitted."
              )
            );
          }
        }
      );

    /* Liquidity payment */
    $("addLiquidityButton")
      ?.addEventListener(
        "click",
        settleLiquidity
      );

    /* Refresh */
    $("refreshButton")
      ?.addEventListener(
        "click",
        refreshDashboard
      );

    $("refreshBottomButton")
      ?.addEventListener(
        "click",
        refreshDashboard
      );

    $("errorRefresh")
      ?.addEventListener(
        "click",
        refreshDashboard
      );

    /* Back */
    $("backButton")
      ?.addEventListener(
        "click",
        () => {
          if (
            window.history.length > 1
          ) {
            window.history.back();
          } else {
            window.location.href =
              "contributor.html";
          }
        }
      );

    /* Close */
    $("closeButton")
      ?.addEventListener(
        "click",
        () => {
          window.location.href =
            "index.html";
        }
      );
  }

  /* -----------------------------------------------------------
   * INIT
   * --------------------------------------------------------- */

  async function init() {
    bindEvents();

    try {
      if (
        !window.ALBukhrEnvironment?.isMainnet?.()
      ) {
        throw new Error(
          "Contributor Internal Dashboard is Mainnet-only."
        );
      }

      if (
        !window.AlbukhrPageAuthGuard
      ) {
        throw new Error(
          "ALBUKHR Page Auth Guard is unavailable."
        );
      }

      currentUser =
        await window.AlbukhrPageAuthGuard
          .waitForAuth();

      if (!currentUser) {
        return;
      }

      assertMainnet();

      await refreshDashboard();
    } catch (error) {
      console.error(
        "[ALBUKHR INTERNAL DASHBOARD INIT]",
        error
      );

      showError(
        errorMessage(
          error,
          "Contributor Internal Dashboard initialization failed."
        )
      );
    }
  }

  /* -----------------------------------------------------------
   * START
   * --------------------------------------------------------- */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }

})(window);/* ALBUKHR — Contributor Internal Dashboard V2
 *
 * Flow:
 *   Project facts
 *      ↓
 *   Funding Plan
 *      ↓
 *   Server Assessment
 *      ↓
 *   Admin-approved liquidity
 *      ↓
 *   Server-computed remaining gap
 *      ↓
 *   Pi settlement
 *
 * Security rules:
 *   - Mainnet only.
 *   - No LocalStorage / SessionStorage.
 *   - Browser never chooses approved liquidity.
 *   - Contributor-declared liquidity/capital is input context only.
 *   - Server calculates the authoritative capital requirement.
 *   - Server assessment determines recommended liquidity.
 *   - Admin approval determines approved liquidity.
 *   - Treasury workspace determines the remaining payable gap.
 *   - Final settlement amount MUST equal the current server-computed gap.
 */

(function (window) {
  "use strict";

  const MAINNET = "mainnet";

  const ENGINE = "CONTRIBUTOR_INTERNAL_LIQUIDITY_V1";

  const WORKSPACE_API =
    "/api/contributor/workspace";

  const FUNDING_PLAN_API =
    "/api/contributor/project/funding-plan";

  const FUNDING_SUBMIT_API =
    "/api/contributor/project/funding-plan/submit";

  const LIQUIDITY_WORKSPACE_API =
    "/api/internal-liquidity-workspace";

  const LIQUIDITY_HISTORY_API =
    "/api/internal-liquidity-history";

  const LIQUIDITY_APPROVE_API =
    "/api/internal-liquidity-approve";

  const LIQUIDITY_COMPLETE_API =
    "/api/internal-liquidity-complete";

  const ALLOWED_FUNDING_MODES = new Set([
    "startup",
    "expansion",
    "working_capital",
    "replacement",
    "mixed"
  ]);

  let currentUser = null;
  let contributorWorkspace = null;
  let project = null;

  let liquidityWorkspace = null;
  let fundingWorkspace = null;

  let paymentInProgress = false;

  /* -----------------------------------------------------------
   * DOM HELPERS
   * --------------------------------------------------------- */

  const $ = (id) => document.getElementById(id);

  function text(id, value) {
    const el = $(id);

    if (!el) {
      return;
    }

    el.textContent =
      value === null || value === undefined
        ? "—"
        : String(value);
  }

  function show(id, visible) {
    const el = $(id);

    if (!el) {
      return;
    }

    el.classList.toggle("hidden", !visible);
  }

  function setInput(id, value) {
    const el = $(id);

    if (!el) {
      return;
    }

    el.value =
      value === null || value === undefined
        ? ""
        : String(value);
  }

  /* -----------------------------------------------------------
   * ERROR / NUMBER / DATE HELPERS
   * --------------------------------------------------------- */

  function errorMessage(error, fallback) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (error?.message) {
      return String(error.message);
    }

    if (error?.error?.message) {
      return String(error.error.message);
    }

    if (error?.data?.message) {
      return String(error.data.message);
    }

    if (error?.data?.error) {
      return String(error.data.error);
    }

    return fallback || "Request failed.";
  }

  function numberValue(value) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  function formatPi(value) {
    return `${numberValue(value).toFixed(3)} Pi`;
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString();
  }

  function mask(value, start = 6, end = 5) {
    const stringValue = String(value || "").trim();

    if (!stringValue) {
      return "Not configured";
    }

    if (stringValue.length <= start + end + 3) {
      return "••••••";
    }

    return (
      `${stringValue.slice(0, start)}` +
      "••••••" +
      `${stringValue.slice(-end)}`
    );
  }

  function api() {
    if (
      !window.AlbukhrApi ||
      typeof window.AlbukhrApi.get !== "function"
    ) {
      throw new Error(
        "ALBUKHR API Core is unavailable."
      );
    }

    return window.AlbukhrApi;
  }

  /* -----------------------------------------------------------
   * MAINNET GUARD
   * --------------------------------------------------------- */

  function getCurrentNetwork() {
    const authNetwork =
      window.AlbukhrPiAuth?.getNetwork?.();

    const environmentNetwork =
      window.ALBukhrEnvironment?.getNetwork?.();

    const userNetwork =
      currentUser?.network;

    return String(
      userNetwork ||
      authNetwork ||
      environmentNetwork ||
      ""
    )
      .trim()
      .toLowerCase();
  }

  function assertMainnet() {
    const network = getCurrentNetwork();

    if (network !== MAINNET) {
      throw new Error(
        "Contributor Internal Dashboard is available on Mainnet only."
      );
    }
  }

  /* -----------------------------------------------------------
   * PAGE STATUS
   * --------------------------------------------------------- */

  function setPageStatus(message, kind = "info") {
    text("pageStatus", message || "");

    const state = $("securityState");

    if (!state) {
      return;
    }

    state.textContent =
      kind === "error"
        ? "ACCESS / SERVICE ERROR"
        : "SECURE · MAINNET";

    state.classList.toggle(
      "danger",
      kind === "error"
    );
  }

  function showError(message) {
    text(
      "errorText",
      message || "Unknown dashboard error."
    );

    show("errorPanel", true);

    setPageStatus(
      message,
      "error"
    );
  }

  function clearError() {
    show("errorPanel", false);
  }

  function setStateMessage(id, message, kind) {
    const el = $(id);

    if (!el) {
      return;
    }

    el.textContent = message || "";

    el.classList.remove(
      "active",
      "success",
      "error"
    );

    if (kind) {
      el.classList.add(kind);
    }
  }

  /* -----------------------------------------------------------
   * API RESPONSE NORMALIZATION
   * --------------------------------------------------------- */

  function unwrapApiData(response) {
    if (
      response &&
      typeof response === "object" &&
      response.data &&
      typeof response.data === "object" &&
      !Array.isArray(response.data)
    ) {
      return response.data;
    }

    return response;
  }

  function normalizeFundingResponse(response) {
    const data = unwrapApiData(response);

    if (!data || typeof data !== "object") {
      return {};
    }

    if (
      data.funding_plan &&
      typeof data.funding_plan === "object"
    ) {
      return data.funding_plan;
    }

    return data;
  }

  function normalizeLiquidityResponse(response) {
    const data = unwrapApiData(response);

    if (!data || typeof data !== "object") {
      return {};
    }

    return data;
  }

  /* -----------------------------------------------------------
   * PROJECT RENDER
   * --------------------------------------------------------- */

  function renderProject(projectData) {
    project = projectData || null;

    text(
      "projectName",
      projectData?.name || "Internal Project"
    );

    text(
      "projectCode",
      projectData?.project_code || "—"
    );

    text(
      "projectStatus",
      String(
        projectData?.status || "unknown"
      ).toUpperCase()
    );

    text(
      "userHandle",
      currentUser?.username || "Contributor"
    );

    const statusEl = $("projectStatus");

    if (statusEl) {
      statusEl.classList.remove(
        "approved",
        "active",
        "draft",
        "danger",
        "pending",
        "rejected"
      );

      const status = String(
        projectData?.status || ""
      ).toLowerCase();

      if (status) {
        statusEl.classList.add(status);
      }
    }

    const logo = $("projectLogo");

    if (
      logo &&
      String(projectData?.logo_url || "").trim()
    ) {
      logo.src = String(
        projectData.logo_url
      ).trim();
    }
  }

  /* -----------------------------------------------------------
   * DATETIME
   * --------------------------------------------------------- */

  function toDatetimeLocal(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const pad = (number) =>
      String(number).padStart(2, "0");

    return (
      `${date.getFullYear()}-` +
      `${pad(date.getMonth() + 1)}-` +
      `${pad(date.getDate())}T` +
      `${pad(date.getHours())}:` +
      `${pad(date.getMinutes())}`
    );
  }

  /* -----------------------------------------------------------
   * FUNDING RESPONSE SOURCES
   *
   * These helpers tolerate both:
   *
   * {
   *   funding_plan: {
   *      plan: {...},
   *      items: [...],
   *      assessment: {...}
   *   }
   * }
   *
   * and direct:
   *
   * {
   *   plan: {...},
   *   items: [...],
   *   assessment: {...}
   * }
   * --------------------------------------------------------- */

  function fundingPayloadSource() {
    const raw =
      fundingWorkspace?.funding_plan ||
      fundingWorkspace ||
      {};

    if (
      raw?.plan &&
      typeof raw.plan === "object"
    ) {
      return raw.plan;
    }

    if (
      raw?.funding_plan?.plan &&
      typeof raw.funding_plan.plan === "object"
    ) {
      return raw.funding_plan.plan;
    }

    return raw;
  }

  function assessmentSource() {
    const raw =
      fundingWorkspace?.funding_plan ||
      fundingWorkspace ||
      {};

    if (
      raw?.assessment &&
      typeof raw.assessment === "object"
    ) {
      return raw.assessment;
    }

    if (
      raw?.funding_plan?.assessment &&
      typeof raw.funding_plan.assessment === "object"
    ) {
      return raw.funding_plan.assessment;
    }

    if (
      fundingWorkspace?.assessment &&
      typeof fundingWorkspace.assessment === "object"
    ) {
      return fundingWorkspace.assessment;
    }

    return null;
  }

  function fundingItemsSource() {
    const raw =
      fundingWorkspace?.funding_plan ||
      fundingWorkspace ||
      {};

    if (Array.isArray(raw?.items)) {
      return raw.items;
    }

    if (
      Array.isArray(
        raw?.funding_plan?.items
      )
    ) {
      return raw.funding_plan.items;
    }

    if (
      Array.isArray(
        fundingWorkspace?.items
      )
    ) {
      return fundingWorkspace.items;
    }

    return [];
  }

  /* -----------------------------------------------------------
   * FUNDING ITEM UI
   * --------------------------------------------------------- */

  function clearFundingItems() {
    const container = $("fundingItems");

    if (!container) {
      return;
    }

    container.replaceChildren();
  }

  function makeField(
    labelText,
    className,
    type,
    value,
    attrs
  ) {
    const wrapper =
      document.createElement("div");

    wrapper.className =
      className || "item-field";

    const label =
      document.createElement("label");

    label.textContent = labelText;

    wrapper.appendChild(label);

    const input =
      document.createElement("input");

    input.type = type;

    input.value =
      value === null ||
      value === undefined
        ? ""
        : String(value);

    Object.entries(attrs || {})
      .forEach(([key, val]) => {
        input.setAttribute(
          key,
          val
        );
      });

    wrapper.appendChild(input);

    return {
      wrapper,
      input
    };
  }

  function renderFundingItem(
    item = {},
    index
  ) {
    const row =
      document.createElement("article");

    row.className =
      "funding-item-row";

    row.dataset.index =
      String(index);

    const head =
      document.createElement("div");

    head.className =
      "funding-item-row-head";

    const title =
      document.createElement("strong");

    title.textContent =
      `Cost line ${index + 1}`;

    const remove =
      document.createElement("button");

    remove.type = "button";
    remove.className =
      "small-button danger-button";

    remove.innerHTML =
      '<i class="fa-solid fa-trash"></i>' +
      "<span>Remove</span>";

    remove.disabled =
      index === 0;

    remove.addEventListener(
      "click",
      () => {
        row.remove();

        renumberFundingItems();

        calculateFundingTotal();
      }
    );

    head.append(
      title,
      remove
    );

    row.appendChild(head);

    const grid =
      document.createElement("div");

    grid.className =
      "funding-item-grid";

    const category = makeField(
      "Category",
      "item-field",
      "text",
      item.category,
      {
        maxlength: "100",
        required: "required",
        placeholder:
          "Equipment / stock / rent"
      }
    );

    const description = makeField(
      "Description",
      "item-field",
      "text",
      item.description,
      {
        maxlength: "500",
        required: "required",
        placeholder:
          "What will be purchased?"
      }
    );

    const quantity = makeField(
      "Quantity",
      "item-field",
      "number",
      item.quantity,
      {
        min: "0.001",
        step: "0.001",
        inputmode: "decimal",
        required: "required",
        placeholder: "1"
      }
    );

    const unit = makeField(
      "Unit",
      "item-field",
      "text",
      item.unit || "unit",
      {
        maxlength: "50",
        required: "required",
        placeholder:
          "unit / month / machine"
      }
    );

    const unitCost = makeField(
      "Unit Cost (Pi)",
      "item-field",
      "number",
      item.unit_cost,
      {
        min: "0",
        step: "0.001",
        inputmode: "decimal",
        required: "required",
        placeholder: "0.000"
      }
    );

    const stage = makeField(
      "Deployment Stage",
      "item-field",
      "text",
      item.deployment_stage || "",
      {
        maxlength: "100",
        placeholder:
          "Phase 1"
      }
    );

    const notes = makeField(
      "Line Notes",
      "item-field full",
      "text",
      item.notes || "",
      {
        maxlength: "1000",
        placeholder:
          "Optional"
      }
    );

    [
      category,
      description,
      quantity,
      unit,
      unitCost,
      stage,
      notes
    ].forEach((field) => {
      grid.appendChild(
        field.wrapper
      );
    });

    row.appendChild(grid);

    row._inputs = {
      category:
        category.input,

      description:
        description.input,

      quantity:
        quantity.input,

      unit:
        unit.input,

      unitCost:
        unitCost.input,

      stage:
        stage.input,

      notes:
        notes.input
    };

    [
      quantity.input,
      unitCost.input
    ].forEach((input) => {
      input.addEventListener(
        "input",
        calculateFundingTotal
      );
    });

    return row;
  }

  function renderFundingItems(items) {
    clearFundingItems();

    const list =
      Array.isArray(items) &&
      items.length
        ? items
        : [{}];

    const container =
      $("fundingItems");

    if (!container) {
      return;
    }

    list.forEach(
      (item, index) => {
        container.appendChild(
          renderFundingItem(
            item,
            index
          )
        );
      }
    );

    calculateFundingTotal();
  }

  function renumberFundingItems() {
    const rows = [
      ...document.querySelectorAll(
        "#fundingItems .funding-item-row"
      )
    ];

    rows.forEach(
      (row, index) => {
        row.dataset.index =
          String(index);

        const title =
          row.querySelector(
            ".funding-item-row-head strong"
          );

        if (title) {
          title.textContent =
            `Cost line ${index + 1}`;
        }

        const remove =
          row.querySelector(
            ".danger-button"
          );

        if (remove) {
          remove.disabled =
            index === 0;
        }
      }
    );
  }

  function calculateFundingTotal() {
    let total = 0;

    document
      .querySelectorAll(
        "#fundingItems .funding-item-row"
      )
      .forEach((row) => {
        const quantity =
          Number(
            row._inputs?.quantity?.value
          );

        const unitCost =
          Number(
            row._inputs?.unitCost?.value
          );

        if (
          Number.isFinite(quantity) &&
          quantity > 0 &&
          Number.isFinite(unitCost) &&
          unitCost >= 0
        ) {
          total +=
            quantity * unitCost;
        }
      });

    text(
      "fundingItemsTotal",
      formatPi(total)
    );

    return total;
  }

  /* -----------------------------------------------------------
   * FUNDING INPUT VALIDATION
   * --------------------------------------------------------- */

  function collectItems() {
    const rows = [
      ...document.querySelectorAll(
        "#fundingItems .funding-item-row"
      )
    ];

    if (!rows.length) {
      throw new Error(
        "At least one funding cost line is required."
      );
    }

    return rows.map(
      (row, index) => {
        const inputs =
          row._inputs || {};

        const category =
          String(
            inputs.category?.value || ""
          ).trim();

        const description =
          String(
            inputs.description?.value || ""
          ).trim();

        const quantity =
          Number(
            inputs.quantity?.value
          );

        const unit =
          String(
            inputs.unit?.value || ""
          ).trim() || "unit";

        const unitCost =
          Number(
            inputs.unitCost?.value
          );

        const deploymentStage =
          String(
            inputs.stage?.value || ""
          ).trim();

        const notes =
          String(
            inputs.notes?.value || ""
          ).trim();

        if (!category || !description) {
          throw new Error(
            `Cost line ${index + 1} requires a category and description.`
          );
        }

        if (
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            `Cost line ${index + 1} quantity is invalid.`
          );
        }

        if (
          !Number.isFinite(unitCost) ||
          unitCost < 0
        ) {
          throw new Error(
            `Cost line ${index + 1} unit cost is invalid.`
          );
        }

        return {
          category,
          description,
          quantity,
          unit,
          unit_cost: unitCost,
          deployment_stage:
            deploymentStage || null,
          notes:
            notes || null
        };
      }
    );
  }

  function optionalNumberInput(
    id,
    label
  ) {
    const raw =
      String(
        $(id)?.value || ""
      ).trim();

    if (!raw) {
      return null;
    }

    const number =
      Number(raw);

    if (
      !Number.isFinite(number) ||
      number < 0 ||
      number > 1_000_000_000
    ) {
      throw new Error(
        `${label} is invalid.`
      );
    }

    return number;
  }

  function optionalIntegerInput(
    id,
    label
  ) {
    const raw =
      String(
        $(id)?.value || ""
      ).trim();

    if (!raw) {
      return null;
    }

    const number =
      Number(raw);

    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > 3650
    ) {
      throw new Error(
        `${label} is invalid.`
      );
    }

    return number;
  }

  /* -----------------------------------------------------------
   * FUNDING PLAN PAYLOAD
   *
   * IMPORTANT:
   *
   * existing_verified_liquidity
   * and
   * incremental_capital_requirement
   *
   * are intentionally sent as contributor declarations.
   *
   * The server/database does NOT trust them as authoritative
   * verified values.
   * --------------------------------------------------------- */

  function collectFundingPayload() {
    assertMainnet();

    if (!project?.project_code) {
      throw new Error(
        "Internal Project code is unavailable."
      );
    }

    const businessStage =
      String(
        $("businessStage")?.value || ""
      ).trim();

    const fundingPurpose =
      String(
        $("fundingPurpose")?.value || ""
      ).trim();

    const fundingMode =
      String(
        $("fundingMode")?.value || ""
      )
        .trim()
        .toLowerCase();

    if (!businessStage) {
      throw new Error(
        "Business Stage is required."
      );
    }

    if (!fundingPurpose) {
      throw new Error(
        "Funding Purpose is required."
      );
    }

    if (
      !ALLOWED_FUNDING_MODES.has(
        fundingMode
      )
    ) {
      throw new Error(
        "Funding Mode is invalid."
      );
    }

    const assetRaw =
      String(
        $("existingAssetBase")?.value || ""
      ).trim();

    const existingAssetBase =
      assetRaw
        ? optionalNumberInput(
            "existingAssetBase",
            "Existing Asset Base"
          )
        : null;

    if (
      fundingMode !== "startup" &&
      existingAssetBase === null
    ) {
      throw new Error(
        "Existing Asset Base is required for a non-startup funding mode."
      );
    }

    const startRaw =
      String(
        $("fundingWindowStart")?.value || ""
      ).trim();

    const endRaw =
      String(
        $("fundingWindowEnd")?.value || ""
      ).trim();

    const start =
      startRaw
        ? new Date(startRaw)
        : null;

    const end =
      endRaw
        ? new Date(endRaw)
        : null;

    if (
      start &&
      Number.isNaN(start.getTime())
    ) {
      throw new Error(
        "Funding Window Start is invalid."
      );
    }

    if (
      end &&
      Number.isNaN(end.getTime())
    ) {
      throw new Error(
        "Funding Window End is invalid."
      );
    }

    if (
      start &&
      end &&
      end <= start
    ) {
      throw new Error(
        "Funding Window End must be later than Start."
      );
    }

    const items =
      collectItems();

    return {
      project_code:
        project.project_code,

      business_stage:
        businessStage,

      funding_purpose:
        fundingPurpose,

      funding_mode:
        fundingMode,

      existing_asset_base:
        existingAssetBase,

      /*
       * DECLARED INPUT ONLY.
       *
       * This must never be interpreted by the frontend
       * as verified liquidity.
       */
      existing_verified_liquidity:
        optionalNumberInput(
          "declaredExistingLiquidity",
          "Declared Existing Liquidity"
        ),

      /*
       * DECLARED INPUT ONLY.
       *
       * Server recalculates the authoritative
       * incremental_capital_requirement from itemized costs.
       */
      incremental_capital_requirement:
        optionalNumberInput(
          "declaredCapitalRequirement",
          "Declared Incremental Capital"
        ),

      funding_window_start:
        start
          ? start.toISOString()
          : null,

      funding_window_end:
        end
          ? end.toISOString()
          : null,

      operating_cycle_days:
        optionalIntegerInput(
          "operatingCycleDays",
          "Operating Cycle"
        ),

      expected_capital_cycle_days:
        optionalIntegerInput(
          "expectedCapitalCycleDays",
          "Expected Capital Cycle"
        ),

      required_reserve:
        optionalNumberInput(
          "requiredReserve",
          "Required Reserve"
        ),

      contingency_reserve:
        optionalNumberInput(
          "contingencyReserve",
          "Contingency Reserve"
        ),

      notes:
        String(
          $("fundingNotes")?.value || ""
        ).trim() || null,

      items
    };
  }

  /* -----------------------------------------------------------
   * FUNDING ASSESSMENT RENDER
   * --------------------------------------------------------- */

  function renderAssessment(funding) {
    fundingWorkspace =
      funding || null;

    const plan =
      fundingPayloadSource() || {};

    const assessment =
      assessmentSource() || {};

    const items =
      fundingItemsSource();

    setInput(
      "businessStage",
      plan.business_stage || ""
    );

    setInput(
      "fundingPurpose",
      plan.funding_purpose || ""
    );

    setInput(
      "fundingMode",
      plan.funding_mode || ""
    );

    setInput(
      "existingAssetBase",
      plan.existing_asset_base ?? ""
    );

    setInput(
      "declaredExistingLiquidity",
      plan.declared_existing_liquidity ?? ""
    );

    setInput(
      "declaredCapitalRequirement",
      plan.declared_capital_requirement ?? ""
    );

    setInput(
      "fundingWindowStart",
      toDatetimeLocal(
        plan.funding_window_start
      )
    );

    setInput(
      "fundingWindowEnd",
      toDatetimeLocal(
        plan.funding_window_end
      )
    );

    setInput(
      "operatingCycleDays",
      plan.operating_cycle_days ?? ""
    );

    setInput(
      "expectedCapitalCycleDays",
      plan.expected_capital_cycle_days ?? ""
    );

    setInput(
      "requiredReserve",
      plan.required_reserve ?? ""
    );

    setInput(
      "contingencyReserve",
      plan.contingency_reserve ?? ""
    );

    setInput(
      "fundingNotes",
      plan.notes ?? ""
    );

    renderFundingItems(items);

    text(
      "fundingPlanStatus",
      String(
        plan.status ||
        "not_submitted"
      )
        .replaceAll("_", " ")
        .toUpperCase()
    );

    /*
     * IMPORTANT:
     *
     * incremental_capital_requirement
     * is authoritative only when returned by the server.
     *
     * The browser does not calculate or approve it.
     */
    const capitalRequirement =
      plan.incremental_capital_requirement ??
      assessment.validated_capital_requirement ??
      plan.requested_capital;

    text(
      "capitalRequirement",
      capitalRequirement == null
        ? "Pending"
        : formatPi(
            capitalRequirement
          )
    );

    text(
      "systemLiquidityRecommendation",
      assessment.system_recommended_liquidity ==
        null
        ? "Pending"
        : formatPi(
            assessment.system_recommended_liquidity
          )
    );

    text(
      "assessmentStatus",
      String(
        assessment.liquidity_assessment_status ||
        "not_assessed"
      )
        .replaceAll("_", " ")
        .toUpperCase()
    );

    text(
      "assessmentReadiness",
      String(
        assessment.readiness_status ||
        "not_ready"
      )
        .replaceAll("_", " ")
        .toUpperCase()
    );

    const reasons =
      Array.isArray(
        assessment.blocking_reasons
      )
        ? assessment.blocking_reasons
        : [];

    const reasonsEl =
      $("assessmentReasons");

    if (reasonsEl) {
      reasonsEl.replaceChildren();

      reasons.forEach(
        (reason) => {
          const line =
            document.createElement("div");

          line.textContent =
            String(reason)
              .replaceAll("_", " ");

          reasonsEl.appendChild(line);
        }
      );

      reasonsEl.classList.toggle(
        "hidden",
        reasons.length === 0
      );
    }

    /* ---------------------------------------------------------
     * FUNDING NOTICE
     * ------------------------------------------------------- */

    const noticeTitle =
      $("fundingPlanNoticeTitle");

    const noticeText =
      $("fundingPlanNoticeText");

    const notice =
      $("fundingPlanNotice");

    if (notice) {
      let title =
        "Funding Plan Status";

      let message =
        "No funding plan has been saved yet.";

      const status =
        String(
          plan.status || ""
        ).toLowerCase();

      const readiness =
        String(
          assessment.readiness_status || ""
        ).toLowerCase();

      if (status === "draft") {
        title =
          "Draft saved";

        message =
          "The funding plan is editable. Submit it when the project facts and cost lines are complete.";
      } else if (
        status === "submitted"
      ) {
        title =
          "Submitted for assessment";

        message =
          "The plan has been submitted. System assessment and administrator liquidity approval remain separate controls.";
      } else if (
        status === "under_review"
      ) {
        title =
          "Under review";

        message =
          "The funding plan is currently under server/admin review. Contributor-declared values do not determine approved liquidity.";
      } else if (
        status === "approved"
      ) {
        title =
          "Funding plan approved";

        message =
          "This funding plan has passed its applicable approval stage. Treasury liquidity remains controlled by the server assessment and administrator approval workflow.";
      } else if (
        status === "rejected"
      ) {
        title =
          "Funding plan rejected";

        message =
          "This funding plan was rejected. Review the assessment or administrative feedback before submitting another version.";
      } else if (
        readiness === "blocked"
      ) {
        title =
          "Assessment blocked";

        message =
          reasons.length
            ? `Blocking reasons: ${reasons.join(", ")}`
            : "Additional server prerequisites are required.";
      }

      if (noticeTitle) {
        noticeTitle.textContent =
          title;
      }

      if (noticeText) {
        noticeText.textContent =
          message;
      }

      notice.classList.remove(
        "hidden"
      );
    }

    /*
     * Do not let a previously displayed server
     * recommendation look like an approved amount.
     */
    const approvedHint =
      $("approvedLiquidityHint");

    if (
      approvedHint &&
      assessment.system_recommended_liquidity != null
    ) {
      approvedHint.dataset.assessmentRecommendation =
        String(
          assessment.system_recommended_liquidity
        );
    }
  }

  /* -----------------------------------------------------------
   * LOAD FUNDING PLAN
   * --------------------------------------------------------- */

  async function loadFundingPlan() {
    assertMainnet();

    if (!project?.project_code) {
      throw new Error(
        "Internal Project code is unavailable."
      );
    }

    const data =
      await api().get(
        `${FUNDING_PLAN_API}?project_code=${encodeURIComponent(
          project.project_code
        )}`
      );

    const normalized =
      normalizeFundingResponse(
        data
      );

    if (
      !normalized ||
      typeof normalized !== "object"
    ) {
      throw new Error(
        "Internal funding plan returned an invalid response."
      );
    }

    fundingWorkspace =
      normalized;

    renderAssessment(
      fundingWorkspace
    );

    return fundingWorkspace;
  }

  /* -----------------------------------------------------------
   * FUNDING BUSY STATE
   * --------------------------------------------------------- */

  function setFundingBusy(busy) {
    const save =
      $("saveFundingPlanButton");

    const submit =
      $("submitFundingPlanButton");

    const add =
      $("addFundingItem");

    if (save) {
      save.disabled =
        busy;

      save.innerHTML =
        busy
          ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Saving…</span>'
          : '<i class="fa-solid fa-floppy-disk"></i><span>Save Draft</span>';
    }

    if (submit) {
      submit.disabled =
        busy;

      submit.innerHTML =
        busy
          ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Submitting…</span>'
          : '<i class="fa-solid fa-paper-plane"></i><span>Submit for Assessment</span>';
    }

    if (add) {
      add.disabled =
        busy;
    }
  }

  /* -----------------------------------------------------------
   * SAVE FUNDING PLAN
   * --------------------------------------------------------- */

  async function saveFundingPlan() {
    assertMainnet();

    const payload =
      collectFundingPayload();

    setFundingBusy(true);

    show(
      "fundingState",
      true
    );

    setStateMessage(
      "fundingState",
      "Saving funding plan draft…",
      "active"
    );

    try {
      const response =
        await api().post(
          FUNDING_PLAN_API,
          payload
        );

      fundingWorkspace =
        normalizeFundingResponse(
          response
        );

      renderAssessment(
        fundingWorkspace
      );

      setStateMessage(
        "fundingState",
        "Funding plan draft saved. The authoritative incremental capital requirement has been recalculated from the submitted cost lines.",
        "success"
      );

      return response;
    } catch (error) {
      setStateMessage(
        "fundingState",
        errorMessage(
          error,
          "Funding plan could not be saved."
        ),
        "error"
      );

      throw error;
    } finally {
      setFundingBusy(false);
    }
  }

  /* -----------------------------------------------------------
   * SUBMIT FUNDING PLAN
   * --------------------------------------------------------- */

  async function submitFundingPlan() {
    assertMainnet();

    /*
     * Always save the current browser form first.
     * The server recalculates authoritative values.
     */
    await saveFundingPlan();

    setFundingBusy(true);

    show(
      "fundingState",
      true
    );

    setStateMessage(
      "fundingState",
      "Submitting funding plan for server assessment…",
      "active"
    );

    try {
      const response =
        await api().post(
          FUNDING_SUBMIT_API,
          {
            project_code:
              project.project_code
          }
        );

      fundingWorkspace =
        normalizeFundingResponse(
          response
        );

      renderAssessment(
        fundingWorkspace
      );

      setStateMessage(
        "fundingState",
        "Funding plan submitted. Liquidity recommendation remains controlled by the server assessment and administrator approval workflow.",
        "success"
      );

      return response;
    } catch (error) {
      setStateMessage(
        "fundingState",
        errorMessage(
          error,
          "Funding plan could not be submitted."
        ),
        "error"
      );

      throw error;
    } finally {
      setFundingBusy(false);
    }
  }

  /* -----------------------------------------------------------
   * TREASURY RENDER
   * --------------------------------------------------------- */

  function renderTreasury(workspace) {
    liquidityWorkspace =
      normalizeLiquidityResponse(
        workspace
      );

    const treasury =
      liquidityWorkspace?.treasury ||
      null;

    const assessment =
      liquidityWorkspace?.funding_assessment ||
      liquidityWorkspace?.assessment ||
      null;

    const configured =
      liquidityWorkspace?.treasury_configured === true;

    const required =
      numberValue(
        treasury?.required_liquidity ??
        liquidityWorkspace?.required_liquidity ??
        assessment?.approved_required_liquidity
      );

    const verified =
      numberValue(
        treasury?.verified_liquidity ??
        liquidityWorkspace?.verified_liquidity
      );

    /*
     * Prefer the server-provided gap.
     *
     * Recalculate defensively as well so the browser
     * never displays a negative payable amount.
     */
    const serverGap =
      numberValue(
        treasury?.liquidity_gap ??
        liquidityWorkspace?.liquidity_gap
      );

    const calculatedGap =
      Math.max(
        required - verified,
        0
      );

    const gap =
      serverGap >= 0
        ? serverGap
        : calculatedGap;

    const ready =
      liquidityWorkspace?.liquidity_ready === true;

    text(
      "requiredLiquidity",
      formatPi(required)
    );

    text(
      "verifiedLiquidity",
      formatPi(verified)
    );

    text(
      "liquidityGap",
      formatPi(gap)
    );

    text(
      "liquidityReady",
      ready
        ? "READY"
        : "NOT READY"
    );

    text(
      "treasuryWallet",
      mask(
        treasury?.treasury_wallet || ""
      )
    );

    text(
      "treasuryStatus",
      configured
        ? String(
            treasury?.status ||
            "configured"
          ).toUpperCase()
        : "NOT CONFIGURED"
    );

    /*
     * This is display-only.
     *
     * It is NOT an editable input.
     */
    text(
      "approvedLiquidityAmount",
      formatPi(gap)
    );

    const treasuryStatus =
      String(
        treasury?.status || ""
      ).toLowerCase();

    const payable =
      configured &&
      ["active", "locked"].includes(
        treasuryStatus
      ) &&
      gap > 0 &&
      paymentInProgress !== true;

    const payButton =
      $("addLiquidityButton");

    if (payButton) {
      payButton.disabled =
        !payable;

      payButton.innerHTML =
        payable
          ? '<i class="fa-solid fa-arrow-up"></i><span>Pay Server-Computed Remaining Gap</span>'
          : '<i class="fa-solid fa-lock"></i><span>Liquidity Settlement Unavailable</span>';
    }

    const hint =
      $("approvedLiquidityHint");

    if (hint) {
      if (!configured) {
        hint.textContent =
          "Treasury must be configured by ALBUKHR administration.";
      } else if (gap <= 0) {
        hint.textContent =
          "No remaining verified liquidity gap is payable from this workspace.";
      } else {
        hint.textContent =
          `The next Pi payment will be exactly ${formatPi(
            gap
          )} according to the current server workspace.`;
      }
    }

    show(
      "treasuryWarning",
      !configured
    );

    /* ---------------------------------------------------------
     * INVESTMENT GATE
     * ------------------------------------------------------- */

    if (ready) {
      setPageStatus(
        "Internal liquidity threshold is satisfied. Investment remains subject to the remaining server-side activation gates."
      );

      text(
        "investmentGateTitle",
        "Liquidity requirement satisfied"
      );

      text(
        "investmentGateText",
        "Verified liquidity is at or above the server-defined threshold. Project activation, published Internal contract terms, and the Internal investment runtime must still be ready before investment is enabled."
      );
    } else if (configured) {
      setPageStatus(
        `Internal liquidity is not ready. Current verified liquidity: ${formatPi(
          verified
        )}.`
      );

      text(
        "investmentGateTitle",
        "Liquidity threshold not yet satisfied"
      );

      text(
        "investmentGateText",
        gap > 0
          ? `The server currently reports ${formatPi(
              gap
            )} remaining. The Contributor cannot override or replace that amount.`
          : "The treasury requirement is not currently payable from this workspace. Re-check the funding assessment and treasury state."
      );
    } else {
      setPageStatus(
        "Treasury is not configured yet. Liquidity settlement is unavailable."
      );

      text(
        "investmentGateTitle",
        "Treasury configuration required"
      );

      text(
        "investmentGateText",
        "ALBUKHR administration must configure the Mainnet Internal treasury after the funding plan and liquidity assessment stages are satisfied."
      );
    }
  }

  /* -----------------------------------------------------------
   * LOAD LIQUIDITY WORKSPACE
   * --------------------------------------------------------- */

  async function loadLiquidityWorkspace() {
    assertMainnet();

    if (!project?.project_code) {
      throw new Error(
        "Internal Project code is unavailable."
      );
    }

    const response =
      await api().get(
        `${LIQUIDITY_WORKSPACE_API}?project_code=${encodeURIComponent(
          project.project_code
        )}`
      );

    const data =
      normalizeLiquidityResponse(
        response
      );

    if (
      !data ||
      typeof data !== "object"
    ) {
      throw new Error(
        "Internal liquidity workspace could not be loaded."
      );
    }

    renderTreasury(data);

    return data;
  }

  /* -----------------------------------------------------------
   * LIQUIDITY HISTORY
   * --------------------------------------------------------- */

  function createHistoryRow(
    row,
    index
  ) {
    const item =
      document.createElement("article");

    item.className =
      "history-item";

    const icon =
      document.createElement("div");

    icon.className =
      "history-icon";

    icon.innerHTML =
      '<i class="fa-solid fa-arrow-down"></i>';

    const body =
      document.createElement("div");

    body.className =
      "history-body";

    const title =
      document.createElement("strong");

    title.textContent =
      `Liquidity Credit #${index + 1}`;

    const meta =
      document.createElement("span");

    meta.textContent =
      `${String(
        row?.verification_status ||
        "verified"
      ).toUpperCase()} · ${formatDate(
        row?.verified_at ||
        row?.created_at
      )}`;

    const reference =
      document.createElement("span");

    reference.textContent =
      row?.verification_reference
        ? `Tx: ${mask(
            row.verification_reference,
            6,
            6
          )}`
        : "Verification reference pending";

    body.append(
      title,
      meta,
      reference
    );

    const amount =
      document.createElement("strong");

    amount.className =
      "history-amount";

    amount.textContent =
      `+${numberValue(
        row?.amount
      ).toFixed(3)} Pi`;

    item.append(
      icon,
      body,
      amount
    );

    return item;
  }

  async function loadHistory() {
    assertMainnet();

    const list =
      $("historyList");

    if (!list) {
      return;
    }

    list.replaceChildren();

    show(
      "historyEmpty",
      false
    );

    show(
      "historyError",
      false
    );

    if (!project?.project_code) {
      throw new Error(
        "Internal Project code is unavailable."
      );
    }

    const response =
      await api().get(
        `${LIQUIDITY_HISTORY_API}?project_code=${encodeURIComponent(
          project.project_code
        )}`
      );

    const data =
      unwrapApiData(
        response
      );

    const payments =
      Array.isArray(
        data?.payments
      )
        ? data.payments
        : [];

    payments.forEach(
      (row, index) => {
        list.appendChild(
          createHistoryRow(
            row,
            index
          )
        );
      }
    );

    show(
      "historyEmpty",
      payments.length === 0
    );
  }

  /* -----------------------------------------------------------
   * CONTRIBUTOR WORKSPACE
   * --------------------------------------------------------- */

  async function loadContributorWorkspace() {
    assertMainnet();

    const response =
      await api().get(
        WORKSPACE_API
      );

    const data =
      unwrapApiData(
        response
      );

    if (
      !data ||
      data.success === false
    ) {
      throw new Error(
        data?.message ||
        data?.error ||
        "Contributor workspace could not be loaded."
      );
    }

    contributorWorkspace =
      data;

    if (
      !data?.contributor ||
      String(
        data.contributor.status || ""
      ).toLowerCase() !== "active"
    ) {
      throw new Error(
        "Active Contributor authorization is required."
      );
    }

    if (
      data.profile_complete === false
    ) {
      throw new Error(
        "Contributor registration profile must be completed before using the Internal Dashboard."
      );
    }

    if (!data?.project) {
      throw new Error(
        "No Contributor Internal Project is currently assigned to this Contributor."
      );
    }

    renderProject(
      data.project
    );

    return data;
  }

  /* -----------------------------------------------------------
   * FULL DASHBOARD REFRESH
   * --------------------------------------------------------- */

  async function refreshDashboard() {
    clearError();

    try {
      assertMainnet();

      await loadContributorWorkspace();

      await loadFundingPlan();

      await loadLiquidityWorkspace();

      try {
        await loadHistory();
      } catch (historyError) {
        setStateMessage(
          "historyError",
          errorMessage(
            historyError,
            "Liquidity history is currently unavailable."
          ),
          "error"
        );

        show(
          "historyError",
          true
        );
      }
    } catch (error) {
      console.error(
        "[ALBUKHR INTERNAL DASHBOARD]",
        error
      );

      showError(
        errorMessage(
          error,
          "Internal Project Dashboard could not be loaded."
        )
      );
    }
  }

  /* -----------------------------------------------------------
   * PI LIQUIDITY PAYMENT
   *
   * IMPORTANT:
   *
   * The contributor DOES NOT enter an amount.
   *
   * The amount is obtained from:
   *
   *   treasury.required_liquidity
   *   -
   *   treasury.verified_liquidity
   *
   * as exposed by the trusted server workspace.
   *
   * The API gateway and database settlement function
   * independently enforce the same amount.
   * --------------------------------------------------------- */

  async function startLiquidityPayment() {
    if (paymentInProgress) {
      throw new Error(
        "A liquidity payment is already being processed."
      );
    }

    assertMainnet();

    if (!project?.project_code) {
      throw new Error(
        "Internal Project identity is unavailable."
      );
    }

    /*
     * Always reload the workspace immediately before payment.
     * This prevents an old browser state from determining
     * the payment amount.
     */
    const freshWorkspace =
      await loadLiquidityWorkspace();

    const workspace =
      normalizeLiquidityResponse(
        freshWorkspace
      );

    const treasury =
      workspace?.treasury ||
      null;

    const treasuryStatus =
      String(
        treasury?.status || ""
      ).toLowerCase();

    if (
      workspace?.treasury_configured !== true
    ) {
      throw new Error(
        "Internal Project treasury is not configured."
      );
    }

    if (
      !["active", "locked"].includes(
        treasuryStatus
      )
    ) {
      throw new Error(
        "Internal Project treasury is not active or locked for settlement."
      );
    }

    /*
     * Server-computed gap.
     */
    const amount =
      numberValue(
        treasury?.liquidity_gap ??
        workspace?.liquidity_gap
      );

    if (!(amount > 0)) {
      throw new Error(
        "The server reports no remaining liquidity gap to settle."
      );
    }

    /*
     * Defensive consistency check.
     *
     * If required/verified values are present,
     * the displayed gap must agree with them.
     */
    const required =
      numberValue(
        treasury?.required_liquidity ??
        workspace?.required_liquidity
      );

    const verified =
      numberValue(
        treasury?.verified_liquidity ??
        workspace?.verified_liquidity
      );

    const calculatedGap =
      Math.max(
        required - verified,
        0
      );

    if (
      required > 0 &&
      Math.abs(
        calculatedGap - amount
      ) > 0.000000001
    ) {
      throw new Error(
        "The server liquidity workspace is internally inconsistent. Payment has been blocked."
      );
    }

    if (
      !window.Pi ||
      typeof window.Pi.createPayment !==
        "function"
    ) {
      throw new Error(
        "Pi payment API is unavailable. Open ALBUKHR in Pi Browser."
      );
    }

    paymentInProgress =
      true;

    liquidityWorkspace =
      workspace;

    renderTreasury(
      liquidityWorkspace
    );

    const button =
      $("addLiquidityButton");

    if (button) {
      button.disabled =
        true;

      button.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i>' +
        "<span>Processing…</span>";
    }

    setStateMessage(
      "paymentState",
      `Preparing server-computed liquidity payment of ${formatPi(
        amount
      )}…`,
      "active"
    );

    return new Promise(
      (resolve, reject) => {
        let settled =
          false;

        const rejectOnce =
          (error) => {
            if (!settled) {
              settled = true;
              reject(error);
            }
          };

        const resolveOnce =
          (value) => {
            if (!settled) {
              settled = true;
              resolve(value);
            }
          };

        const metadata = {
          network:
            MAINNET,

          action:
            "add_liquidity",

          project_code:
            project.project_code,

          contract_version:
            "internal_liquidity_v1",

          engine:
            ENGINE,

          /*
           * Informational only.
           *
           * Server remains authoritative.
           */
          settlement_amount_source:
            "server_computed_remaining_gap"
        };

        try {
          window.Pi.createPayment(
            {
              amount,

              memo:
                `ALBUKHR ${project.project_code} internal liquidity`,

              metadata
            },
            {
              onReadyForServerApproval:
                async (paymentId) => {
                  try {
                    setStateMessage(
                      "paymentState",
                      "Pi payment created. ALBUKHR server approval is in progress…",
                      "active"
                    );

                    /*
                     * Server gateway performs the authoritative
                     * amount validation.
                     */
                    await api().post(
                      LIQUIDITY_APPROVE_API,
                      {
                        payment_id:
                          paymentId,

                        project_code:
                          project.project_code,

                        amount
                      }
                    );

                    setStateMessage(
                      "paymentState",
                      "Payment approved. Complete the Pi transaction to settle the server-defined liquidity.",
                      "active"
                    );
                  } catch (error) {
                    rejectOnce(
                      error
                    );
                  }
                },

              onReadyForServerCompletion:
                async (
                  paymentId,
                  txid
                ) => {
                  try {
                    setStateMessage(
                      "paymentState",
                      "Pi transaction received. ALBUKHR is verifying and settling the liquidity…",
                      "active"
                    );

                    const result =
                      await api().post(
                        LIQUIDITY_COMPLETE_API,
                        {
                          payment_id:
                            paymentId,

                          project_code:
                            project.project_code,

                          amount,

                          txid
                        }
                      );

                    setStateMessage(
                      "paymentState",
                      "Liquidity settled successfully.",
                      "success"
                    );

                    resolveOnce(
                      result
                    );
                  } catch (error) {
                    rejectOnce(
                      error
                    );
                  }
                },

              onCancel:
                () => {
                  rejectOnce(
                    new Error(
                      "Pi liquidity payment was cancelled."
                    )
                  );
                },

              onError:
                (error) => {
                  rejectOnce(
                    new Error(
                      error?.message ||
                      "Pi liquidity payment failed."
                    )
                  );
                }
            }
          );
        } catch (error) {
          rejectOnce(
            error
          );
        }
      }
    );
  }

  /* -----------------------------------------------------------
   * SETTLE LIQUIDITY
   * --------------------------------------------------------- */

  async function settleLiquidity() {
    try {
      await startLiquidityPayment();

      /*
       * Reload everything after settlement.
       *
       * This makes verified liquidity, gap, history,
       * and readiness come from the new server state.
       */
      await refreshDashboard();

      setStateMessage(
        "paymentState",
        "Internal liquidity settlement completed successfully.",
        "success"
      );
    } catch (error) {
      const message =
        errorMessage(
          error,
          "Internal liquidity payment could not be completed."
        );

      setStateMessage(
        "paymentState",
        message,
        "error"
      );

      showError(
        message
      );
    } finally {
      paymentInProgress =
        false;

      /*
       * Re-render from the latest known workspace.
       */
      if (liquidityWorkspace) {
        renderTreasury(
          liquidityWorkspace
        );
      }
    }
  }

  /* -----------------------------------------------------------
   * EVENTS
   * --------------------------------------------------------- */

  function bindEvents() {
    /* Add funding cost line */
    $("addFundingItem")
      ?.addEventListener(
        "click",
        () => {
          const list =
            $("fundingItems");

          if (!list) {
            return;
          }

          const rows =
            list.querySelectorAll(
              ".funding-item-row"
            );

          list.appendChild(
            renderFundingItem(
              {},
              rows.length
            )
          );

          renumberFundingItems();

          calculateFundingTotal();
        }
      );

    /* Save draft */
    $("saveFundingPlanButton")
      ?.addEventListener(
        "click",
        async () => {
          try {
            await saveFundingPlan();
          } catch (error) {
            showError(
              errorMessage(
                error,
                "Funding plan could not be saved."
              )
            );
          }
        }
      );

    /* Submit */
    $("submitFundingPlanButton")
      ?.addEventListener(
        "click",
        async () => {
          try {
            await submitFundingPlan();

            /*
             * Reload all authoritative states after submission.
             */
            await refreshDashboard();
          } catch (error) {
            showError(
              errorMessage(
                error,
                "Funding plan could not be submitted."
              )
            );
          }
        }
      );

    /* Liquidity payment */
    $("addLiquidityButton")
      ?.addEventListener(
        "click",
        settleLiquidity
      );

    /* Refresh */
    $("refreshButton")
      ?.addEventListener(
        "click",
        refreshDashboard
      );

    $("refreshBottomButton")
      ?.addEventListener(
        "click",
        refreshDashboard
      );

    $("errorRefresh")
      ?.addEventListener(
        "click",
        refreshDashboard
      );

    /* Back */
    $("backButton")
      ?.addEventListener(
        "click",
        () => {
          if (
            window.history.length > 1
          ) {
            window.history.back();
          } else {
            window.location.href =
              "contributor.html";
          }
        }
      );

    /* Close */
    $("closeButton")
      ?.addEventListener(
        "click",
        () => {
          window.location.href =
            "index.html";
        }
      );
  }

  /* -----------------------------------------------------------
   * INIT
   * --------------------------------------------------------- */

  async function init() {
    bindEvents();

    try {
      if (
        !window.ALBukhrEnvironment?.isMainnet?.()
      ) {
        throw new Error(
          "Contributor Internal Dashboard is Mainnet-only."
        );
      }

      if (
        !window.AlbukhrPageAuthGuard
      ) {
        throw new Error(
          "ALBUKHR Page Auth Guard is unavailable."
        );
      }

      currentUser =
        await window.AlbukhrPageAuthGuard
          .waitForAuth();

      if (!currentUser) {
        return;
      }

      assertMainnet();

      await refreshDashboard();
    } catch (error) {
      console.error(
        "[ALBUKHR INTERNAL DASHBOARD INIT]",
        error
      );

      showError(
        errorMessage(
          error,
          "Contributor Internal Dashboard initialization failed."
        )
      );
    }
  }

  /* -----------------------------------------------------------
   * START
   * --------------------------------------------------------- */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }

})(window);
