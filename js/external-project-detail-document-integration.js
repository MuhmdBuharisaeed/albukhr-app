/* ALBUKHR EXTERNAL PROJECT DOCUMENT INTEGRATION
 * Mainnet applicant operations use the trusted API adapter.
 * Private storage upload remains direct only after the trusted gateway returns
 * an application-scoped upload target.
 * Testnet retains its existing applicant RPC path until its trusted gateway
 * is provisioned.
 *
 * Security/UX guarantees:
 * - The page never trusts browser-supplied ownership for Mainnet.
 * - Stale/background document loads cannot overwrite a successful upload.
 * - Delete is exposed only for owner-created pending documents on editable
 *   Mainnet applications.
 * - Submitted/approved/reviewed applications cannot mutate documents.
 */
(function (window, document) {
  "use strict";

  const Core = window.ALBUKHR_SUPABASE;
  const state = {
    applicationId: null,
    network: null,
    loading: false,
    uploading: false,
    deleting: false,
    bound: false,
    editable: false,
    documents: []
  };

  let loadSequence = 0;

  const TYPES = Object.freeze([
    "business_registration",
    "project_proposal",
    "business_plan",
    "financial_statement",
    "identity_document",
    "ownership_document",
    "other"
  ]);

  const MIME = Object.freeze({
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp"
  });

  const MAX = 10 * 1024 * 1024;
  const $ = (id) => document.getElementById(id);

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function uid() {
    const value = window.AlbukhrPageAuthGuard?.getPiUid?.();
    if (!value) throw new Error("Authenticated Pi UID is unavailable.");
    return String(value).trim();
  }

  function status(message, type) {
    const element = $("externalProjectDocumentStatus");
    if (!element) return;
    element.textContent = String(message || "");
    element.className = "form-status" + (type ? " " + type : "");
  }

  function norm(value) {
    return String(value || "draft")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function isEditable(value) {
    return ["draft", "needs_revision"].includes(norm(value));
  }

  function params(extra) {
    return Object.assign(
      {
        p_application_id: state.applicationId,
        p_pi_uid: uid(),
        p_network: state.network
      },
      extra || {}
    );
  }

  async function rpc(name, payload) {
    if (!Core?.rpc) throw new Error("ALBUKHR Supabase Core is unavailable.");
    const result = await Core.rpc(name, payload);
    if (result.error) throw result.error;
    return result.data;
  }

  function cleanFileName(file) {
    let name = String(file?.name || "document")
      .trim()
      .replace(/[\\/]+/g, "_")
      .replace(/[^\w.\-() ]+/g, "_")
      .replace(/\s+/g, "_");

    const dot = name.lastIndexOf(".");
    const base =
      (dot > 0 ? name.slice(0, dot) : name)
        .replace(/[^A-Za-z0-9_-]+/g, "_")
        .slice(0, 150) || "document";

    let extension =
      dot > 0 ? name.slice(dot).toLowerCase() : (MIME[file.type] || "");
    if (extension === ".jpeg") extension = ".jpg";

    if (![".pdf", ".png", ".jpg", ".webp"].includes(extension)) {
      throw new Error("Unsupported document file type.");
    }

    return base + extension;
  }

  function validate(file) {
    if (!file) throw new Error("Select a document first.");
    if (file.size <= 0) throw new Error("The selected document is empty.");
    if (file.size > MAX) throw new Error("Document exceeds the 10 MB limit.");
    if (!MIME[file.type]) {
      throw new Error("Only PDF, PNG, JPG/JPEG and WEBP documents are supported.");
    }
  }

  function canDeleteDocument(documentItem) {
    return (
      state.network === "mainnet" &&
      state.editable &&
      norm(documentItem?.verification_status) === "pending" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(documentItem?.id || "")
      )
    );
  }

  function render(list) {
    const container = $("projectDocuments");
    if (!container) return;

    const documents = Array.isArray(list) ? list : [];
    state.documents = documents;

    if (!documents.length) {
      container.innerHTML =
        '<div class="detail-empty">No supporting documents registered.</div>';
      return;
    }

    container.innerHTML = documents
      .map((item) => {
        const documentName =
          item.document_name || item.document_type || "Document";
        const documentType = String(item.document_type || "other").replace(
          /_/g,
          " "
        );
        const verification = String(
          item.verification_status || "pending"
        ).replace(/_/g, " ");

        const deleteButton = canDeleteDocument(item)
          ? '<button type="button" class="ghost-action document-delete-button" data-document-id="' +
            esc(item.id) +
            '" aria-label="Delete ' +
            esc(documentName) +
            '">Delete</button>'
          : "";

        return (
          '<div class="detail-row document-row" data-document-id="' +
          esc(item.id) +
          '">' +
          "<strong>" +
          esc(documentName) +
          "</strong>" +
          "<span>" +
          esc(documentType) +
          "</span>" +
          "<p>Verification: " +
          esc(verification) +
          "</p>" +
          "<p>Stored privately; authorized ALBUKHR workflows control access.</p>" +
          (deleteButton
            ? '<div class="document-uploader-actions">' +
              deleteButton +
              "</div>"
            : "") +
          "</div>"
        );
      })
      .join("");
  }

  async function loadDocuments(options) {
    const settings =
      options && typeof options === "object" ? options : {};
    const showError = Boolean(settings.showError);
    const sequence = ++loadSequence;

    if (!state.applicationId || !state.network) return false;

    state.loading = true;

    try {
      const data =
        state.network === "mainnet"
          ? await window.ALBukhrExternalProjectApi.getDocuments(
              state.applicationId
            )
          : await rpc(
              "get_my_external_project_documents",
              params()
            );

      if (sequence !== loadSequence) return false;

      render(data || []);
      return true;
    } catch (error) {
      if (sequence !== loadSequence) return false;

      console.warn(
        "[ALBUKHR EXTERNAL PROJECT DOCUMENTS] Load failed:",
        error
      );

      if (showError) {
        status(
          error?.message || "Unable to load supporting documents.",
          "error"
        );
      }

      return false;
    } finally {
      if (sequence === loadSequence) state.loading = false;
    }
  }

  async function uploadDocument(file, type) {
    if (state.uploading) return;

    validate(file);

    if (!TYPES.includes(type)) {
      throw new Error("Invalid document type.");
    }

    if (!state.editable) {
      throw new Error(
        "Documents can only be changed while the application is a draft or needs revision."
      );
    }

    state.uploading = true;

    try {
      let target =
        state.network === "mainnet"
          ? await window.ALBukhrExternalProjectApi.createDocumentUploadTarget(
              state.applicationId,
              type,
              file.name
            )
          : await rpc(
              "create_my_external_project_document_upload_target",
              params({
                p_document_type: type,
                p_document_name: file.name
              })
            );

      target = target || {};

      const bucket = target.storage_bucket;
      const prefix = target.storage_path_prefix;

      if (
        bucket !== "external-project-documents" ||
        !prefix ||
        !String(prefix).startsWith(state.network + "/")
      ) {
        throw new Error(
          "The server did not return a valid secure document upload target."
        );
      }

      const path =
        prefix +
        Date.now() +
        "_" +
        crypto.randomUUID() +
        "_" +
        cleanFileName(file);

      status("Uploading document securely.", "loading");

      const uploadResult = await Core.storage
        .from(bucket)
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: "3600"
        });

      if (uploadResult.error) throw uploadResult.error;

      status("Registering uploaded document.", "loading");

      const payload = {
        p_document_type: type,
        p_document_name: file.name,
        p_storage_bucket: bucket,
        p_storage_path: path,
        p_document_url: null
      };

      const result =
        state.network === "mainnet"
          ? await window.ALBukhrExternalProjectApi.registerDocument(
              state.applicationId,
              payload
            )
          : await rpc(
              "register_my_external_project_document",
              params(payload)
            );

      if (!result) {
        throw new Error("Document registration was not accepted.");
      }

      const documentId =
        typeof result === "string"
          ? result
          : Array.isArray(result)
            ? result[0]
            : result;

      // Registration succeeded, so render the authoritative registration
      // immediately. A stale/transient list-read failure must not erase the
      // successful upload state from the UI. The next successful read replaces
      // this optimistic entry with the full server representation.
      if (documentId) {
        render([
          {
            id: documentId,
            document_type: type,
            document_name: file.name,
            storage_bucket: bucket,
            storage_path: path,
            document_url: null,
            verification_status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          ...state.documents.filter(
            (item) => String(item?.id || "") !== String(documentId)
          )
        ]);
      }

      status("Document uploaded and registered successfully.", "success");

      await loadDocuments({ showError: false });

      window.dispatchEvent(
        new CustomEvent("albukhr:external-project-document-uploaded", {
          detail: {
            applicationId: state.applicationId,
            network: state.network,
            documentId
          }
        })
      );

      await window.ALBukhrExternalProjectDetail?.reload?.();
    } catch (error) {
      console.error(
        "[ALBUKHR EXTERNAL PROJECT DOCUMENTS] Upload failed:",
        error
      );
      status(error?.message || "Document upload failed.", "error");
    } finally {
      state.uploading = false;
    }
  }

  async function deleteDocument(documentId) {
    if (state.deleting) return;

    if (state.network !== "mainnet") {
      throw new Error(
        "Secure document deletion is currently available on MAINNET only."
      );
    }

    if (!state.editable) {
      throw new Error(
        "Documents can only be deleted while the application is a draft or needs revision."
      );
    }

    const normalizedId = String(documentId || "").trim();
    const item = state.documents.find(
      (documentItem) => String(documentItem?.id || "") === normalizedId
    );

    if (!item || !canDeleteDocument(item)) {
      throw new Error(
        "This document can no longer be deleted through the applicant workflow."
      );
    }

    if (
      !window.confirm(
        'Delete "' +
          String(item.document_name || "this document") +
          '" from this application?'
      )
    ) {
      return;
    }

    state.deleting = true;

    const button = Array.from(
      document.querySelectorAll(".document-delete-button")
    ).find((element) => element.dataset.documentId === normalizedId);

    if (button) {
      button.disabled = true;
      button.textContent = "Deleting...";
    }

    try {
      const result =
        await window.ALBukhrExternalProjectApi.deleteDocument(
          state.applicationId,
          normalizedId
        );

      if (!result) {
        throw new Error("Document deletion was not accepted.");
      }

      status("Document deleted successfully.", "success");
      await loadDocuments({ showError: false });
      await window.ALBukhrExternalProjectDetail?.reload?.();
    } catch (error) {
      console.error(
        "[ALBUKHR EXTERNAL PROJECT DOCUMENTS] Delete failed:",
        error
      );
      status(error?.message || "Document deletion failed.", "error");

      if (button) {
        button.disabled = false;
        button.textContent = "Delete";
      }
    } finally {
      state.deleting = false;
    }
  }

  function bind() {
    if (state.bound) return;

    const form = $("externalProjectDocumentForm");

    if (form) {
      state.bound = true;

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const input = $("externalProjectDocumentUpload");
        const type = $("externalProjectDocumentType");
        const button = $("externalProjectDocumentSubmitButton");

        try {
          if (button) {
            button.disabled = true;
            button.textContent = "Uploading...";
          }

          await uploadDocument(
            input?.files?.[0] || null,
            type?.value || "other"
          );

          if (input) input.value = "";
        } finally {
          if (button) {
            button.disabled = false;
            button.textContent = "Upload Document";
          }
        }
      });
    }

    const documentsContainer = $("projectDocuments");

    if (documentsContainer) {
      documentsContainer.addEventListener("click", (event) => {
        const button = event.target.closest(".document-delete-button");
        if (!button) return;

        deleteDocument(button.dataset.documentId).catch((error) => {
          console.error(
            "[ALBUKHR EXTERNAL PROJECT DOCUMENTS] Delete handler failed:",
            error
          );
          status(
            error?.message || "Document deletion failed.",
            "error"
          );
        });
      });
    }
  }

  function init(context) {
    const application = context?.application || {};

    state.applicationId =
      context?.applicationId ||
      application.id ||
      state.applicationId;

    state.network =
      context?.network ||
      application.network ||
      state.network;

    state.editable = isEditable(
      application.status ?? context?.status ?? "draft"
    );

    const form = $("externalProjectDocumentForm");
    const readonlyNote = $("externalProjectDocumentReadonlyNote");

    if (form) form.hidden = !state.editable;
    if (readonlyNote) readonlyNote.hidden = state.editable;

    bind();
    loadDocuments({ showError: false });
  }

  window.ALBukhrExternalProjectDocuments = Object.freeze({
    init,
    loadDocuments,
    uploadDocument,
    deleteDocument,
    getState: () => Object.freeze({ ...state })
  });

  window.addEventListener(
    "albukhr:external-project-detail-ready",
    (event) => init(event.detail || {})
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})(window, document);
