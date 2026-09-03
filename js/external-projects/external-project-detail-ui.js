/* =========================================================
   ALBUKHR EXTERNAL PROJECT DETAIL UI
   File:
   js/external-projects/external-project-detail-ui.js

   Renders data supplied by external-project-detail-engine.js
========================================================= */
(function (window, document) {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "—";
  }

  function statusClass(status) {
    return "status-" + String(status || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  }

  function renderList(id, rows, renderer, emptyText) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!rows || !rows.length) {
      el.innerHTML = '<div class="detail-empty">' + escapeHtml(emptyText || "No records available.") + "</div>";
      return;
    }
    el.innerHTML = rows.map(renderer).join("");
  }

  function render(payload) {
    const app = payload.application || {};

    setText("projectName", app.project_name);
    setText("projectCode", app.project_code);
    setText("applicationCode", app.application_code);
    setText("businessName", app.business_name);
    setText("industry", app.industry);
    setText("category", app.category);
    setText("country", app.country);
    setText("location", [app.city, app.state, app.country].filter(Boolean).join(", "));
    setText("fundingRequired", app.funding_required != null ? String(app.funding_required) + " " + (app.funding_asset || "PI") : "—");
    setText("investmentModel", app.investment_model);
    setText("duration", app.project_duration_days != null ? String(app.project_duration_days) + " days" : "—");
    setText("submittedAt", formatDate(app.submitted_at));
    setText("createdAt", formatDate(app.created_at));
    setText("projectDescription", app.project_description || "No description provided.");

    const status = document.getElementById("projectStatus");
    if (status) {
      const value = app.status || "unknown";
      status.textContent = String(value).toUpperCase();
      status.className = "detail-status " + statusClass(value);
    }

    renderList("teamList", payload.team, function (member) {
      return '<article class="detail-row"><strong>' + escapeHtml(member.full_name) +
        '</strong><span>' + escapeHtml(member.role || member.title || "Team member") +
        '</span><p>' + escapeHtml(member.bio || "") + '</p></article>';
    }, "No team members recorded.");

    renderList("documentList", payload.documents, function (doc) {
      const url = doc.document_url ? String(doc.document_url) : "";
      const name = escapeHtml(doc.document_name || doc.document_type || "Document");
      const link = url ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">Open</a>' : '<span>Unavailable</span>';
      return '<article class="detail-row"><strong>' + name + '</strong><span>' +
        escapeHtml(doc.verification_status || "pending") + '</span><p>' + link + '</p></article>';
    }, "No documents available.");

    renderList("reviewList", payload.reviews, function (review) {
      return '<article class="detail-row"><strong>' + escapeHtml(review.decision || review.review_type || "Review") +
        '</strong><span>' + formatDate(review.created_at) +
        '</span><p>' + escapeHtml(review.comments || "No comments.") + '</p></article>';
    }, "No reviews available.");

    renderList("auditList", payload.auditLog, function (entry) {
      return '<article class="detail-row"><strong>' + escapeHtml(entry.action || "Activity") +
        '</strong><span>' + formatDate(entry.created_at) +
        '</span><p>' + escapeHtml((entry.old_status || "—") + " → " + (entry.new_status || "—")) + '</p></article>';
    }, "No activity records available.");

    document.body.classList.remove("detail-loading");
    document.body.classList.add("detail-loaded");
  }

  function showError(error) {
    const box = document.getElementById("detailError");
    if (box) {
      box.hidden = false;
      box.textContent = error && error.message ? error.message : "Unable to load project details.";
    }
    document.body.classList.remove("detail-loading");
    document.body.classList.add("detail-error");
  }

  window.addEventListener("albukhr:external-project-detail-loaded", function (event) {
    render(event.detail);
  });

  window.ALBukhrExternalProjectDetailUI = Object.freeze({
    render,
    showError
  });

})(window, document);
