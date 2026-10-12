const META_PIXEL_ID = "39611301161817267";
const MARKETING_CONSENT_KEY = "cozy_marketing_consent";

type MetaPixelFunction = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: MetaPixelFunction;
  loaded: boolean;
  version: string;
};
declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
  }
}

export const getMarketingConsent = () => {
  try {
    return window.localStorage.getItem(MARKETING_CONSENT_KEY);
  } catch {
    return null;
  }
};
export const setMarketingConsent = (allowed: boolean) => {
  try {
    window.localStorage.setItem(
      MARKETING_CONSENT_KEY,
      allowed ? "granted" : "denied",
    );
  } catch {
    // The choice still applies for the current page if storage is unavailable.
  }
};

export const loadMetaPixel = () => {
  if (getMarketingConsent() !== "granted") return;
  if (window.fbq) return;

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue.push(args);
    }
  } as MetaPixelFunction;

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.dataset.metaPixel = META_PIXEL_ID;
  document.head.appendChild(script);

  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");
};

export const trackMetaEvent = (
  eventName: "Lead" | "InitiateCheckout" | "Purchase",
  parameters: Record<string, unknown> = {},
  eventId?: string,
) => {
  if (getMarketingConsent() !== "granted") return;
  loadMetaPixel();
  if (eventId) {
    window.fbq?.("track", eventName, parameters, { eventID: eventId });
  } else {
    window.fbq?.("track", eventName, parameters);
  }
};
