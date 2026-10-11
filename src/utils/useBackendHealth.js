import { useState, useEffect, useCallback } from "react";

const BACKEND_URL =
  process.env.REACT_APP_API_BASE_URL || "https://app-backend-lutn.onrender.com";
const PING_ENDPOINT = `${BACKEND_URL}/api/v1/admin/offers`;
const FALLBACK_ENDPOINT = `${BACKEND_URL}/actuator/health`;

// Shared in-memory state so multiple components stay synchronized
let globalState = {
  isOnline: null,
  latency: 0,
  httpStatus: 0,
  lastChecked: null,
  checking: false,
  errorMsg: null,
  history: []
};

const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach((fn) => fn({ ...globalState }));
};

/**
 * Execute actual ping against live Spring Boot / Render backend
 */
export async function executePing() {
  if (globalState.checking) return globalState;

  globalState.checking = true;
  notifyListeners();

  const start = performance.now();
  let ok = false;
  let statusCode = 0;
  let latency = 0;
  let errorMsg = null;

  try {
    const res = await fetch(PING_ENDPOINT, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000)
    });

    latency = Math.round(performance.now() - start);
    statusCode = res.status;
    // Consider 2xx or 3xx or valid json 404 (spring boot answering) as online
    ok = res.ok || res.status === 200 || res.status === 404;
  } catch (err) {
    // Try fallback endpoint
    try {
      const resFallback = await fetch(FALLBACK_ENDPOINT, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(4000)
      });
      latency = Math.round(performance.now() - start);
      statusCode = resFallback.status;
      ok = resFallback.ok || resFallback.status === 200 || resFallback.status === 404;
    } catch (fbErr) {
      latency = Math.round(performance.now() - start);
      statusCode = 0;
      ok = false;
      errorMsg = err.name === "TimeoutError" ? "Request Timeout (7s)" : err.message;
    }
  }

  const now = new Date();
  const historyEntry = {
    time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    latency: ok ? latency : 0,
    ok,
    status: statusCode
  };

  const updatedHistory = [historyEntry, ...globalState.history].slice(0, 8);

  globalState = {
    isOnline: ok,
    latency: ok ? latency : 0,
    httpStatus: statusCode,
    lastChecked: now,
    checking: false,
    errorMsg,
    history: updatedHistory
  };

  notifyListeners();
  return globalState;
}

// Initial ping on app startup
if (typeof window !== "undefined") {
  setTimeout(() => {
    executePing();
  }, 500);

  // Periodic background check every 25 seconds
  setInterval(() => {
    executePing();
  }, 25000);
}

/**
 * Custom React Hook for live backend health status across any component
 */
export function useBackendHealth() {
  const [state, setState] = useState({ ...globalState });

  useEffect(() => {
    const handler = (newState) => {
      setState(newState);
    };
    listeners.add(handler);
    // Sync immediate current state
    setState({ ...globalState });

    return () => {
      listeners.delete(handler);
    };
  }, []);

  const pingNow = useCallback(async () => {
    return await executePing();
  }, []);

  return {
    ...state,
    backendUrl: BACKEND_URL,
    pingEndpoint: PING_ENDPOINT,
    pingNow
  };
}
