/* =========================================================
ALBUKHR EXTERNAL PROJECT DASHBOARD
File: js/external-project-dashboard.js

Architecture:

- Shared Page Auth Guard is the authentication boundary.
- Pi identity is resolved from authenticated user context.
- No LocalStorage application state.
- Network comes from ALBUKHR Environment Core.
- Applications are loaded through secure RPC.
- Strict Mainnet/Testnet isolation.
  ========================================================= */

(function (window) {
"use strict";

let currentUser = null;
let currentNetwork = null;
let applications = [];
let activeStatus = "all";

function byId(id) {
return document.getElementById(id);
}

/* =========================================================
STATUS
========================================================= */

function setDashboardStatus(message, type) {
const element = byId("dashboardStatus");

if (!element) return;

element.textContent = String(message || "");

element.className =
  "dashboard-status" +
  (type ? " " + type : "");

}

/* =========================================================
DEPENDENCIES
========================================================= */

function requireDependencies() {
if (!window.ALBukhrEnvironment) {
throw new Error(
"ALBUKHR Environment Core is unavailable."
);
}

if (!window.ALBUKHR_SUPABASE) {
  throw new Error(
    "ALBUKHR Supabase Core is unavailable."
  );
}

if (!window.AlbukhrPageAuthGuard) {
  throw new Error(
    "ALBUKHR Page Auth Guard is unavailable."
  );
}

if (!window.ALBukhrEnvironment.isKnown()) {
  throw new Error(
    "ALBUKHR environment is not recognized."
  );
}

}

/* =========================================================
NETWORK
========================================================= */

function getNetwork() {
const network =
window.ALBukhrEnvironment.getNetwork();

if (
  network !== "mainnet" &&
  network !== "testnet"
) {
  throw new Error(
    "Invalid ALBUKHR network."
  );
}

return network;

}

/* =========================================================
PI UID
========================================================= */

function getPiUid() {
const candidates = [
currentUser && currentUser.pi_uid,
currentUser && currentUser.piUid,
currentUser && currentUser.uid
];

for (const candidate of candidates) {
  const value =
    String(candidate || "").trim();

  if (value) {
    return value;
  }
}

throw new Error(
  "Authenticated Pi user ID is unavailable."
);

}

/* =========================================================
NORMALIZATION
========================================================= */

function normalizeStatus(value) {
return String(value || "draft")
.trim()
.toLowerCase()
.replace(/\s+/g, "_");
}

function normalizeApplication(row) {
return {
id: row.id,

  application_code:
    row.application_code || "",

  project_code:
    row.project_code || "",

  project_slug:
    row.project_slug || "",

  project_name:
    row.project_name || "",

  business_name:
    row.business_name || "",

  industry:
    row.industry || "",

  category:
    row.category || "",

  country:
    row.country || "",

  funding_required:
    row.funding_required,

  funding_asset:
    row.funding_asset || "PI",

  investment_model:
    row.investment_model || "",

  project_duration_days:
    row.project_duration_days,

  network:
    row.network || currentNetwork,

  status:
    normalizeStatus(row.status),

  submitted_at:
    row.submitted_at,

  review_started_at:
    row.review_started_at,

  approved_at:
    row.approved_at,

  rejected_at:
    row.rejected_at,

  converted_at:
    row.converted_at,

  converted_project_id:
    row.converted_project_id,

  created_at:
    row.created_at,

  updated_at:
    row.updated_at
};

}

/* =========================================================
UI STATES
========================================================= */

function showLoading() {
const loading =
byId("applicationsLoading");

const empty =
  byId("emptyState");

const list =
  byId("applicationsList");

const error =
  byId("dashboardError");

if (loading) loading.hidden = false;
if (empty) empty.hidden = true;
if (list) list.hidden = true;
if (error) error.hidden = true;

}

function showEmpty() {
const loading =
byId("applicationsLoading");

const empty =
  byId("emptyState");

const list =
  byId("applicationsList");

const error =
  byId("dashboardError");

if (loading) loading.hidden = true;
if (empty) empty.hidden = false;
if (list) list.hidden = true;
if (error) error.hidden = true;

}

function showApplications() {
const loading =
byId("applicationsLoading");

const empty =
  byId("emptyState");

const list =
  byId("applicationsList");

const error =
  byId("dashboardError");

if (loading) loading.hidden = true;
if (empty) empty.hidden = true;
if (list) list.hidden = false;
if (error) error.hidden = true;

}

function showError(message) {
const loading =
byId("applicationsLoading");

const empty =
  byId("emptyState");

const list =
  byId("applicationsList");

const error =
  byId("dashboardError");

const errorMessage =
  byId("dashboardErrorMessage");

if (loading) loading.hidden = true;
if (empty) empty.hidden = true;
if (list) list.hidden = true;
if (error) error.hidden = false;

if (errorMessage) {
  errorMessage.textContent =
    message ||
    "An unexpected error occurred.";
}

}

/* =========================================================
AUTH UI
========================================================= */

function renderAuthenticatedUser() {
const username =
String(
(currentUser &&
currentUser.username) ||
"ALBUKHR User"
);

const authUsername =
  byId("authUsername");

const authNetwork =
  byId("authNetwork");

const authAvatar =
  byId("authAvatar");

const networkIndicator =
  byId("networkIndicator");


if (authUsername) {
  authUsername.textContent =
    username;
}


if (authNetwork) {
  authNetwork.textContent =
    "Authenticated with Pi • " +
    currentNetwork.toUpperCase();
}


if (authAvatar) {
  authAvatar.textContent =
    username
      .charAt(0)
      .toUpperCase();
}


if (networkIndicator) {
  networkIndicator.textContent =
    currentNetwork.toUpperCase();
}

}

/* =========================================================
SUMMARY
========================================================= */

function setText(id, value) {
const element = byId(id);

if (!element) return;

element.textContent =
  String(value);

}

function renderSummary() {
const total =
applications.length;

const drafts =
  applications.filter(function (item) {
    return item.status === "draft";
  }).length;

const review =
  applications.filter(function (item) {
    return [
      "submitted",
      "under_review"
    ].includes(item.status);
  }).length;

const approved =
  applications.filter(function (item) {
    return item.status === "approved";
  }).length;


setText(
  "totalApplications",
  total
);

setText(
  "draftApplications",
  drafts
);

setText(
  "reviewApplications",
  review
);

setText(
  "approvedApplications",
  approved
);

}

/* =========================================================
FILTERING
========================================================= */

function getFilteredApplications() {
if (activeStatus === "all") {
return applications.slice();
}

return applications.filter(
  function (item) {
    return item.status === activeStatus;
  }
);

}

function updateFilterButtons() {
const buttons =
document.querySelectorAll(
".status-filter"
);

buttons.forEach(function (button) {
  const status =
    button.dataset.status;

  const active =
    status === activeStatus;

  button.classList.toggle(
    "active",
    active
  );

  button.setAttribute(
    "aria-selected",
    active ? "true" : "false"
  );
});

}

/* =========================================================
FORMATTING
========================================================= */

function escapeHtml(value) {
return String(value || "")
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """)
.replace(/'/g, "'");
}

function formatStatus(status) {
return normalizeStatus(status)
.split("_")
.map(function (part) {
return (
part.charAt(0).toUpperCase() +
part.slice(1)
);
})
.join(" ");
}

function formatAmount(amount, asset) {
const number =
Number(amount);

if (!Number.isFinite(number)) {
  return "—";
}

return (
  new Intl.NumberFormat(
    undefined,
    {
      maximumFractionDigits: 7
    }
  ).format(number) +
  " " +
  String(asset || "PI")
);

}

function formatDate(value) {
if (!value) {
return "—";
}

const date =
  new Date(value);

if (
  Number.isNaN(
    date.getTime()
  )
) {
  return "—";
}

return new Intl.DateTimeFormat(
  undefined,
  {
    year: "numeric",
    month: "short",
    day: "numeric"
  }
).format(date);

}

function getStatusClass(status) {
return (
"status-" +
normalizeStatus(status)
);
}

/* =========================================================
ACTION STATE
========================================================= */

function isEditable(application) {
return [
"draft",
"revision_requested",
"revision",
"changes_requested"
].includes(
normalizeStatus(
application.status
)
);
}

function getApplicationAction(application) {
if (isEditable(application)) {
return "Edit Application";
}

return "View Application";

}

/* =========================================================
APPLICATION CARD
========================================================= */

function createApplicationCard(application) {
const article =
document.createElement("article");

article.className =
  "application-card";

const editable =
  isEditable(application);

const actionLabel =
  getApplicationAction(application);

article.innerHTML =

  '<div class="application-card-header">' +

    '<div class="application-title-block">' +

      '<span class="application-code">' +
        escapeHtml(
          application.application_code
        ) +
      '</span>' +

      '<h3>' +
        escapeHtml(
          application.project_name
        ) +
      '</h3>' +

      '<p>' +
        escapeHtml(
          application.business_name
        ) +
      '</p>' +

    '</div>' +

    '<span class="application-status ' +
      escapeHtml(
        getStatusClass(
          application.status
        )
      ) +
    '">' +

      escapeHtml(
        formatStatus(
          application.status
        )
      ) +

    '</span>' +

  '</div>' +


  '<div class="application-meta">' +

    '<div class="application-meta-item">' +

      '<span>Industry</span>' +

      '<strong>' +
        escapeHtml(
          application.industry || "—"
        ) +
      '</strong>' +

    '</div>' +


    '<div class="application-meta-item">' +

      '<span>Country</span>' +

      '<strong>' +
        escapeHtml(
          application.country || "—"
        ) +
      '</strong>' +

    '</div>' +


    '<div class="application-meta-item">' +

      '<span>Funding</span>' +

      '<strong>' +
        escapeHtml(
          formatAmount(
            application.funding_required,
            application.funding_asset
          )
        ) +
      '</strong>' +

    '</div>' +


    '<div class="application-meta-item">' +

      '<span>Updated</span>' +

      '<strong>' +
        escapeHtml(
          formatDate(
            application.updated_at ||
            application.created_at
          )
        ) +
      '</strong>' +

    '</div>' +

  '</div>' +


  '<div class="application-card-footer">' +

    '<span class="application-network">' +

      escapeHtml(
        String(
          application.network
        ).toUpperCase()
      ) +

    '</span>' +


    '<button ' +

      'class="application-action-button" ' +

      'type="button" ' +

      'data-application-id="' +
        escapeHtml(application.id) +
      '" ' +

      'data-editable="' +
        String(editable) +
      '">' +

      escapeHtml(actionLabel) +

    '</button>' +

  '</div>';


const actionButton =
  article.querySelector(
    ".application-action-button"
  );


if (actionButton) {

  actionButton.addEventListener(
    "click",
    function () {

      openApplication(
        application,
        editable
      );

    }
  );

}


return article;

}

/* =========================================================
OPEN APPLICATION
========================================================= */

function openApplication(
application,
editable
) {
if (
!application ||
!application.id
) {
setDashboardStatus(
"Application ID is unavailable.",
"error"
);

  return;
}


const applicationId =
  encodeURIComponent(
    application.id
  );


if (editable) {

  window.location.href =
    "external-create.html?application_id=" +
    applicationId;

  return;
}


window.location.href =
  "external-project-detail.html?application_id=" +
  applicationId;

}

/* =========================================================
RENDER APPLICATIONS
========================================================= */

function renderApplications() {
const list =
byId("applicationsList");

const countText =
  byId("applicationCountText");


if (!list) {
  return;
}


const filtered =
  getFilteredApplications();


list.innerHTML = "";


if (!applications.length) {

  if (countText) {
    countText.textContent =
      "You have not created any applications yet.";
  }

  showEmpty();

  return;
}


if (!filtered.length) {

  if (countText) {
    countText.textContent =
      "No applications match this status.";
  }


  showApplications();


  const emptyFilter =
    document.createElement("div");

  emptyFilter.className =
    "filter-empty-state";

  emptyFilter.textContent =
    "No applications found for " +
    formatStatus(activeStatus) +
    ".";


  list.appendChild(
    emptyFilter
  );

  return;
}


if (countText) {

  countText.textContent =
    filtered.length +
    (
      filtered.length === 1
        ? " application"
        : " applications"
    ) +
    " shown.";

}


filtered.forEach(
  function (application) {

    list.appendChild(
      createApplicationCard(
        application
      )
    );

  }
);


showApplications();

}

/* =========================================================
LOAD APPLICATIONS
========================================================= */

async function loadApplications() {

try {

  showLoading();


  setDashboardStatus(
    "Loading your secure external project applications..."
  );


  const piUid =
    getPiUid();


  const result =
    await window.ALBUKHR_SUPABASE.rpc(
      "get_my_external_project_applications",
      {
        p_pi_uid: piUid,
        p_network: currentNetwork
      }
    );


  if (result.error) {
    throw result.error;
  }


  applications =
    Array.isArray(result.data)
      ? result.data.map(
          normalizeApplication
        )
      : [];


  renderSummary();

  renderApplications();


  setDashboardStatus(
    applications.length
      ? "Applications loaded securely."
      : "No external project applications found on this network.",
    "success"
  );

}
catch (error) {

  console.error(
    "[ALBUKHR EXTERNAL DASHBOARD]",
    error
  );


  applications = [];

  renderSummary();


  const message =
    error.message ||
    "Unable to load external projects.";


  setDashboardStatus(
    "Unable to load applications: " +
    message,
    "error"
  );


  showError(message);

}

}

/* =========================================================
CREATE PROJECT
========================================================= */

function goToCreateProject() {

window.location.href =
  "external-create.html";

}

/* =========================================================
UI EVENTS
========================================================= */

function setupUI() {

const createProjectButton =
  byId("createProjectButton");


if (createProjectButton) {

  createProjectButton.addEventListener(
    "click",
    goToCreateProject
  );

}



const emptyCreateProjectButton =
  byId(
    "emptyCreateProjectButton"
  );


if (emptyCreateProjectButton) {

  emptyCreateProjectButton.addEventListener(
    "click",
    goToCreateProject
  );

}



const refreshButton =
  byId(
    "refreshApplicationsButton"
  );


if (refreshButton) {

  refreshButton.addEventListener(
    "click",
    function () {
      loadApplications();
    }
  );

}



const retryButton =
  byId(
    "retryApplicationsButton"
  );


if (retryButton) {

  retryButton.addEventListener(
    "click",
    function () {
      loadApplications();
    }
  );

}



const backButton =
  byId("backButton");


if (backButton) {

  backButton.addEventListener(
    "click",
    function () {

      window.location.href =
        "index.html";

    }
  );

}



const filters =
  document.querySelectorAll(
    ".status-filter"
  );


filters.forEach(
  function (button) {

    button.addEventListener(
      "click",
      function () {

        const status =
          String(
            button.dataset.status ||
            "all"
          );


        activeStatus =
          normalizeStatus(status);


        updateFilterButtons();

        renderApplications();

      }
    );

  }
);


updateFilterButtons();

}

/* =========================================================
INITIALIZATION
========================================================= */

async function initialize() {

try {

  requireDependencies();


  setDashboardStatus(
    "Verifying secure Pi authentication..."
  );


  currentUser =
    await window.AlbukhrPageAuthGuard
      .waitForAuth();


  if (!currentUser) {
    return;
  }


  currentNetwork =
    getNetwork();


  renderAuthenticatedUser();


  setupUI();


  await loadApplications();

}
catch (error) {

  console.error(
    "[ALBUKHR EXTERNAL DASHBOARD INIT]",
    error
  );


  const message =
    error.message ||
    "Unknown initialization error";


  setDashboardStatus(
    "External project dashboard unavailable: " +
    message,
    "error"
  );


  showError(message);

}

}

/* =========================================================
BOOTSTRAP
========================================================= */

if (
document.readyState ===
"loading"
) {

document.addEventListener(
  "DOMContentLoaded",
  initialize,
  { once: true }
);

}
else {

initialize();

}

})(window);
