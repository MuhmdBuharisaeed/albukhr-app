/* =========================================================
   ALBUKHR EXTERNAL PROJECT DOCUMENT INTEGRATION
   Secure applicant upload path.

   Flow:
   1. Ask server for a short-lived upload target.
   2. Upload directly to the PRIVATE storage bucket through
      the scoped storage INSERT policy.
   3. Register the uploaded object through the applicant RPC.
   4. Refresh the canonical document list.

   Never writes directly to the public document table.
   Never generates a public URL for the private bucket.
========================================================= */

(function (window, document) {
  "use strict";

  const Core = window.ALBUKHR_SUPABASE;
  const Environment = window.ALBukhrEnvironment;

  const state = {
    applicationId: null,
    network: null,
    loading: false,
    uploading: false,
    bound: false,
    editable: false
  };

  const ALLOWED_TYPES = Object.freeze([
    "business_registration",
    "project_proposal",
    "business_plan",
    "financial_statement",
    "identity_document",
    "ownership_document",
    "other"
  ]);

  const MIME_TO_EXTENSION = Object.freeze({
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp"
  });

  const MAX_SIZE = 10 * 1024 * 1024;

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(message, type) {
    const element = byId("externalProjectDocumentStatus");
    if (!element) return;
    element.textContent = String(message || "");
    element.className = "form-status" + (type ? " " + type : "");
  }

  function getContextFromEvent(event) {
    const detail = event?.detail || {};
    const params = new URLSearchParams(window.location.search);
    return {
      applicationId: detail.applicationId || params.get("application_id"),
      network: detail.network || Environment?.getNetwork?.(),
      status: detail.application?.status || null
    };
  }

  function getPiUid() {
    const guard = window.AlbukhrPageAuthGuard;
    const piUid =
      typeof guard?.getPiUid === "function" ? guard.getPiUid() : null;
    if (!piUid) throw new Error("Authenticated Pi UID is unavailable.");
    return String(piUid).trim();
  }

  function normalizeStatus(value) {
    return String(value || "draft").trim().toLowerCase().replace(/\s+/g, "_");
  }

  function isEditableStatus(status) {
    return ["draft", "needs_revision"].includes(normalizeStatus(status));
  }

  function sanitizeFilename(file) {
    let name = String(file?.name || "document").trim();
    name = name.replace(/[/\\]+/g, "_").replace(/[^\w.\-() ]+/g, "_").replace(/\s+/g, "_");

    const dot = name.lastIndexOf(".");
    const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 150) || "document";
    let extension = dot > 0 ? name.slice(dot).toLowerCase() : "";

    if (![".pdf", ".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
      extension = MIME_TO_EXTENSION[file.type] || "";
    }

    if (!extension) throw new Error("Unsupported document file type.");
    if (extension === ".jpeg") extension = ".jpg";

    return base + extension;
  }

  function validateFile(file) {
    if (!file) throw new Error("Select a document first.");
    if (file.size <= 0) throw new Error("The selected document is empty.");
    if (file.size > MAX_SIZE) throw new Error("Document exceeds the 10 MB limit.");
    if (!MIME_TO_EXTENSION[file.type]) throw new Error("Only PDF, PNG, JPG/JPEG and WEBP documents are supported.");
  }

  function documentTypeLabel(value) {
    return String(value || "other").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function renderDocuments(documents) {
    const container = byId("projectDocuments");
    if (!container) return;
    const list = Array.isArray(documents) ? documents : [];
    if (!list.length) {
      container.innerHTML = '<div class="detail-empty">No supporting documents registered.</div>';
      return;
    }
    container.innerHTML = list.map(item => `
      <div class="detail-row">
        <strong>${escapeHtml(item.document_name || item.document_type || "Document")}</strong>
        <span>${escapeHtml(documentTypeLabel(item.document_type))}</span>
        <p>Verification: ${escapeHtml(documentTypeLabel(item.verification_status || "pending"))}</p>
        <p>Stored privately; authorized ALBUKHR workflows control access.</p>
      </div>
    `).join("");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  async function loadDocuments() {
    if (!state.applicationId || !state.network || state.loading) return;
    state.loading = true;
    try {
      const { data, error } = await Core.rpc("get_my_external_project_documents", {
        p_application_id: state.applicationId,
        p_pi_uid: getPiUid(),
        p_network: state.network
      });
      if (error) throw error;
      renderDocuments(data || []);
    } catch (error) {
      console.error("External project documents load failed:", error);
      setStatus(error?.message || "Unable to load documents.", "error");
    } finally {
      state.loading = false;
    }
  }

  async function uploadDocument(file, documentType) {
    if (state.uploading) return;
    validateFile(file);
    if (!ALLOWED_TYPES.includes(documentType)) throw new Error("Invalid document type.");
    if (!state.applicationId || !state.network) throw new Error("Document upload context is incomplete.");
    if (!state.editable) throw new Error("Documents can only be changed while the application is a draft or needs revision.");

    state.uploading = true;
    setStatus("Requesting secure upload target...", "loading");

    try {
      const targetResponse = await Core.rpc("create_my_external_project_document_upload_target", {
        p_application_id: state.applicationId,
        p_pi_uid: getPiUid(),
        p_network: state.network,
        p_document_type: documentType,
        p_document_name: file.name
      });

      if (targetResponse.error) throw targetResponse.error;
      const target = targetResponse.data || {};
      const bucket = target.storage_bucket;
      const prefix = target.storage_path_prefix;
      if (bucket !== "external-project-documents" || !prefix) {
        throw new Error("The server did not return a valid secure document upload target.");
      }

      const fileName = Date.now() + "_" + crypto.randomUUID() + "_" + sanitizeFilename(file);
      const path = prefix + fileName;

      setStatus("Uploading document securely...", "loading");

      const upload = await Core.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600"
      });
      if (upload.error) throw upload.error;

      setStatus("Registering uploaded document...", "loading");

      const registerResponse = await Core.rpc("register_my_external_project_document", {
        p_application_id: state.applicationId,
        p_pi_uid: getPiUid(),
        p_network: state.network,
        p_document_type: documentType,
        p_document_name: file.name,
        p_storage_bucket: bucket,
        p_storage_path: path,
        p_document_url: null
      });

      if (registerResponse.error) throw registerResponse.error;
      if (!registerResponse.data) throw new Error("Document registration was not accepted.");

      setStatus("Document uploaded and registered successfully.", "success");
      await loadDocuments();
      window.dispatchEvent(new CustomEvent("albukhr:external-project-document-uploaded", {
        detail: { applicationId: state.applicationId, network: state.network, documentId: registerResponse.data }
      }));

      if (window.ALBukhrExternalProjectDetail?.reload) {
        await window.ALBukhrExternalProjectDetail.reload();
      }
    } catch (error) {
      console.error("External project document upload failed:", error);
      setStatus(error?.message || "Document upload failed.", "error");
    } finally {
      state.uploading = false;
    }
  }

  function bindForm() {
    if (state.bound) return;
    const form = byId("externalProjectDocumentForm");
    if (!form) return;
    state.bound = true;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const input = byId("externalProjectDocumentUpload");
      const type = byId("externalProjectDocumentType");
      const submit = byId("externalProjectDocumentSubmitButton");
      const file = input?.files?.[0] || null;
      try {
        if (submit) { submit.disabled = true; submit.textContent = "Uploading..."; }
        await uploadDocument(file, type?.value || "other");
        if (input) input.value = "";
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = "Upload Document"; }
      }
    });
  }

  function updateUI(status) {
    state.editable = isEditableStatus(status);
    const form = byId("externalProjectDocumentForm");
    const note = byId("externalProjectDocumentReadonlyNote");
    if (form) form.hidden = !state.editable;
    if (note) note.hidden = state.editable;
  }

  function init(context) {
    const current = context || {};
    state.applicationId = current.applicationId || state.applicationId;
    state.network = current.network || state.network;
    updateUI(current.status);
    bindForm();
    loadDocuments();
  }

  window.ALBukhrExternalProjectDocuments = Object.freeze({
    init,
    loadDocuments,
    uploadDocument,
    getState: () => Object.freeze({ ...state })
  });

  window.addEventListener("albukhr:external-project-detail-ready", function (event) {
    init(getContextFromEvent(event));
  });

  if (document.readyState !== "loading") {
    const params = new URLSearchParams(window.location.search);
    const applicationId = params.get("application_id");
    if (applicationId) init({ applicationId, network: Environment?.getNetwork?.(), status: null });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      const params = new URLSearchParams(window.location.search);
      const applicationId = params.get("application_id");
      if (applicationId) bindForm();
    }, { once: true });
  }
})(window, document);
