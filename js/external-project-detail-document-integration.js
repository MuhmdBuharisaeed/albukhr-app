/* =========================================================
   ALBUKHR EXTERNAL PROJECT DETAIL - DOCUMENT INTEGRATION
   File:
   js/external-project-detail-document-integration.js

   Requires:
   - js/core/environment-core.js
   - js/core/supabase-core.js
   - js/core/pi-auth-core.js
   - js/core/page-auth-guard.js
   - Existing external-project-detail page engine

   HTML IDs expected:
   #externalProjectDocuments
   #externalProjectDocumentUpload
   #externalProjectDocumentType
   #externalProjectDocumentStatus
   ========================================================= */

(function (window, document) {
  "use strict";

  const Core = window.ALBUKHR_SUPABASE;
  const Environment = window.ALBukhrEnvironment;

  if (!Core || !Environment) {
    console.error("ALBUKHR document integration dependencies are missing.");
    return;
  }

  const state = {
    applicationId: null,
    projectCode: null,
    loading: false,
    uploading: false
  };

  function getCurrentContext() {
    const params = new URLSearchParams(window.location.search);

    return {
      applicationId:
        params.get("application_id") ||
        params.get("applicationId"),

      projectCode:
        params.get("project_code") ||
        params.get("projectCode")
    };
  }

  function getUserId() {
    /*
     * The detail-page backend/RPC architecture should provide
     * the authenticated ALBUKHR database user UUID.
     *
     * This integration first checks the shared page context.
     */
    return (
      window.ALBukhrPageContext?.userId ||
      window.ALBukhrCurrentUser?.id ||
      null
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(message, type) {
    const el = document.getElementById("externalProjectDocumentStatus");
    if (!el) return;

    el.textContent = message || "";
    el.dataset.status = type || "";
  }

  function getDocumentsContainer() {
    return document.getElementById("externalProjectDocuments");
  }

  function renderDocuments(documents) {
    const container = getDocumentsContainer();
    if (!container) return;

    if (!Array.isArray(documents) || !documents.length) {
      container.innerHTML = `
        <div class="external-document-empty">
          No documents have been uploaded for this project.
        </div>
      `;
      return;
    }

    container.innerHTML = documents.map(function (doc) {
      const status = escapeHtml(doc.verification_status || "pending");
      const name = escapeHtml(doc.document_name || "Document");
      const type = escapeHtml(doc.document_type || "document");
      const url = doc.document_url ? String(doc.document_url) : "";

      const action = url
        ? `<a class="external-document-open"
              href="${escapeHtml(url)}"
              target="_blank"
              rel="noopener noreferrer">Open</a>`
        : `<span class="external-document-unavailable">Unavailable</span>`;

      return `
        <article class="external-document-item">
          <div class="external-document-main">
            <div class="external-document-name">${name}</div>
            <div class="external-document-meta">${type}</div>
          </div>

          <div class="external-document-side">
            <span class="external-document-verification ${status}">
              ${status}
            </span>
            ${action}
          </div>
        </article>
      `;
    }).join("");
  }

  async function loadDocuments() {
    if (state.loading) return;

    const userId = getUserId();

    if (!state.applicationId || !state.projectCode) {
      setStatus("Project context is unavailable.", "error");
      return;
    }

    if (!userId) {
      setStatus("Authenticated database user is unavailable.", "error");
      return;
    }

    state.loading = true;
    setStatus("Loading documents...", "loading");

    try {
      const { data, error } = await Core.rpc(
        "get_my_external_project_documents",
        {
          p_user_id: userId,
          p_application_id: state.applicationId,
          p_network: Environment.getNetwork()
        }
      );

      if (error) throw error;

      renderDocuments(data || []);
      setStatus("", "success");

    } catch (error) {
      console.error("Failed to load external project documents:", error);
      setStatus(
        error?.message || "Unable to load project documents.",
        "error"
      );
    } finally {
      state.loading = false;
    }
  }

  async function uploadDocument(file, documentType) {
    if (state.uploading) return;

    const userId = getUserId();

    if (!file) {
      setStatus("Select a document first.", "error");
      return;
    }

    if (!state.applicationId || !state.projectCode || !userId) {
      setStatus("Document upload context is incomplete.", "error");
      return;
    }

    state.uploading = true;
    setStatus("Uploading document...", "loading");

    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = [
        Environment.getNetwork(),
        userId,
        state.applicationId,
        Date.now() + "_" + safeName
      ].join("/");

      const bucket = "external-project-documents";

      const upload = await Core.storage
        .from(bucket)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream"
        });

      if (upload.error) throw upload.error;

      const { data: urlData } = Core.storage
        .from(bucket)
        .getPublicUrl(path);

      const documentUrl =
        urlData?.publicUrl || null;

      const { data, error } = await Core.from(
        "external_project_application_documents"
      )
        .insert({
          application_id: state.applicationId,
          document_type: documentType || "other",
          document_name: file.name,
          storage_bucket: bucket,
          storage_path: path,
          document_url: documentUrl,
          verification_status: "pending",
          uploaded_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      setStatus("Document uploaded successfully.", "success");

      window.dispatchEvent(
        new CustomEvent("albukhr:external-project-document-uploaded", {
          detail: {
            document: data,
            applicationId: state.applicationId,
            network: Environment.getNetwork()
          }
        })
      );

      await loadDocuments();

    } catch (error) {
      console.error("External project document upload failed:", error);
      setStatus(
        error?.message || "Document upload failed.",
        "error"
      );
    } finally {
      state.uploading = false;
    }
  }

  function bindUploadForm() {
    const input = document.getElementById(
      "externalProjectDocumentUpload"
    );

    const type = document.getElementById(
      "externalProjectDocumentType"
    );

    if (!input) return;

    input.addEventListener("change", async function () {
      const file = input.files?.[0];
      if (!file) return;

      await uploadDocument(
        file,
        type?.value || "other"
      );

      input.value = "";
    });
  }

  function init(context) {
    const current = context || getCurrentContext();

    state.applicationId =
      current.applicationId || state.applicationId;

    state.projectCode =
      current.projectCode || state.projectCode;

    bindUploadForm();
    loadDocuments();
  }

  window.ALBukhrExternalProjectDocuments = Object.freeze({
    init,
    loadDocuments,
    uploadDocument,
    getState: function () {
      return Object.freeze({ ...state });
    }
  });

  document.addEventListener(
    "albukhr:external-project-detail-ready",
    function (event) {
      init(event.detail || {});
    }
  );

})(window, document);
