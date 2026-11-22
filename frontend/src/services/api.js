
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000/api"
).replace(/\/+$/, "");

const TOKEN_KEY = "spotsync_access_token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  if (options.body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Unable to reach SpotSync backend. Check your connection or backend CORS configuration."
    );
  }

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      (typeof data === "string" ? data : null) ||
      `Request failed with status ${response.status}`;

    throw new Error(
      typeof message === "string"
        ? message
        : JSON.stringify(message)
    );
  }

  return data;
}

const jsonBody = (data) => JSON.stringify(data);

export const api = {
  auth: {
    login: (credentials) =>
      apiRequest("/auth/login", {
        method: "POST",
        body: jsonBody(credentials),
      }),

    register: (user) =>
      apiRequest("/auth/register", {
        method: "POST",
        body: jsonBody(user),
      }),

    me: () => apiRequest("/auth/me"),
  },

  vehicles: {
    list: () => apiRequest("/vehicles"),

    create: (vehicle) =>
      apiRequest("/vehicles", {
        method: "POST",
        body: jsonBody(vehicle),
      }),
  },

  parking: {
    overview: () => apiRequest("/parking/overview"),

    slots: (options = {}) => {
      const params = new URLSearchParams({ available_only: String(options.availableOnly ?? false) });

      if (options.parkingLotId) {
        params.set(
          "parking_lot_id",
          options.parkingLotId
        );
      }

      if (options.availableOnly !== undefined) {
        params.set(
          "available_only",
          String(options.availableOnly)
        );
      }

      const query = params.toString();

      return apiRequest(
        `/parking/slots${query ? `?${query}` : ""}`
      );
    },

    availability: (options) => {
      const params = new URLSearchParams({
        parking_lot_id: String(options.parkingLotId),
        start_time: options.startTime,
        end_time: options.endTime,
      });

      return apiRequest(
        `/parking/availability?${params.toString()}`
      );
    },

    live: () => apiRequest("/parking/live"),
  },

  navigation: {
    route: (slotId) =>
      apiRequest(`/navigation/${slotId}`),

    compareRoutes: (slotIds) => {
      const params = new URLSearchParams({
        slots: slotIds.join(","),
      });

      return apiRequest(
        `/navigation/routes?${params.toString()}`
      );
    },

    health: () =>
      apiRequest("/navigation/graph/health"),
  },

  recommendations: {
    parking: (details) =>
      apiRequest("/recommendations/parking", {
        method: "POST",
        body: jsonBody(details),
      }),
  },

  sessions: {
    list: () => apiRequest("/sessions"),

    start: (details) =>
      apiRequest("/sessions/entry", {
        method: "POST",
        body: jsonBody(details),
      }),

    exit: (sessionId) =>
      apiRequest(`/sessions/${sessionId}/exit`, {
        method: "POST",
      }),
  },

  bookings: {
    list: () => apiRequest("/bookings"),

    get: (bookingId) =>
      apiRequest(`/bookings/${bookingId}`),

    create: (details) =>
      apiRequest("/bookings", {
        method: "POST",
        body: jsonBody(details),
      }),

    createAutomatic: (details) =>
      apiRequest("/bookings/auto", {
        method: "POST",
        body: jsonBody(details),
      }),

    cancel: (bookingId) =>
      apiRequest(`/bookings/${bookingId}/cancel`, {
        method: "PATCH",
      }),
  },

  payments: {
    createOrder: (details) =>
      apiRequest("/payments/create-order", {
        method: "POST",
        body: jsonBody(details),
      }),

    verify: (details) =>
      apiRequest("/payments/verify", {
        method: "POST",
        body: jsonBody(details),
      }),

    refund: (details) =>
      apiRequest("/payments/refund", {
        method: "POST",
        body: jsonBody(details),
      }),
  },

  sensors: {
    latest: () => apiRequest("/sensors/latest"),
  },

  tickets: {
    createForSession: (sessionId) =>
      apiRequest(`/tickets/sessions/${sessionId}`, {
        method: "POST",
      }),

    validate: (token) =>
      apiRequest("/tickets/validate", {
        method: "POST",
        body: jsonBody({ token }),
      }),

    exitWithTicket: (token) =>
      apiRequest("/tickets/exit", {
        method: "POST",
        body: jsonBody({ token }),
      }),
  },
};

// Authentication compatibility for Staff Control Center.
export function getToken() {
  return getAuthToken()
}

export function saveToken(token) {
  return setAuthToken(token)
}

export function clearToken() {
  return clearAuthToken()
}

export async function loginUser(email, password) {
  const data = await api.auth.login({ email, password })

  if (!data?.access_token) {
    throw new Error("Login response did not contain an access token.")
  }

  setAuthToken(data.access_token)
  return data
}

export async function getCurrentUser() {
  return api.auth.me()
}

export function logoutUser() {
  clearAuthToken()
}

