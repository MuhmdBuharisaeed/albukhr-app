/* =========================================================
ALBUKHR EXTERNAL PROJECT DETAIL ENGINE
File: js/external-project-detail.js

Architecture:

- Shared Environment Core
- Shared Supabase Core
- Shared Pi Auth Core
- No LocalStorage authentication
- No LocalStorage application state
- Network-isolated RPC access
- Owner-protected application access

Required RPC Functions:

- get_my_external_project_detail
- get_my_external_project_team
- get_my_external_project_documents
- get_my_external_project_reviews
- get_my_external_project_review_history
- get_my_external_project_audit_log
- submit_my_external_project_application
  ========================================================= */

(function (window, document) {
"use strict";

/* =========================================================
STATE
========================================================= */

const state = {
applicationId: null,
user: null,
network: null,
application: null,
loading: false,
submitting: false
};

/* =========================================================
DOM
========================================================= */

function $(id) {
return document.getElementById(id);
}

const elements = {

back: $("back"),

name: $("name"),

code: $("code"),

network: $("network"),

status: $("status"),

message: $("msg"),

content: $("content"),

loading: $("loading"),

statusText: $("statusText"),

project: $("project"),

business: $("business"),

funding: $("funding"),

team: $("team"),

docs: $("docs"),

history: $("history"),

edit: $("edit"),

submit: $("submit"),

dashboard: $("dash")

};

/* =========================================================
DEPENDENCY VALIDATION
========================================================= */

function checkDependencies() {

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


if (!window.AlbukhrPiAuth) {

  throw new Error(
    "ALBUKHR Pi Auth Core is unavailable."
  );

}

}

/* =========================================================
HELPERS
========================================================= */

function normalizeText(value) {

if (
  value === null ||
  value === undefined ||
  value === ""
) {

  return "—";

}


return String(value);

}

function escapeHTML(value) {

return String(
  value === null ||
  value === undefined
    ? ""
    : value
)

  .replace(/&/g, "&amp;")

  .replace(/</g, "&lt;")

  .replace(/>/g, "&gt;")

  .replace(/"/g, "&quot;")

  .replace(/'/g, "&#039;");

}

function getApplicationIdFromURL() {

const parameters =
  new URLSearchParams(
    window.location.search
  );


const applicationId =
  parameters.get("application_id");


if (
  !applicationId ||
  !String(applicationId).trim()
) {

  throw new Error(
    "Application ID is missing."
  );

}


return String(applicationId).trim();

}

function getCurrentNetwork() {

const environment =
  window.ALBukhrEnvironment;


if (
  !environment ||
  typeof environment.isKnown !== "function" ||
  typeof environment.getNetwork !== "function"
) {

  throw new Error(
    "ALBUKHR environment is unavailable."
  );

}


if (!environment.isKnown()) {

  throw new Error(
    "ALBUKHR environment is not recognized."
  );

}


const network =
  String(
    environment.getNetwork() || ""
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

function getPiUID(user) {

if (!user) return null;


const candidates = [

  user.pi_uid,

  user.piUid,

  user.uid,

  user.user_uid,

  user.userUid,

  user.id

];


for (
  let index = 0;
  index < candidates.length;
  index += 1
) {

  const value =
    candidates[index];


  if (
    value !== null &&
    value !== undefined &&
    String(value).trim()
  ) {

    return String(value).trim();

  }

}


return null;

}

function formatStatus(status) {

return String(
  status || "draft"
)

  .replace(/_/g, " ")

  .replace(/\b\w/g, function (letter) {

    return letter.toUpperCase();

  });

}

function normalizeStatus(status) {

return String(
  status || "draft"
)

  .trim()

  .toLowerCase();

}

function formatDate(value) {

if (!value) return "—";


try {

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return normalizeText(value);

  }


  return date.toLocaleString();

}

catch (error) {

  return normalizeText(value);

}

}

function formatNumber(value) {

if (
  value === null ||
  value === undefined ||
  value === ""
) {

  return "—";

}


const number =
  Number(value);


if (
  Number.isNaN(number)
) {

  return String(value);

}


return number.toLocaleString();

}

function formatFunding(
amount,
asset
) {

if (
  amount === null ||
  amount === undefined ||
  amount === ""
) {

  return "—";

}


const formattedAmount =
  formatNumber(amount);


const formattedAsset =
  String(
    asset || "PI"
  )

    .trim()

    .toUpperCase();


return (
  formattedAmount +
  " " +
  formattedAsset
);

}

function safeArray(value) {

return Array.isArray(value)
  ? value
  : [];

}

/* =========================================================
MESSAGE
========================================================= */

function clearMessage() {

if (!elements.message) return;


elements.message.textContent = "";

elements.message.hidden = true;

}

function showMessage(
message,
type
) {

if (!elements.message) return;


const safeType =
  type || "info";


elements.message.hidden = false;

elements.message.textContent =
  message;


elements.message.dataset.type =
  safeType;

}

function showError(error) {

const message =
  error &&
  error.message
    ? error.message
    : "Unable to load the external project application.";


showMessage(
  "❌ " + message,
  "error"
);

}

/* =========================================================
LOADING
========================================================= */

function setLoading(
loading,
message
) {

state.loading = Boolean(loading);


if (elements.loading) {

  elements.loading.hidden =
    !state.loading;


  if (
    state.loading &&
    message
  ) {

    elements.loading.textContent =
      message;

  }

}


if (elements.content) {

  elements.content.hidden =
    state.loading;

}

}

/* =========================================================
RPC
========================================================= */

async function callRPC(
functionName,
parameters
) {

const supabase =
  window.ALBUKHR_SUPABASE;


if (
  !supabase ||
  typeof supabase.rpc !== "function"
) {

  throw new Error(
    "ALBUKHR Supabase RPC is unavailable."
  );

}


const response =
  await supabase.rpc(
    functionName,
    parameters
  );


if (response.error) {

  throw response.error;

}


return response.data;

}

/* =========================================================
AUTHENTICATION
========================================================= */

async function requireAuthentication() {

const auth =
  window.AlbukhrPiAuth;


if (
  !auth ||
  typeof auth.requireAuth !== "function"
) {

  throw new Error(
    "ALBUKHR Pi authentication is unavailable."
  );

}


const user =
  await auth.requireAuth(
    "login.html"
  );


if (!user) {

  return null;

}


return user;

}

/* =========================================================
RPC PARAMETERS
========================================================= */

function buildOwnerParameters() {

const piUID =
  getPiUID(
    state.user
  );


if (!piUID) {

  throw new Error(
    "Authenticated Pi user identity is unavailable."
  );

}


return {

  p_application_id:
    state.applicationId,

  p_pi_uid:
    piUID,

  p_network:
    state.network

};

}

/* =========================================================
APPLICATION DETAIL
========================================================= */

async function loadApplicationDetail() {

const parameters =
  buildOwnerParameters();


const data =
  await callRPC(
    "get_my_external_project_detail",
    parameters
  );


const rows =
  safeArray(data);


if (!rows.length) {

  throw new Error(
    "Application was not found or access is denied."
  );

}


const application =
  rows[0];


if (
  application.network &&
  String(application.network)
    .trim()
    .toLowerCase() !==
    state.network
) {

  throw new Error(
    "Network isolation check failed."
  );

}


return application;

}

/* =========================================================
TEAM
========================================================= */

async function loadTeam() {

return await callRPC(
  "get_my_external_project_team",
  buildOwnerParameters()
);

}

/* =========================================================
DOCUMENTS
========================================================= */

async function loadDocuments() {

return await callRPC(
  "get_my_external_project_documents",
  buildOwnerParameters()
);

}

/* =========================================================
REVIEWS
========================================================= */

async function loadReviews() {

return await callRPC(
  "get_my_external_project_reviews",
  buildOwnerParameters()
);

}

/* =========================================================
REVIEW HISTORY
========================================================= */

async function loadReviewHistory() {

return await callRPC(
  "get_my_external_project_review_history",
  buildOwnerParameters()
);

}

/* =========================================================
AUDIT LOG
========================================================= */

async function loadAuditLog() {

return await callRPC(
  "get_my_external_project_audit_log",
  buildOwnerParameters()
);

}

/* =========================================================
STATUS TEXT
========================================================= */

function getStatusDescription(status) {

const normalized =
  normalizeStatus(status);


const descriptions = {

  draft:
    "This application is still a draft. You can continue editing it before submission.",


  submitted:
    "This application has been submitted and is awaiting ALBUKHR review.",


  under_review:
    "This application is currently under administrative review.",


  revision_requested:
    "ALBUKHR has requested changes. You can continue editing the application.",


  approved:
    "This application has been approved through the ALBUKHR review framework.",


  rejected:
    "This application was not approved. Review history may contain the decision information.",


  converted:
    "This application has been converted into an ALBUKHR project record."

};


return (

  descriptions[normalized] ||

  "Application status is managed by the ALBUKHR backend."

);

}

/* =========================================================
RENDER HEADER
========================================================= */

function renderHeader() {

const application =
  state.application;


if (!application) return;


const status =
  normalizeStatus(
    application.status
  );


if (elements.name) {

  elements.name.textContent =

    application.project_name ||

    application.business_name ||

    "External Project";

}


if (elements.code) {

  elements.code.textContent =

    application.application_code ||

    application.project_code ||

    state.applicationId;

}


if (elements.network) {

  elements.network.textContent =

    String(
      application.network ||
      state.network
    )

      .toUpperCase();

}


if (elements.status) {

  elements.status.textContent =
    formatStatus(status);


  elements.status.className =
    "status-" + status;

}


if (elements.statusText) {

  elements.statusText.textContent =
    getStatusDescription(status);

}

}

/* =========================================================
RENDER FIELD GRID
========================================================= */

function renderGrid(
container,
fields
) {

if (!container) return;


container.innerHTML = "";


const list =
  safeArray(fields);


if (!list.length) {

  container.innerHTML =
    '<div class="detail-empty">' +
    "No information available." +
    "</div>";

  return;

}


const fragment =
  document.createDocumentFragment();


list.forEach(function (field) {

  const wrapper =
    document.createElement("div");


  wrapper.className =
    "detail-field";


  const label =
    document.createElement("span");


  label.textContent =
    field.label;


  const value =
    document.createElement("strong");


  value.textContent =
    normalizeText(
      field.value
    );


  wrapper.appendChild(label);

  wrapper.appendChild(value);

  fragment.appendChild(wrapper);

});


container.appendChild(fragment);

}

/* =========================================================
RENDER PROJECT
========================================================= */

function renderProjectInformation() {

const application =
  state.application;


renderGrid(
  elements.project,
  [

    {
      label: "Project Name",

      value:
        application.project_name
    },


    {
      label: "Application Code",

      value:
        application.application_code
    },


    {
      label: "Project Code",

      value:
        application.project_code
    },


    {
      label: "Project Slug",

      value:
        application.project_slug
    },


    {
      label: "Industry",

      value:
        application.industry
    },


    {
      label: "Category",

      value:
        application.category
    },


    {
      label: "Project Duration",

      value:

        application.project_duration_days

          ? (
              application.project_duration_days +
              " days"
            )

          : null
    },


    {
      label: "Created",

      value:
        formatDate(
          application.created_at
        )
    }

  ]
);


if (
  application.project_description
) {

  const description =
    document.createElement("div");


  description.className =
    "detail-description";


  description.textContent =
    application.project_description;


  elements.project.appendChild(
    description
  );

}

}

/* =========================================================
RENDER BUSINESS
========================================================= */

function renderBusinessInformation() {

const application =
  state.application;


renderGrid(
  elements.business,
  [

    {
      label: "Business Name",

      value:
        application.business_name
    },


    {
      label:
        "Registration Number",

      value:
        application.business_registration_number
    },


    {
      label: "Country",

      value:
        application.country
    },


    {
      label: "State",

      value:
        application.state
    },


    {
      label: "City",

      value:
        application.city
    },


    {
      label: "Business Address",

      value:
        application.business_address
    },


    {
      label: "Website",

      value:
        application.website
    },


    {
      label: "Contact Email",

      value:
        application.contact_email
    },


    {
      label: "Contact Phone",

      value:
        application.contact_phone
    },


    {
      label: "Pi Wallet",

      value:
        application.pi_wallet
    }

  ]
);

}

/* =========================================================
RENDER FUNDING
========================================================= */

function renderFundingInformation() {

const application =
  state.application;


renderGrid(
  elements.funding,
  [

    {
      label: "Funding Required",

      value:

        formatFunding(
          application.funding_required,
          application.funding_asset
        )
    },


    {
      label: "Funding Asset",

      value:
        application.funding_asset
    },


    {
      label: "Investment Model",

      value:
        application.investment_model
    },


    {
      label: "Project Duration",

      value:

        application.project_duration_days

          ? (
              application.project_duration_days +
              " days"
            )

          : null
    }

  ]
);

}

/* =========================================================
EMPTY LIST
========================================================= */

function renderEmptyList(
container,
message
) {

if (!container) return;


container.innerHTML =
  '<div class="detail-empty">' +
  escapeHTML(message) +
  "</div>";

}

/* =========================================================
TEAM
========================================================= */

function renderTeam(
team
) {

if (!elements.team) return;


const members =
  safeArray(team);


if (!members.length) {

  renderEmptyList(
    elements.team,
    "No team members registered."
  );

  return;

}


elements.team.innerHTML =
  members.map(function (member) {

    const primary =
      member.is_primary_contact
        ? "Primary Contact"
        : "";


    return (

      '<div class="detail-row">' +

        "<strong>" +

          escapeHTML(
            member.full_name
          ) +

        "</strong>" +


        "<span>" +

          escapeHTML(
            member.role
          ) +

          (

            member.title

              ? (
                  " • " +
                  escapeHTML(
                    member.title
                  )
                )

              : ""

          ) +

        "</span>" +


        (

          member.email

            ? (
                "<p>" +

                escapeHTML(
                  member.email
                ) +

                "</p>"
              )

            : ""

        ) +


        (

          primary

            ? (
                "<p>" +
                escapeHTML(primary) +
                "</p>"
              )

            : ""

        ) +


        (

          member.bio

            ? (
                "<p>" +

                escapeHTML(
                  member.bio
                ) +

                "</p>"
              )

            : ""

        ) +

      "</div>"

    );

  })

  .join("");

}

/* =========================================================
DOCUMENTS
========================================================= */

function renderDocuments(
documents
) {

if (!elements.docs) return;


const list =
  safeArray(documents);


if (!list.length) {

  renderEmptyList(
    elements.docs,
    "No documents registered."
  );

  return;

}


elements.docs.innerHTML =
  list.map(function (documentItem) {

    let link = "";


    if (
      documentItem.document_url
    ) {

      const url =
        escapeHTML(
          documentItem.document_url
        );


      link =

        '<p><a ' +

        'href="' + url + '" ' +

        'target="_blank" ' +

        'rel="noopener noreferrer">' +

        "Open Document" +

        "</a></p>";

    }


    return (

      '<div class="detail-row">' +

        "<strong>" +

          escapeHTML(

            documentItem.document_name ||

            documentItem.document_type ||

            "Document"

          ) +

        "</strong>" +


        "<span>" +

          escapeHTML(
            documentItem.document_type
          ) +

        "</span>" +


        (

          documentItem.verification_status

            ? (
                "<p>" +

                "Verification: " +

                escapeHTML(
                  formatStatus(
                    documentItem.verification_status
                  )
                ) +

                "</p>"
              )

            : ""

        ) +


        link +

      "</div>"

    );

  })

  .join("");

}

/* =========================================================
HISTORY
========================================================= */

function renderHistory(
reviews,
reviewHistory,
auditLog
) {

if (!elements.history) return;


const events = [];


safeArray(reviews).forEach(
  function (review) {

    events.push({

      type:
        "Review",


      title:

        review.decision ||

        review.review_type ||

        "Review Activity",


      message:

        review.comments ||

        "",


      created_at:
        review.created_at

    });

  }
);


safeArray(reviewHistory).forEach(
  function (historyItem) {

    events.push({

      type:

        historyItem.event_type ||

        "Review History",


      title:

        historyItem.decision ||

        "Review Activity",


      message:

        historyItem.comments ||

        "",


      created_at:
        historyItem.created_at

    });

  }
);


safeArray(auditLog).forEach(
  function (audit) {

    let details = "";


    if (audit.details) {

      try {

        details =
          typeof audit.details === "string"

            ? audit.details

            : JSON.stringify(
                audit.details
              );

      }

      catch (error) {

        details = "";

      }

    }


    events.push({

      type: "System",

      title:

        audit.action ||

        "Application Activity",


      message:

        details,


      created_at:
        audit.created_at

    });

  }
);


events.sort(
  function (first, second) {

    const firstTime =
      new Date(
        first.created_at || 0
      ).getTime();


    const secondTime =
      new Date(
        second.created_at || 0
      ).getTime();


    return secondTime - firstTime;

  }
);


if (!events.length) {

  renderEmptyList(
    elements.history,
    "No review activity yet."
  );

  return;

}


elements.history.innerHTML =
  events.map(function (event) {

    return (

      '<div class="detail-row">' +

        "<strong>" +

          escapeHTML(
            formatStatus(
              event.title
            )
          ) +

        "</strong>" +


        "<span>" +

          escapeHTML(
            event.type
          ) +

          " • " +

          escapeHTML(
            formatDate(
              event.created_at
            )
          ) +

        "</span>" +


        (

          event.message

            ? (
                "<p>" +

                escapeHTML(
                  event.message
                ) +

                "</p>"
              )

            : ""

        ) +

      "</div>"

    );

  })

  .join("");

}

/* =========================================================
ACTION VISIBILITY
========================================================= */

function updateActionButtons() {

if (!state.application) return;


const status =
  normalizeStatus(
    state.application.status
  );


const editable =
  status === "draft" ||
  status === "revision_requested";


if (elements.edit) {

  elements.edit.hidden =
    !editable;

}


if (elements.submit) {

  elements.submit.hidden =
    status !== "draft";

}

}

/* =========================================================
EDIT
========================================================= */

function openEditor() {

if (!state.applicationId) return;


window.location.assign(

  "external-create.html?application_id=" +

  encodeURIComponent(
    state.applicationId
  )

);

}

/* =========================================================
DASHBOARD
========================================================= */

function openDashboard() {

window.location.assign(
  "external-project-dashboard.html"
);

}

/* =========================================================
BACK
========================================================= */

function goBack() {

if (
  window.history &&
  window.history.length > 1
) {

  window.history.back();

  return;

}


openDashboard();

}

/* =========================================================
SUBMIT APPLICATION
========================================================= */

async function submitApplication() {

if (state.submitting) return;


if (!state.applicationId) {

  showMessage(
    "❌ Application ID is unavailable.",
    "error"
  );

  return;

}


const confirmed =
  window.confirm(

    "Submit this external project application for ALBUKHR review?"

  );


if (!confirmed) return;


state.submitting = true;


if (elements.submit) {

  elements.submit.disabled = true;

  elements.submit.textContent =
    "Submitting...";

}


clearMessage();


try {

  const piUID =
    getPiUID(
      state.user
    );


  if (!piUID) {

    throw new Error(
      "Authenticated Pi user identity is unavailable."
    );

  }


  const result =
    await callRPC(
      "submit_my_external_project_application",
      {

        p_application_id:
          state.applicationId,

        p_pi_uid:
          piUID,

        p_network:
          state.network

      }
    );


  if (result !== true) {

    console.info(
      "ALBUKHR submission response:",
      result
    );

  }


  showMessage(
    "Application submitted successfully.",
    "success"
  );


  await loadPageData();


}

catch (error) {

  console.error(
    "External project submission failed:",
    error
  );


  showMessage(

    "❌ " +

    (
      error.message ||
      "Unable to submit the application."
    ),

    "error"

  );

}

finally {

  state.submitting = false;


  if (elements.submit) {

    elements.submit.disabled =
      false;

    elements.submit.textContent =
      "Submit Application";

  }

}

}

/* =========================================================
RENDER ALL
========================================================= */

function renderApplication() {

renderHeader();

renderProjectInformation();

renderBusinessInformation();

renderFundingInformation();

updateActionButtons();

}

/* =========================================================
LOAD PAGE DATA
========================================================= */

async function loadPageData() {

setLoading(
  true,
  "Loading application..."
);


clearMessage();


try {

  const application =
    await loadApplicationDetail();


  state.application =
    application;


  renderApplication();


  const results =
    await Promise.allSettled([

      loadTeam(),

      loadDocuments(),

      loadReviews(),

      loadReviewHistory(),

      loadAuditLog()

    ]);


  const team =

    results[0].status === "fulfilled"

      ? results[0].value

      : [];


  const documents =

    results[1].status === "fulfilled"

      ? results[1].value

      : [];


  const reviews =

    results[2].status === "fulfilled"

      ? results[2].value

      : [];


  const reviewHistory =

    results[3].status === "fulfilled"

      ? results[3].value

      : [];


  const auditLog =

    results[4].status === "fulfilled"

      ? results[4].value

      : [];


  results.forEach(
    function (result) {

      if (
        result.status === "rejected"
      ) {

        console.warn(
          "External project supplementary data failed:",
          result.reason
        );

      }

    }
  );


  renderTeam(team);

  renderDocuments(documents);

  renderHistory(
    reviews,
    reviewHistory,
    auditLog
  );


  setLoading(false);


  if (elements.content) {

    elements.content.hidden =
      false;

  }


  console.info(
    "ALBUKHR External Project Detail loaded.",
    {

      application_id:
        state.applicationId,

      network:
        state.network,

      project:
        state.application.project_name

    }
  );

}

catch (error) {

  console.error(
    "External Project Detail load failed:",
    error
  );


  setLoading(false);

  showError(error);

}

}

/* =========================================================
EVENT BINDING
========================================================= */

function bindEvents() {

if (elements.back) {

  elements.back.addEventListener(
    "click",
    goBack
  );

}


if (elements.edit) {

  elements.edit.addEventListener(
    "click",
    openEditor
  );

}


if (elements.submit) {

  elements.submit.addEventListener(
    "click",
    submitApplication
  );

}


if (elements.dashboard) {

  elements.dashboard.addEventListener(
    "click",
    openDashboard
  );

}

}

/* =========================================================
INITIALIZATION
========================================================= */

async function initialize() {

try {

  checkDependencies();


  state.applicationId =
    getApplicationIdFromURL();


  state.network =
    getCurrentNetwork();


  state.user =
    await requireAuthentication();


  if (!state.user) {

    return;

  }


  bindEvents();


  await loadPageData();


}

catch (error) {

  console.error(
    "ALBUKHR External Project Detail initialization failed:",
    error
  );


  if (elements.loading) {

    elements.loading.hidden =
      true;

  }


  if (elements.content) {

    elements.content.hidden =
      true;

  }


  showError(error);

}

}

/* =========================================================
START
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

})(window, document);
