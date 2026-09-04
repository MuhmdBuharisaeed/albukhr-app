/* =========================================================
ALBUKHR EXTERNAL PROJECT DASHBOARD
File: js/external-project-dashboard.js

Architecture:

- Shared Page Auth Guard provides authenticated Pi identity.
- Shared Environment Core provides MAINNET / TESTNET.
- Public applicant RPC provides network-isolated data.
- No LocalStorage application state.
- Browser never chooses applicant_user_id.
- Application ownership is resolved server-side.

RPC:
public.get_my_external_project_applications(
p_pi_uid,
p_network
)
========================================================= */

(function (window) {
"use strict";

/* =========================================================
STATE
========================================================= */

let currentUser = null;

let currentNetwork = null;

let applications = [];

let activeStatusFilter = "all";

let loading = false;

/* =========================================================
DOM
========================================================= */

function byId(id) {
return document.getElementById(id);
}

/* =========================================================
STATUS
========================================================= */

function setDashboardStatus(message, type) {
const element =
byId("dashboardStatus");

if (!element) {
  return;
}

element.textContent =
  String(message || "");

element.className =
  "dashboard-status" +
  (type
    ? " " + type
    : "");

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


if (
  !window.ALBukhrEnvironment.isKnown()
) {
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
  String(
    window.ALBukhrEnvironment
      .getNetwork() || ""
  )
    .trim()
    .toLowerCase();


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
PI USER ID
========================================================= */

function getPiUid(user) {

if (!user) {
  return null;
}


const possibleValues = [

  user.pi_uid,

  user.piUid,

  user.uid,

  user.user_uid,

  user.userUid,

  user.id

];


for (
  let index = 0;
  index < possibleValues.length;
  index += 1
) {

  const value =
    String(
      possibleValues[index] || ""
    ).trim();


  if (value) {
    return value;
  }

}


return null;

}

/* =========================================================
NORMALIZATION
========================================================= */

function normalizeStatus(status) {

return String(
  status || "draft"
)
  .trim()
  .toLowerCase()
  .replace(
    /\s+/g,
    "_"
  )
  .replace(
    /-/g,
    "_"
  );

}

function statusLabel(status) {

const normalized =
  normalizeStatus(status);


const labels = {

  draft:
    "Draft",

  submitted:
    "Submitted",

  under_review:
    "Under Review",

  review:
    "Under Review",

  revision_requested:
    "Revision Requested",

  revision:
    "Revision Requested",

  changes_requested:
    "Revision Requested",

  approved:
    "Approved",

  rejected:
    "Rejected",

  converted:
    "Converted"

};


return (
  labels[normalized] ||
  normalized
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      function (letter) {
        return letter.toUpperCase();
      }
    )
);

}

/* =========================================================
DATE FORMAT
========================================================= */

function formatDate(value) {

if (!value) {
  return "Not available";
}


const date =
  new Date(value);


if (
  Number.isNaN(
    date.getTime()
  )
) {
  return "Not available";
}


try {

  return new Intl.DateTimeFormat(
    undefined,
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  ).format(date);

}
catch (error) {

  return date.toLocaleString();

}

}

/* =========================================================
NUMBER FORMAT
========================================================= */

function formatFunding(
amount,
asset
) {

const numericAmount =
  Number(amount);


const formattedAmount =
  Number.isFinite(
    numericAmount
  )
    ? new Intl.NumberFormat(
        undefined,
        {
          maximumFractionDigits:
            7
        }
      ).format(
        numericAmount
      )
    : "Not specified";


const normalizedAsset =
  String(
    asset || "PI"
  )
    .trim()
    .toUpperCase();


if (
  formattedAmount ===
  "Not specified"
) {
  return formattedAmount;
}


return (
  formattedAmount +
  " " +
  normalizedAsset
);

}

/* =========================================================
URL HELPERS
========================================================= */

function buildCreateUrl() {

return (
  "external-create.html"
);

}

function buildEditUrl(
applicationId
) {

return (
  "external-create.html?application_id=" +
  encodeURIComponent(
    applicationId
  )
);

}

function buildDetailUrl(
applicationId
) {

return (
  "external-project-detail.html?application_id=" +
  encodeURIComponent(
    applicationId
  )
);

}

/* =========================================================
APPLICATION EDITABILITY
========================================================= */

function isEditableStatus(
status
) {

const normalized =
  normalizeStatus(status);


return [

  "draft",

  "revision_requested",

  "revision",

  "changes_requested"

].includes(
  normalized
);

}

/* =========================================================
VIEW STATE
========================================================= */

function showLoading() {

const loadingElement =
  byId("applicationsLoading");

const emptyElement =
  byId("emptyState");

const listElement =
  byId("applicationsList");

const errorElement =
  byId("dashboardError");


if (loadingElement) {
  loadingElement.hidden =
    false;
}


if (emptyElement) {
  emptyElement.hidden =
    true;
}


if (listElement) {
  listElement.hidden =
    true;
}


if (errorElement) {
  errorElement.hidden =
    true;
}

}

function showEmpty() {

const loadingElement =
  byId("applicationsLoading");

const emptyElement =
  byId("emptyState");

const listElement =
  byId("applicationsList");

const errorElement =
  byId("dashboardError");


if (loadingElement) {
  loadingElement.hidden =
    true;
}


if (emptyElement) {
  emptyElement.hidden =
    false;
}


if (listElement) {
  listElement.hidden =
    true;
}


if (errorElement) {
  errorElement.hidden =
    true;
}

}

function showApplications() {

const loadingElement =
  byId("applicationsLoading");

const emptyElement =
  byId("emptyState");

const listElement =
  byId("applicationsList");

const errorElement =
  byId("dashboardError");


if (loadingElement) {
  loadingElement.hidden =
    true;
}


if (emptyElement) {
  emptyElement.hidden =
    true;
}


if (listElement) {
  listElement.hidden =
    false;
}


if (errorElement) {
  errorElement.hidden =
    true;
}

}

function showError(
message
) {

const loadingElement =
  byId("applicationsLoading");

const emptyElement =
  byId("emptyState");

const listElement =
  byId("applicationsList");

const errorElement =
  byId("dashboardError");

const errorMessage =
  byId(
    "dashboardErrorMessage"
  );


if (loadingElement) {
  loadingElement.hidden =
    true;
}


if (emptyElement) {
  emptyElement.hidden =
    true;
}


if (listElement) {
  listElement.hidden =
    true;
}


if (errorElement) {
  errorElement.hidden =
    false;
}


if (errorMessage) {

  errorMessage.textContent =
    String(
      message ||
      "An unexpected error occurred."
    );

}

}

/* =========================================================
AUTH UI
========================================================= */

function updateAuthenticationUI() {

const username =
  String(
    currentUser &&
    (
      currentUser.username ||
      currentUser.pi_username ||
      currentUser.piUsername
    ) ||
    "ALBUKHR User"
  ).trim();


const network =
  currentNetwork
    ? currentNetwork.toUpperCase()
    : "NETWORK";


const avatar =
  username
    .charAt(0)
    .toUpperCase();


const usernameElement =
  byId("authUsername");

const networkElement =
  byId("authNetwork");

const avatarElement =
  byId("authAvatar");

const networkIndicator =
  byId("networkIndicator");


if (usernameElement) {

  usernameElement.textContent =
    username;

}


if (networkElement) {

  networkElement.textContent =
    "Authenticated with Pi • " +
    network;

}


if (avatarElement) {

  avatarElement.textContent =
    avatar || "A";

}


if (networkIndicator) {

  networkIndicator.textContent =
    network;

}

}

/* =========================================================
SUMMARY
========================================================= */

function calculateSummary() {

const summary = {

  total:
    applications.length,

  draft:
    0,

  review:
    0,

  approved:
    0

};


applications.forEach(
  function (
    application
  ) {

    const status =
      normalizeStatus(
        application.status
      );


    if (
      status === "draft"
    ) {

      summary.draft += 1;

    }


    if (

      status ===
        "submitted" ||

      status ===
        "under_review" ||

      status ===
        "review"

    ) {

      summary.review += 1;

    }


    if (
      status === "approved"
    ) {

      summary.approved += 1;

    }

  }
);


return summary;

}

function updateSummary() {

const summary =
  calculateSummary();


const totalElement =
  byId("totalApplications");

const draftElement =
  byId("draftApplications");

const reviewElement =
  byId("reviewApplications");

const approvedElement =
  byId("approvedApplications");


if (totalElement) {

  totalElement.textContent =
    String(
      summary.total
    );

}


if (draftElement) {

  draftElement.textContent =
    String(
      summary.draft
    );

}


if (reviewElement) {

  reviewElement.textContent =
    String(
      summary.review
    );

}


if (approvedElement) {

  approvedElement.textContent =
    String(
      summary.approved
    );

}

}

/* =========================================================
FILTERING
========================================================= */

function getFilteredApplications() {

if (
  activeStatusFilter ===
  "all"
) {

  return applications.slice();

}


return applications.filter(
  function (
    application
  ) {

    return (
      normalizeStatus(
        application.status
      ) ===
      activeStatusFilter
    );

  }
);

}

function updateFilterButtons() {

const buttons =
  document.querySelectorAll(
    ".status-filter"
  );


buttons.forEach(
  function (
    button
  ) {

    const status =
      String(
        button.dataset.status ||
        ""
      )
        .trim()
        .toLowerCase();


    button.classList.toggle(
      "active",

      status ===
        activeStatusFilter
    );


    button.setAttribute(

      "aria-selected",

      status ===
        activeStatusFilter
          ? "true"
          : "false"

    );

  }
);

}

/* =========================================================
COUNT TEXT
========================================================= */

function updateApplicationCountText(
filteredApplications
) {

const element =
  byId(
    "applicationCountText"
  );


if (!element) {
  return;
}


const total =
  applications.length;

const visible =
  filteredApplications.length;


if (
  total === 0
) {

  element.textContent =
    "No applications on this network.";

  return;

}


if (
  activeStatusFilter ===
  "all"
) {

  element.textContent =

    total === 1

      ? "1 application"

      : total +
        " applications";

  return;

}


element.textContent =

  visible === 1

    ? "1 " +
      statusLabel(
        activeStatusFilter
      )
        .toLowerCase() +
      " application"

    : visible +
      " " +
      statusLabel(
        activeStatusFilter
      )
        .toLowerCase() +
      " applications";

}

/* =========================================================
APPLICATION CARD
========================================================= */

function createApplicationCard(
application
) {

const card =
  document.createElement(
    "article"
  );


card.className =
  "application-card";


const status =
  normalizeStatus(
    application.status
  );


card.dataset.applicationId =
  application.id || "";

card.dataset.status =
  status;


const top =
  document.createElement(
    "div"
  );

top.className =
  "application-card-top";


const identity =
  document.createElement(
    "div"
  );

identity.className =
  "application-identity";


const title =
  document.createElement(
    "h3"
  );

title.textContent =
  application.project_name ||
  "Unnamed Project";


const code =
  document.createElement(
    "span"
  );

code.className =
  "application-code";

code.textContent =

  application.application_code ||

  application.project_code ||

  "APPLICATION";


identity.appendChild(
  title
);

identity.appendChild(
  code
);


const badge =
  document.createElement(
    "span"
  );

badge.className =
  "application-status status-" +
  status;

badge.textContent =
  statusLabel(
    status
  );


top.appendChild(
  identity
);

top.appendChild(
  badge
);


/* -----------------------------------------
   BUSINESS
----------------------------------------- */

const business =
  document.createElement(
    "div"
  );

business.className =
  "application-business";


const businessName =
  document.createElement(
    "strong"
  );

businessName.textContent =
  application.business_name ||
  "Business not specified";


const location =
  document.createElement(
    "span"
  );


const locationParts = [

  application.city,

  application.state,

  application.country

].filter(
  function (
    item
  ) {

    return Boolean(
      String(
        item || ""
      ).trim()
    );

  }
);


location.textContent =

  locationParts.length

    ? locationParts.join(
        ", "
      )

    : "Location not specified";


business.appendChild(
  businessName
);

business.appendChild(
  location
);


/* -----------------------------------------
   META
----------------------------------------- */

const meta =
  document.createElement(
    "div"
  );

meta.className =
  "application-meta";


function createMetaItem(
  label,
  value
) {

  const item =
    document.createElement(
      "div"
    );


  item.className =
    "application-meta-item";


  const metaLabel =
    document.createElement(
      "span"
    );

  metaLabel.className =
    "meta-label";

  metaLabel.textContent =
    label;


  const metaValue =
    document.createElement(
      "strong"
    );

  metaValue.className =
    "meta-value";

  metaValue.textContent =
    value;


  item.appendChild(
    metaLabel
  );

  item.appendChild(
    metaValue
  );


  return item;

}


meta.appendChild(

  createMetaItem(

    "Funding",

    formatFunding(

      application.funding_required,

      application.funding_asset

    )

  )

);


meta.appendChild(

  createMetaItem(

    "Model",

    application.investment_model ||
    "Not specified"

  )

);


meta.appendChild(

  createMetaItem(

    "Duration",

    application.project_duration_days

      ? application.project_duration_days +
        " days"

      : "Not specified"

  )

);


/* -----------------------------------------
   FOOTER
----------------------------------------- */

const footer =
  document.createElement(
    "div"
  );

footer.className =
  "application-footer";


const date =
  document.createElement(
    "span"
  );

date.className =
  "application-date";

date.textContent =

  "Updated " +

  formatDate(
    application.updated_at ||
    application.created_at
  );


const actions =
  document.createElement(
    "div"
  );

actions.className =
  "application-actions";


const viewButton =
  document.createElement(
    "button"
  );

viewButton.type =
  "button";

viewButton.className =
  "application-action secondary-action";

viewButton.textContent =
  "View";


viewButton.addEventListener(

  "click",

  function () {

    if (!application.id) {
      return;
    }


    window.location.href =
      buildDetailUrl(
        application.id
      );

  }

);


actions.appendChild(
  viewButton
);


if (
  isEditableStatus(
    status
  )
) {

  const editButton =
    document.createElement(
      "button"
    );


  editButton.type =
    "button";

  editButton.className =
    "application-action primary-action";

  editButton.textContent =
    status ===
    "revision_requested"

      ? "Revise"

      : "Edit";


  editButton.addEventListener(

    "click",

    function () {

      if (!application.id) {
        return;
      }


      window.location.href =
        buildEditUrl(
          application.id
        );

    }

  );


  actions.appendChild(
    editButton
  );

}


footer.appendChild(
  date
);

footer.appendChild(
  actions
);


/* -----------------------------------------
   ASSEMBLE
----------------------------------------- */

card.appendChild(
  top
);

card.appendChild(
  business
);

card.appendChild(
  meta
);

card.appendChild(
  footer
);


return card;

}

/* =========================================================
EMPTY FILTER RESULT
========================================================= */

function createFilteredEmptyState() {

const container =
  document.createElement(
    "div"
  );


container.className =
  "filtered-empty-state";


const title =
  document.createElement(
    "strong"
  );

title.textContent =
  "No matching applications";


const text =
  document.createElement(
    "span"
  );

text.textContent =

  "There are no " +

  statusLabel(
    activeStatusFilter
  )
    .toLowerCase() +

  " applications to display.";


container.appendChild(
  title
);

container.appendChild(
  text
);


return container;

}

/* =========================================================
RENDER
========================================================= */

function renderApplications() {

const container =
  byId(
    "applicationsList"
  );


if (!container) {
  return;
}


const filteredApplications =
  getFilteredApplications();


updateApplicationCountText(
  filteredApplications
);


container.innerHTML =
  "";


if (
  applications.length === 0
) {

  showEmpty();

  return;

}


showApplications();


if (
  filteredApplications.length === 0
) {

  container.appendChild(
    createFilteredEmptyState()
  );

  return;

}


filteredApplications.forEach(
  function (
    application
  ) {

    container.appendChild(

      createApplicationCard(
        application
      )

    );

  }
);

}

/* =========================================================
RPC LOAD
========================================================= */

async function loadApplications(
options
) {

const settings =
  options || {};


if (loading) {
  return;
}


loading = true;


const refreshButton =
  byId(
    "refreshApplicationsButton"
  );


try {

  if (
    settings.showLoading !== false
  ) {

    showLoading();

  }


  if (refreshButton) {

    refreshButton.disabled =
      true;

    refreshButton.textContent =
      "Refreshing...";

  }


  setDashboardStatus(
    "Loading your secure external project applications..."
  );


  const piUid =
    getPiUid(
      currentUser
    );


  if (!piUid) {

    throw new Error(
      "Authenticated Pi user ID is unavailable."
    );

  }


  const {
    data,
    error
  } =
    await window.ALBUKHR_SUPABASE.rpc(

      "get_my_external_project_applications",

      {

        p_pi_uid:
          piUid,

        p_network:
          currentNetwork

      }

    );


  if (error) {
    throw error;
  }


  if (
    !Array.isArray(data)
  ) {

    applications =
      [];

  }
  else {

    applications =
      data.slice();

  }


  applications.sort(
    function (
      first,
      second
    ) {

      const firstDate =
        new Date(

          first.updated_at ||

          first.created_at ||

          0

        ).getTime();


      const secondDate =
        new Date(

          second.updated_at ||

          second.created_at ||

          0

        ).getTime();


      return (
        secondDate -
        firstDate
      );

    }
  );


  updateSummary();

  updateFilterButtons();

  renderApplications();


  setDashboardStatus(

    applications.length === 0

      ? "No external project applications were found on this network."

      : "Your external project applications were loaded securely.",

    "success"

  );

}
catch (error) {

  console.error(
    "[ALBUKHR EXTERNAL PROJECT DASHBOARD]",
    error
  );


  applications =
    [];


  updateSummary();


  updateApplicationCountText(
    []
  );


  showError(

    error.message ||

    "Unable to load external project applications."

  );


  setDashboardStatus(

    "Unable to load your applications securely.",

    "error"

  );

}
finally {

  loading =
    false;


  if (refreshButton) {

    refreshButton.disabled =
      false;

    refreshButton.textContent =
      "Refresh";

  }

}

}

/* =========================================================
FILTER
========================================================= */

function handleFilterClick(
event
) {

const button =
  event.currentTarget;


if (!button) {
  return;
}


const status =
  String(
    button.dataset.status ||
    "all"
  )
    .trim()
    .toLowerCase();


activeStatusFilter =
  status || "all";


updateFilterButtons();

renderApplications();

}

/* =========================================================
CREATE PROJECT
========================================================= */

function openCreateProject() {

window.location.href =
  buildCreateUrl();

}

/* =========================================================
BACK
========================================================= */

function goBack() {

if (
  window.history.length > 1
) {

  window.history.back();

  return;

}


window.location.href =
  "index.html";

}

/* =========================================================
UI EVENTS
========================================================= */

function setupUI() {

/* -----------------------------------------
   CREATE
----------------------------------------- */

const createButton =
  byId(
    "createProjectButton"
  );


if (createButton) {

  createButton.addEventListener(

    "click",

    openCreateProject

  );

}


const emptyCreateButton =
  byId(
    "emptyCreateProjectButton"
  );


if (emptyCreateButton) {

  emptyCreateButton.addEventListener(

    "click",

    openCreateProject

  );

}


/* -----------------------------------------
   REFRESH
----------------------------------------- */

const refreshButton =
  byId(
    "refreshApplicationsButton"
  );


if (refreshButton) {

  refreshButton.addEventListener(

    "click",

    function () {

      loadApplications({
        showLoading:
          false
      });

    }

  );

}


/* -----------------------------------------
   RETRY
----------------------------------------- */

const retryButton =
  byId(
    "retryApplicationsButton"
  );


if (retryButton) {

  retryButton.addEventListener(

    "click",

    function () {

      loadApplications({
        showLoading:
          true
      });

    }

  );

}


/* -----------------------------------------
   BACK
----------------------------------------- */

const backButton =
  byId(
    "backButton"
  );


if (backButton) {

  backButton.addEventListener(

    "click",

    goBack

  );

}


/* -----------------------------------------
   FILTERS
----------------------------------------- */

const filterButtons =
  document.querySelectorAll(
    ".status-filter"
  );


filterButtons.forEach(

  function (
    button
  ) {

    button.addEventListener(

      "click",

      handleFilterClick

    );

  }

);

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

    throw new Error(
      "Pi authentication is required."
    );

  }


  currentNetwork =
    getNetwork();


  updateAuthenticationUI();


  setupUI();


  setDashboardStatus(
    "Secure authentication verified. Loading your projects..."
  );


  await loadApplications({
    showLoading:
      true
  });

}
catch (error) {

  console.error(

    "[ALBUKHR EXTERNAL DASHBOARD INIT]",

    error

  );


  showError(

    error.message ||

    "Unable to initialize the external project dashboard."

  );


  setDashboardStatus(

    "External project dashboard unavailable: " +

    (
      error.message ||
      "Unknown error"
    ),

    "error"

  );


  const refreshButton =
    byId(
      "refreshApplicationsButton"
    );


  if (refreshButton) {

    refreshButton.disabled =
      true;

  }

}

}

/* =========================================================
DOM READY
========================================================= */

if (
document.readyState ===
"loading"
) {

document.addEventListener(

  "DOMContentLoaded",

  initialize,

  {
    once:
      true
  }

);

}
else {

initialize();

}

})(window);
