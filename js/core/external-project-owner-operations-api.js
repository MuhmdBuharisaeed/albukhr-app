/* ALBUKHR External Project Owner Operations API Adapter v2
 *
 * Mainnet-only adapter for the trusted External Project Owner Operations API.
 * It is deliberately separate from ALBukhrExternalProjectApi and from the
 * existing External Project Funding Plan workflow.
 *
 * Security boundaries:
 * - No client-supplied Pi UID, user ID, owner ID or network authority fields.
 * - Pi token is attached by the existing ALBUKHR API Core.
 * - All persistent reads/writes go through the trusted API gateway.
 * - No localStorage/sessionStorage use.
 * - Liquidity settlement is server verified; browser metadata is not proof.
 * - Withdrawals remain locked. This adapter does not execute A2U payouts.
 */
(function (window) {
  "use strict";

  if (window.ALBukhrExternalProjectOwnerOperationsApi) return;

  const API_PREFIX = "/api/external-project-owner-operations";
  const MAINNET = "mainnet";
  const LIQUIDITY_ACTION = "external_add_liquidity";
  const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function requireApi() {
    const api = window.AlbukhrApi;
    if (!api || typeof api.request !== "function" ||
        typeof api.get !== "function" || typeof api.post !== "function") {
      throw new Error("ALBUKHR API Core is unavailable.");
    }
    return api;
  }

  function requireMainnet() {
    const environment = window.ALBukhrEnvironment;
    if (!environment || typeof environment.getNetwork !== "function" ||
        typeof environment.isKnown !== "function" || !environment.isKnown()) {
      throw new Error("ALBUKHR environment is unavailable or unknown.");
    }
    if (clean(environment.getNetwork()).toLowerCase() !== MAINNET) {
      throw new Error("External Project Owner Operations is available on MAINNET only.");
    }

    const auth = window.AlbukhrPiAuth;
    if (!auth || typeof auth.getNetwork !== "function" ||
        clean(auth.getNetwork()).toLowerCase() !== MAINNET) {
      throw new Error("A verified Mainnet Pi session is required.");
    }
    return MAINNET;
  }

  async function requireOwnerPiAuth() {
    requireMainnet();
    const auth = window.AlbukhrPiAuth;
    if (!auth || typeof auth.ensurePiAuth !== "function") {
      throw new Error("ALBUKHR Pi Auth Core is unavailable.");
    }
    const user = await auth.ensurePiAuth();
    if (!user || !clean(user.pi_uid)) {
      throw new Error("Verified Pi authentication is required.");
    }
    if (clean(user.network).toLowerCase() !== MAINNET) {
      throw new Error("The authenticated session is not Mainnet.");
    }
    return user;
  }

  function requireUuid(value, label) {
    const id = clean(value);
    if (!UUID_PATTERN.test(id)) {
      throw new Error((label || "ID") + " is invalid.");
    }
    return id;
  }

  function applicationPath(applicationId, suffix) {
    const id = encodeURIComponent(requireUuid(applicationId, "Application ID"));
    return API_PREFIX + "/" + id + (suffix || "");
  }

  function makeRequestId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    throw new Error("Secure request ID generation is unavailable in this browser.");
  }

  function positivePiAmount(value) {
    const text = clean(value);
    if (!/^\d{1,18}(?:\.\d{1,9})?$/.test(text)) {
      throw new Error("Enter a positive Pi amount with up to 9 decimal places.");
    }
    const amount = Number(text);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
      throw new Error("Liquidity amount is outside the allowed range.");
    }
    return amount;
  }

  function evidenceMimeType(file) {
    const mime = clean(file && file.type).toLowerCase();
    if (["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mime)) {
      return mime;
    }
    const name = clean(file && file.name).toLowerCase();
    if (name.endsWith(".pdf")) return "application/pdf";
    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
    if (name.endsWith(".webp")) return "image/webp";
    throw new Error("Evidence must be PDF, PNG, JPG/JPEG or WEBP.");
  }

  async function uploadEvidence(applicationId, updateId, file) {
    requireMainnet();
    await requireOwnerPiAuth();
    requireUuid(updateId, "Update ID");
    if (!file || typeof file.size !== "number" || file.size <= 0) {
      throw new Error("Choose a non-empty evidence file.");
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      throw new Error("Evidence file must not exceed 10 MB.");
    }

    const mimeType = evidenceMimeType(file);
    const rawName = clean(file.name).split(/[\\/]/).pop() || "evidence";
    const safeHeaderName = rawName
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/[\r\n"\\;]/g, "_")
      .slice(0, 120) || "evidence";
    const headers = {
      "Content-Type": mimeType,
      "X-File-Name": safeHeaderName
    };

    return requireApi().request(
      applicationPath(applicationId, "/updates/" + encodeURIComponent(updateId) + "/evidence"),
      {
        method: "POST",
        headers,
        body: file
      }
    );
  }

  const Api = Object.freeze({
    async getWorkspace(applicationId) {
      requireMainnet();
      await requireOwnerPiAuth();
      return requireApi().get(applicationPath(applicationId, "/workspace"));
    },

    async createLiquidityIntent(applicationId, amount, requestId) {
      requireMainnet();
      await requireOwnerPiAuth();
      const normalizedAmount = positivePiAmount(amount);
      const id = requestId ? requireUuid(requestId, "Request ID") : makeRequestId();
      const result = await requireApi().post(
        applicationPath(applicationId, "/liquidity/intents"),
        {
          amount: normalizedAmount,
          request_id: id
        }
      );
      return Object.freeze({
        request_id: id,
        amount: normalizedAmount,
        intent: result
      });
    },

    async approveLiquidity(applicationId, requestId, paymentId) {
      requireMainnet();
      await requireOwnerPiAuth();
      return requireApi().post(
        applicationPath(applicationId, "/liquidity/approve"),
        {
          request_id: requireUuid(requestId, "Request ID"),
          payment_id: clean(paymentId)
        }
      );
    },

    async completeLiquidity(applicationId, paymentId, txid) {
      requireMainnet();
      await requireOwnerPiAuth();
      return requireApi().post(
        applicationPath(applicationId, "/liquidity/complete"),
        {
          payment_id: clean(paymentId),
          txid: clean(txid)
        }
      );
    },

    async cancelLiquidityIntent(applicationId, requestId, paymentId) {
      requireMainnet();
      await requireOwnerPiAuth();
      return requireApi().post(
        applicationPath(applicationId, "/liquidity/cancel"),
        {
          request_id: requireUuid(requestId, "Request ID"),
          payment_id: clean(paymentId)
        }
      );
    },

    /*
     * Runs the Pi SDK U2A lifecycle. Pi Developer App's configured Mainnet
     * receiving wallet is fixed by the App configuration; it cannot be
     * dynamically selected by createPayment(). The server checks that address
     * against the approved custody wallet and the returned Pi PaymentDTO.
     */
    async startPiLiquidityPayment(options) {
      requireMainnet();
      const input = options && typeof options === "object" ? options : {};
      const applicationId = requireUuid(input.applicationId, "Application ID");
      const amount = positivePiAmount(input.amount);
      const projectCode = clean(input.projectCode).toUpperCase();
      if (!projectCode) throw new Error("Project code is required.");
      await requireOwnerPiAuth();

      if (!window.Pi || typeof window.Pi.createPayment !== "function") {
        throw new Error("Pi SDK payment API is unavailable. Open ALBUKHR in Pi Browser.");
      }

      const created = await Api.createLiquidityIntent(
        applicationId,
        amount,
        input.requestId
      );
      const requestId = created.request_id;
      const memo = clean(input.memo) || ("ALBUKHR External Project liquidity — " + projectCode);
      const metadata = Object.freeze({
        network: MAINNET,
        action: LIQUIDITY_ACTION,
        application_id: applicationId,
        project_code: projectCode,
        request_id: requestId
      });

      return new Promise((resolve, reject) => {
        let settled = false;
        let paymentId = "";

        const finish = (handler, value) => {
          if (settled) return;
          settled = true;
          handler(value);
        };

        const handleCancel = async () => {
          if (!paymentId) {
            // No Pi payment identifier means the backend cannot prove
            // cancellation. Keep the intent pending for trusted reconciliation.
            finish(reject, new Error("Pi cancellation could not be verified. The liquidity intent remains pending for ALBUKHR operations review."));
            return;
          }
          try {
            await Api.cancelLiquidityIntent(applicationId, requestId, paymentId);
            finish(reject, new Error("Pi liquidity payment was cancelled."));
          } catch (error) {
            finish(reject, error);
          }
        };

        try {
          window.Pi.createPayment(
            {
              amount,
              memo,
              metadata
            },
            {
              onReadyForServerApproval: async (id) => {
                paymentId = clean(id);
                if (!paymentId) {
                  finish(reject, new Error("Pi SDK did not return a payment ID. The liquidity intent remains pending for trusted reconciliation."));
                  return;
                }
                try {
                  await Api.approveLiquidity(applicationId, requestId, paymentId);
                } catch (error) {
                  finish(reject, error);
                  // Propagate the rejection to Pi SDK so it does not treat a
                  // failed server approval callback as a successful approval.
                  throw error;
                }
              },

              onReadyForServerCompletion: async (id, txid) => {
                paymentId = clean(id || paymentId);
                try {
                  const result = await Api.completeLiquidity(applicationId, paymentId, txid);
                  finish(resolve, result);
                } catch (error) {
                  finish(reject, error);
                  // Pi SDK must see that ALBUKHR did not confirm settlement.
                  throw error;
                }
              },

              onCancel: () => {
                void handleCancel();
              },

              onError: (error) => {
                const message = clean(error && error.message) || "Pi liquidity payment failed.";
                finish(reject, new Error(message + " The pending intent has not been released; ALBUKHR operations must reconcile it."));
              }
            }
          );
        } catch (error) {
          finish(reject, error);
        }
      });
    },

    async saveUpdate(applicationId, payload) {
      requireMainnet();
      await requireOwnerPiAuth();
      const input = payload && typeof payload === "object" ? payload : {};
      const body = {
        title: clean(input.title),
        summary: clean(input.summary),
        body: clean(input.body),
        update_type: clean(input.update_type) || "progress",
        submit: input.submit === true
      };
      if (input.update_id) body.update_id = requireUuid(input.update_id, "Update ID");
      return requireApi().post(applicationPath(applicationId, "/updates"), body);
    },

    async uploadEvidence(applicationId, updateId, file) {
      return uploadEvidence(applicationId, updateId, file);
    },

    async getEvidenceDownload(applicationId, updateId, evidenceId) {
      requireMainnet();
      await requireOwnerPiAuth();
      const update = encodeURIComponent(requireUuid(updateId, "Update ID"));
      const evidence = encodeURIComponent(requireUuid(evidenceId, "Evidence ID"));
      return requireApi().get(
        applicationPath(applicationId, "/updates/" + update + "/evidence/" + evidence)
      );
    },

    async requestWithdrawal(applicationId, payload) {
      requireMainnet();
      await requireOwnerPiAuth();
      // The trusted backend deliberately responds 423 until the AAL2 and
      // admin-approved withdrawal reservation workflow is implemented.
      return requireApi().post(
        applicationPath(applicationId, "/withdrawals"),
        payload && typeof payload === "object" ? payload : {}
      );
    }
  });

  window.ALBukhrExternalProjectOwnerOperationsApi = Api;
})(window);
