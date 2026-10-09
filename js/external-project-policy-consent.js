
/* ALBUKHR EXTERNAL PROJECT POLICY CONSENT GATE
 * Mainnet acknowledgment uses the trusted API adapter.
 * Testnet retains the existing acknowledgment RPC
 * until its trusted gateway exists.
 */
(function (window, document) {
  "use strict";

  const state = {
    policy: null,
    network: null,
    initialized: false
  };

  const $ = id => document.getElementById(id);

  const esc = value =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function deps() {
    if (!window.ALBukhrEnvironment) {
      throw new Error("ALBUKHR Environment Core is unavailable.");
    }

    if (!window.ALBUKHR_SUPABASE) {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }

    if (!window.AlbukhrPageAuthGuard) {
      throw new Error("ALBUKHR Page Auth Guard is unavailable.");
    }

    if (!window.ALBukhrExternalProjectApi) {
      throw new Error("ALBUKHR External Project API is unavailable.");
    }

    if (!window.ALBukhrEnvironment.isKnown()) {
      throw new Error("ALBUKHR environment is not recognized.");
    }
  }

  function net() {
    const network = String(
      window.ALBukhrEnvironment.getNetwork() || ""
    ).trim().toLowerCase();

    if (!["mainnet", "testnet"].includes(network)) {
      throw new Error("Invalid ALBUKHR network.");
    }

    return network;
  }

  async function initUser() {
    const user =
      await window.AlbukhrPageAuthGuard.waitForAuth();

    if (!user) {
      throw new Error("Authenticated Pi user is required.");
    }
  }

  async function loadPolicy() {
    const result =
      await window.ALBUKHR_SUPABASE.rpc(
        "get_current_external_project_policy"
      );

    if (result.error) {
      throw result.error;
    }

    if (
      !result.data?.policy_version ||
      !result.data?.guidance_version
    ) {
      throw new Error(
        "Current External Project Policy configuration is unavailable."
      );
    }

    state.policy = result.data;
  }

  function style() {
    if ($("albukhrExternalPolicyConsentStyles")) {
      return;
    }

    const styleElement = document.createElement("style");
    styleElement.id = "albukhrExternalPolicyConsentStyles";

    styleElement.textContent = `
      .external-policy-consent-gate {
        margin: 0 0 24px;
        padding: 22px;
        border: 1px solid rgba(15,122,61,.2);
        border-radius: 18px;
        background: rgba(15,122,61,.04);
      }

      .external-policy-consent-gate h2 {
        margin: 0 0 8px;
      }

      .external-policy-consent-gate p {
        line-height: 1.6;
      }

      .external-policy-consent-docs {
        display: grid;
        gap: 10px;
        margin: 16px 0;
      }

      .external-policy-consent-docs a {
        font-weight: 700;
        text-decoration: none;
      }

      .external-policy-consent-check {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin: 18px 0;
        font-weight: 600;
      }

      .external-policy-consent-check input {
        width: auto;
        margin-top: 4px;
      }

      .external-policy-consent-status {
        min-height: 1.4em;
        margin-top: 10px;
      }

      .external-policy-consent-status.error {
        color: #b42318;
      }

      #externalProjectForm[hidden],
      #externalPolicyConsentGate[hidden] {
        display: none !important;
      }
    `;

    document.head.appendChild(styleElement);
  }

  /*
   * Lock the application form synchronously.
   * This runs before authentication and policy requests.
   */
  function lockForm() {
    const form = $("externalProjectForm");

    if (!form) {
      return;
    }

    form.hidden = true;

    let gate = $("externalPolicyConsentGate");

    if (!gate) {
      gate = document.createElement("section");
      gate.id = "externalPolicyConsentGate";
      gate.className = "external-policy-consent-gate";

      form.parentNode.insertBefore(gate, form);
    }

    gate.hidden = false;

    gate.innerHTML = `
      <div class="eyebrow">
        ALBUKHR EXTERNAL PROJECT GOVERNANCE
      </div>
      <h2>Verifying Policy & Builder Guidance...</h2>
      <p>
        The application form remains locked while ALBUKHR
        verifies your authentication and the current governance
        documents.
      </p>
      <p aria-live="polite">
        Please wait. Do not submit project information yet.
      </p>
    `;
  }

  function render() {
    const form = $("externalProjectForm");

    if (!form) {
      throw new Error(
        "External Project application form is unavailable."
      );
    }

    form.hidden = true;

    let gate = $("externalPolicyConsentGate");

    if (!gate) {
      gate = document.createElement("section");
      gate.id = "externalPolicyConsentGate";
      gate.className = "external-policy-consent-gate";
      form.parentNode.insertBefore(gate, form);
    }

    gate.hidden = false;

    const policy = state.policy;

    gate.innerHTML = `
      <div class="eyebrow">
        ALBUKHR EXTERNAL PROJECT GOVERNANCE
      </div>

      <h2>Policy & Builder Guidance Acknowledgment</h2>

      <p>
        Before creating or continuing an External Project
        application, review the current ALBUKHR External
        Project Policy and Builder Guidance.
      </p>

      <div class="external-policy-consent-docs">
        <a
          href="external-project-policy.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read External Project Policy v${esc(
            policy.policy_version
          )}
        </a>

        <a
          href="external-project-guidance.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read External Project Builder Guidance v${esc(
            policy.guidance_version
          )}
        </a>
      </div>

      <p>
        <strong>Current versions:</strong>
        Policy v${esc(policy.policy_version)}
        • Guidance v${esc(policy.guidance_version)}
        • Network ${esc(state.network.toUpperCase())}
      </p>

      <label class="external-policy-consent-check">
        <input
          id="externalPolicyConsentCheckbox"
          type="checkbox"
        >
        <span>
          I confirm that I have read and understood the
          current ALBUKHR External Project Policy and Builder
          Guidance, have authority to submit the project,
          and agree to comply with the applicable requirements.
        </span>
      </label>

      <button
        id="externalPolicyConsentButton"
        class="primary-action"
        type="button"
        disabled
      >
        Acknowledge & Continue
      </button>

      <div
        id="externalPolicyConsentStatus"
        class="external-policy-consent-status"
        aria-live="polite"
      ></div>
    `;

    const checkbox = $("externalPolicyConsentCheckbox");
    const button = $("externalPolicyConsentButton");
    const message = $("externalPolicyConsentStatus");

    checkbox.addEventListener("change", () => {
      button.disabled = !checkbox.checked;
    });

    button.addEventListener("click", async () => {
      if (!checkbox.checked) {
        return;
      }

      button.disabled = true;
      button.textContent = "Recording acknowledgment...";
      message.className = "external-policy-consent-status";
      message.textContent =
        "Recording your acknowledgment securely...";

      try {
        let acknowledgment;

        if (state.network === "mainnet") {
          acknowledgment =
            await window.ALBukhrExternalProjectApi
              .acknowledgePolicy();
        } else {
          const uid =
            window.AlbukhrPageAuthGuard?.getPiUid?.();

          if (!uid) {
            throw new Error(
              "Authenticated Pi UID is unavailable."
            );
          }

          const result =
            await window.ALBUKHR_SUPABASE.rpc(
              "gateway_record_external_project_policy_acknowledgment",
              {
                p_pi_uid: String(uid).trim(),
                p_network: state.network
              }
            );

          if (result.error) {
            throw result.error;
          }

          acknowledgment = result.data;
        }

        if (!acknowledgment) {
          throw new Error(
            "The policy acknowledgment was not accepted by the server."
          );
        }

        /*
         * Unlock only after the server acknowledgment succeeds.
         */
        form.hidden = false;
        gate.hidden = true;

        window.dispatchEvent(
          new CustomEvent(
            "albukhr:external-project-policy-accepted",
            {
              detail: {
                policyVersion: policy.policy_version,
                guidanceVersion: policy.guidance_version,
                network: state.network,
                acknowledgmentId: acknowledgment
              }
            }
          )
        );
      } catch (error) {
        console.error(
          "[ALBUKHR EXTERNAL POLICY ACKNOWLEDGMENT]",
          error
        );

        message.className =
          "external-policy-consent-status error";

        message.textContent =
          error?.message ||
          "Unable to record the policy acknowledgment.";

        button.disabled = false;
        button.textContent = "Acknowledge & Continue";
      }
    });
  }

  async function initialize() {
    if (state.initialized) {
      return;
    }

    state.initialized = true;

    try {
      deps();
      state.network = net();

      await initUser();
      await loadPolicy();

      render();
    } catch (error) {
      console.error(
        "[ALBUKHR EXTERNAL POLICY CONSENT]",
        error
      );

      const form = $("externalProjectForm");

      if (form) {
        form.hidden = true;
      }

      let gate = $("externalPolicyConsentGate");

      if (!gate && form?.parentNode) {
        gate = document.createElement("section");
        gate.id = "externalPolicyConsentGate";
        gate.className = "external-policy-consent-gate";
        form.parentNode.insertBefore(gate, form);
      }

      if (gate) {
        gate.hidden = false;

        gate.innerHTML = `
          <h2>Policy acknowledgment unavailable</h2>

          <p>
            The External Project application cannot continue
            until the current ALBUKHR Policy and Builder
            Guidance can be verified.
          </p>

          <p
            class="external-policy-consent-status error"
            aria-live="polite"
          >
            ${esc(error?.message || "Unknown error")}
          </p>
        `;
      }
    }
  }

  /*
   * Lock immediately, before asynchronous checks begin.
   */
  try {
    style();
    lockForm();
  } catch (error) {
    console.error(
      "[ALBUKHR EXTERNAL POLICY INITIAL LOCK]",
      error
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

  window.ALBukhrExternalProjectPolicyConsent =
    Object.freeze({
      getState: () => Object.freeze({ ...state })
    });

})(window, document);
