// API client for the book-reading backend.
// Set VITE_API_URL in a .env file at the project root, e.g.:
//   VITE_API_URL=https://your-backend.onrender.com/api

const BASE_URL = import.meta.env.VITE_API_URL as string;

if (!BASE_URL) {
  // Fails loudly at startup instead of silently sending requests to "undefined/...".
  console.error("VITE_API_URL is not set. Add it to your .env file.");
}

// --- Access token storage ---
// The refresh token lives in an httpOnly cookie (set by the backend) and is
// never touched by this file. The access token is short-lived and kept here.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// --- Core request helper ---
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  details?: unknown;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // Coalesce concurrent 401s into a single refresh call.
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // sends the httpOnly refresh cookie
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
        if (json.data?.accessToken) {
          setAccessToken(json.data.accessToken);
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  { retryOn401 = true }: { retryOn401?: boolean } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // needed so the refresh-token cookie is sent/received
  });

  // Access token expired mid-session — refresh once, then retry the original call.
  if (res.status === 401 && retryOn401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, { retryOn401: false });
    }
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed: ${res.status}`);
  }
  return json.data as T;
}

// --- Types (trimmed to what the frontend needs) ---
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
}

export interface ApiBook {
  id: string;
  slug: string | null;
  title: string;
  author: string;
  description: string | null;
  coverImageUrl: string | null;
  category: string | null;
  price: string;
  accessType: "FREE" | "PAID" | "MEMBERSHIP";
  status: string;
  pageCount: number | null;
  hasAccess?: boolean;
}

export interface ApiMembership {
  id: string;
  planId: string;
  status: string;
  startDate: string;
  expiryDate: string;
  plan: { id: string; name: string; price: string; durationDays: number };
}

export interface ApiProgress {
  bookId: string;
  currentPage: number;
  percentComplete: number;
  lastPosition: string | null;
  isCompleted: boolean;
}

// --- Auth ---
export const auth = {
  register: (name: string, email: string, password: string) =>
    request<{ user: ApiUser; accessToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ user: ApiUser; accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  me: () => request<ApiUser>("/users/me"),
};

// --- Books ---
export const books = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ items: ApiBook[]; total: number; totalPages: number }>(`/books${qs ? `?${qs}` : ""}`);
  },

  bySlug: (slug: string) => request<ApiBook>(`/books/slug/${slug}`),

  byId: (id: string) => request<ApiBook>(`/books/${id}`),

  // Returns a Blob URL for the actual book file (PDF/EPUB) — use this as an
  // <iframe src> or feed it to your PDF/EPUB viewer. It carries the auth
  // header manually since a plain <a href> can't attach one.
  readFileUrl: async (bookId: string) => {
    const res = await fetch(`${BASE_URL}/books/${bookId}/read`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      credentials: "include",
    });
    if (!res.ok) throw new Error("You don't have access to this book");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};

// --- Purchases ---
export const purchases = {
  buy: (bookId: string) => request<unknown>("/purchases", { method: "POST", body: JSON.stringify({ bookId }) }),
  mine: () => request<Array<{ bookId: string; book: ApiBook; purchasedAt: string }>>("/purchases/me"),
};

// --- Membership ---
export const membership = {
  plans: () => request<Array<{ id: string; name: string; price: string; durationDays: number }>>("/memberships/plans"),
  subscribe: (planId: string) =>
    request<ApiMembership>("/memberships/subscribe", { method: "POST", body: JSON.stringify({ planId }) }),
  myStatus: () => request<{ active: boolean; membership: ApiMembership | null }>("/memberships/me"),
  cancel: (membershipId: string) => request<unknown>(`/memberships/me/${membershipId}/cancel`, { method: "POST" }),
};

// --- Reading progress ---
export const progress = {
  update: (bookId: string, percentComplete: number, currentPage?: number, lastPosition?: string) =>
    request<ApiProgress>("/progress", {
      method: "POST",
      body: JSON.stringify({ bookId, percentComplete, currentPage, lastPosition }),
    }),
  forBook: (bookId: string) => request<ApiProgress | null>(`/progress/${bookId}`),
  continueReading: () => request<Array<{ book: ApiBook; percentComplete: number }>>("/progress/continue-reading"),
  history: () => request<Array<{ book: ApiBook; completedAt: string }>>("/progress/history"),
};

// --- Dashboard ---
export const dashboard = {
  get: () =>
    request<{
      totalBooksStarted: number;
      totalBooksCompleted: number;
      currentlyReading: unknown[];
      purchasedBooks: unknown[];
      membershipActive: boolean;
    }>("/users/me/dashboard"),
};
