/**
 * Shop fingerprint bridge for DigitalPersona (HID U.are.U 4500).
 *
 * Requirements on each shop PC:
 * 1. USB DigitalPersona 4500 (or compatible HID reader)
 * 2. Free "HID Authentication Device Client":
 *    https://digitalpersona.hidglobal.com/lite-client/
 *
 * Exposes window.BiometricBridge used by InvoiceContactBlock + FingerprintLookup.
 * Live capture needs the device + client; without them use VITE_BIOMETRIC_MOCK=1 for UI testing.
 */

// Served from /public (package "exports" block deep ?url imports in Vite)
const WEBSDK_URL = "/vendor/digitalpersona/websdk.client.ui.min.js";
const FINGERPRINT_URL = "/vendor/digitalpersona/fingerprint.sdk.min.js";

const VENDOR = "digitalpersona";
const LITE_CLIENT_URL = "https://digitalpersona.hidglobal.com/lite-client/";
const CAPTURE_TIMEOUT_MS = 45000;
const MOCK_ENABLED = String(import.meta.env.VITE_BIOMETRIC_MOCK || "") === "1";

const loadedScripts = new Set();

function loadScript(src) {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-dp-src="${src}"]`);
    if (existing) {
      loadedScripts.add(src);
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.dpSrc = src;
    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load biometric SDK script: ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureSdk() {
  if (typeof window === "undefined") {
    throw new Error("Biometric SDK only runs in the browser.");
  }
  if (!window.WebSdk) {
    await loadScript(WEBSDK_URL);
  }
  if (!window.Fingerprint?.WebApi) {
    await loadScript(FINGERPRINT_URL);
  }
  if (!window.Fingerprint?.WebApi) {
    throw new Error("DigitalPersona Fingerprint API failed to load.");
  }
}

function clientMissingError() {
  const err = new Error(
    `Cannot reach the fingerprint device. Install HID Authentication Device Client (${LITE_CLIENT_URL}), plug in the DigitalPersona reader, then retry.`
  );
  err.code = "CLIENT_OR_DEVICE_MISSING";
  return err;
}

function captureMockTemplate() {
  // Stable mock so enroll → lookup exact-match works in UI tests without hardware.
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `mock-${Date.now()}`;
  // If a previous mock enroll id was stored for "reuse", prefer a fixed key for demo lookup.
  const fixed = sessionStorage.getItem("dp_mock_fp_template");
  if (fixed) return fixed;
  const template = `DP-MOCK-TEMPLATE:${id}`;
  sessionStorage.setItem("dp_mock_fp_template", template);
  return template;
}

/**
 * Capture one Intermediate fingerprint sample and return an opaque template string.
 */
async function captureTemplateFromDevice() {
  await ensureSdk();

  const { WebApi, SampleFormat } = window.Fingerprint;
  const api = new WebApi();

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;

    const cleanup = async () => {
      try {
        await api.stopAcquisition();
      } catch {
        /* ignore */
      }
      api.off();
      if (timer) clearTimeout(timer);
    };

    const fail = async (err) => {
      if (settled) return;
      settled = true;
      await cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    const succeed = async (template) => {
      if (settled) return;
      settled = true;
      await cleanup();
      resolve(template);
    };

    api.on("CommunicationFailed", () => fail(clientMissingError()));
    api.on("ErrorOccurred", (ev) =>
      fail(new Error(`Fingerprint reader error (${ev?.error ?? "unknown"}). Try again.`))
    );
    api.on("SamplesAcquired", (ev) => {
      const raw = ev?.samples;
      if (!raw) {
        fail(new Error("No fingerprint sample received. Place finger firmly and retry."));
        return;
      }
      // Opaque blob for our DB; vendor-specific. Matching engine can refine later.
      const template =
        typeof raw === "string" ? raw : JSON.stringify(raw);
      succeed(`DP:${VENDOR}:${template}`);
    });

    timer = setTimeout(() => {
      fail(
        new Error(
          "Fingerprint capture timed out. Place finger on the reader and keep it steady."
        )
      );
    }, CAPTURE_TIMEOUT_MS);

    api
      .startAcquisition(SampleFormat.Intermediate)
      .catch((err) => {
        const msg = String(err?.message || err || "");
        if (/communication|connect/i.test(msg)) fail(clientMissingError());
        else fail(err);
      });
  });
}

const BiometricBridge = {
  vendor: VENDOR,
  liteClientUrl: LITE_CLIENT_URL,
  mockEnabled: MOCK_ENABLED,

  /**
   * @returns {Promise<string>} opaque template_data for enroll / identify APIs
   */
  async captureTemplate() {
    if (MOCK_ENABLED) {
      console.warn("[BiometricBridge] VITE_BIOMETRIC_MOCK=1 — using mock template (no device).");
      return captureMockTemplate();
    }
    return captureTemplateFromDevice();
  },

  /** Reset mock template (dev only) so next enroll creates a new identity. */
  resetMockTemplate() {
    sessionStorage.removeItem("dp_mock_fp_template");
  },
};

if (typeof window !== "undefined") {
  window.BiometricBridge = BiometricBridge;
}

export default BiometricBridge;
