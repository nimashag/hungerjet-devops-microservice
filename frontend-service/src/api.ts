// Dynamically determine API base URL based on current hostname.
// Local development can still use explicit gateway/env settings, while non-local
// deployments use same-origin so HTTPS works cleanly behind a load balancer.
function getApiBaseUrl(): string {
  const { hostname, origin } = globalThis.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    if (import.meta.env.VITE_API_BASE) {
      console.log(
        "[FrontendAPI] Local dev mode, using VITE_API_BASE:",
        import.meta.env.VITE_API_BASE,
      );
      return import.meta.env.VITE_API_BASE;
    }

    console.log(
      "[FrontendAPI] Local dev mode, no VITE_API_BASE, using nginx gateway",
    );
    return "http://localhost:31000";
  }

  console.log(
    "[FrontendAPI] Remote deployment, using same-origin API base:",
    origin,
  );
  return origin;
}

// Get the base API URL
export const apiBase = getApiBaseUrl();

// For individual services, use VITE env vars if available (local dev with direct service ports)
// Otherwise use the dynamic apiBase (docker-compose/nginx or remote)
function getServiceUrl(envVar: string | undefined, defaultUrl: string): string {
  // Only use VITE env vars if we're in local dev mode (not through nginx)
  const { hostname, port } = globalThis.location;
  const currentPort =
    port || (globalThis.location.protocol === "https:" ? "443" : "80");
  const isLocalDev =
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    currentPort !== "31000" &&
    currentPort !== "30000";

  if (isLocalDev && envVar) {
    console.log("[FrontendAPI] Local dev mode, using VITE env var:", envVar);
    return envVar;
  }
  return defaultUrl;
}

export const userUrl = getServiceUrl(import.meta.env.VITE_USER_URL, apiBase);
export const restaurantUrl = getServiceUrl(
  import.meta.env.VITE_RESTAURANT_URL,
  apiBase,
);
export const orderUrl = getServiceUrl(import.meta.env.VITE_ORDER_URL, apiBase);
export const deliveryUrl = getServiceUrl(
  import.meta.env.VITE_DELIVERY_URL,
  apiBase,
);
