/* ALBUKHR External Project API Adapter v1
 *
 * Production caller contract for External Project pages.
 *
 * Security:
 * - Never sends p_pi_uid from the browser.
 * - Never sends p_network as an authority field.
 * - Mainnet identity/network are established by ALBUKHR API Core + gateway.
 * - Testnet is deliberately rejected until a trusted Testnet External Project
 *   gateway and schema are provisioned.
 */
(function (window) {
  "use strict";

  if (window.ALBukhrExternalProjectApi) return;

  function requireApi() {
    const api = window.AlbukhrApi;
    if (!api || typeof api.request !== "function") {
      throw new Error("ALBUKHR API Core is unavailable.");
    }
    return api;
  }

  function requireMainnet() {
    const env = window.ALBukhrEnvironment;
    if (!env || typeof env.isKnown !== "function") {
      throw new Error("ALBUKHR Environment Core is unavailable.");
    }

    if (!env.isKnown()) {
      throw new Error("ALBUKHR environment is not recognized.");
    }

    const network = String(env.getNetwork() || "").trim().toLowerCase();
    if (network !== "mainnet") {
      throw new Error(
        "External Project secure API is currently available on MAINNET only."
      );
    }

    return network;
  }

  function id(value, field) {
    const normalized = String(value || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
      throw new Error((field || "Application ID") + " is invalid.");
    }
    return normalized;
  }

  function withoutAuthorityFields(value) {
    const input = value && typeof value === "object" ? value : {};
    const output = { ...input };
    delete output.p_pi_uid;
    delete output.p_network;
    return output;
  }

  function uploadMime(file) {
    const type = String(file?.type || "").trim().toLowerCase();

    if (type === "image/png" || type === "image/jpeg") {
      return type;
    }

    const name = String(file?.name || "").trim().toLowerCase();

    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
      return "image/jpeg";
    }

    throw new Error("Project logo must be PNG or JPG/JPEG.");
  }

  const Api = Object.freeze({
    async listApplications() {
      requireMainnet();
      return requireApi().get("/api/external-project/applications");
    },

    async createApplication(payload) {
      requireMainnet();
      return requireApi().post(
        "/api/external-project",
        withoutAuthorityFields(payload)
      );
    },

    async getApplication(applicationId) {
      requireMainnet();
      return requireApi().get(
        "/api/external-project/" + encodeURIComponent(id(applicationId))
      );
    },

    async updateApplication(applicationId, payload) {
      requireMainnet();
      return requireApi().patch(
        "/api/external-project/" + encodeURIComponent(id(applicationId)),
        withoutAuthorityFields(payload)
      );
    },

    async submitApplication(applicationId) {
      requireMainnet();
      return requireApi().post(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/submit",
        {}
      );
    },

    async getLogo(applicationId) {
      requireMainnet();
      return requireApi().get(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/logo"
      );
    },

    async uploadLogo(applicationId, file) {
      requireMainnet();

      if (!file) {
        throw new Error("Project logo file is required.");
      }

      return requireApi().request(
        "/api/external-project/" +
          encodeURIComponent(id(applicationId)) +
          "/logo",
        {
          method: "POST",
          headers: {
            "Content-Type": uploadMime(file)
          },
          body: file
        }
      );
    },

    async getTeam(applicationId) {
      requireMainnet();
      return requireApi().get(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/team"
      );
    },

    async replaceTeam(applicationId, team) {
      requireMainnet();
      return requireApi().put(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/team",
        { p_team: team }
      );
    },

    async getDocuments(applicationId) {
      requireMainnet();
      return requireApi().get(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/documents"
      );
    },

    async createDocumentUploadTarget(applicationId, documentType, documentName) {
      requireMainnet();
      return requireApi().post(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/documents/upload-target",
        {
          p_document_type: documentType,
          p_document_name: documentName
        }
      );
    },

    async registerDocument(applicationId, payload) {
      requireMainnet();
      return requireApi().post(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/documents",
        withoutAuthorityFields(payload)
      );
    },

    async deleteDocument(applicationId, documentId) {
      requireMainnet();
      return requireApi().delete(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/documents/" + encodeURIComponent(id(documentId, "Document ID"))
      );
    },

    async getReviews(applicationId) {
      requireMainnet();
      return requireApi().get(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/reviews"
      );
    },

    async getReviewHistory(applicationId) {
      requireMainnet();
      return requireApi().get(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/review-history"
      );
    },

    async getAuditLog(applicationId) {
      requireMainnet();
      return requireApi().get(
        "/api/external-project/" + encodeURIComponent(id(applicationId)) + "/audit-log"
      );
    },

    async acknowledgePolicy() {
      requireMainnet();
      return requireApi().post("/api/external-project/policy/acknowledgment", {});
    }
  });

  window.ALBukhrExternalProjectApi = Api;
})(window);
