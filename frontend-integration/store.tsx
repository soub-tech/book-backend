import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BOOKS, bookBySlug, type PlanId } from "@/data/catalog";
import * as api from "@/lib/api";

export interface User {
  name: string;
  email: string;
}
export interface LibraryItem {
  slug: string;
  progress: number; // 0-100
  page: number;
  status: "reading" | "completed" | "unread";
  downloaded: boolean;
  addedAt: string;
  source: "purchase" | "membership" | "free";
}
export interface Order {
  id: string;
  date: string;
  items: string[];
  subtotal: number;
  discount: number;
  total: number;
  email: string;
}
export interface Notification {
  id: string;
  type: "book" | "wishlist" | "membership" | "purchase" | "reminder" | "recommendation";
  title: string;
  body: string;
  date: string;
  read: boolean;
}
export interface ReaderState {
  bookmarks: number[];
  highlights: string[];
  notes: Record<string, string>;
  fontSize: number;
  dark: boolean;
}

interface State {
  user: User | null;
  plan: PlanId;
  billing: "monthly" | "yearly";
  renewalDate: string;
  cart: string[];
  savedForLater: string[];
  wishlist: string[];
  library: LibraryItem[];
  interests: string[];
  orders: Order[];
  notifications: Notification[];
  reader: Record<string, ReaderState>;
  newsletter: boolean;
  // slug -> backend book id, populated lazily as books are looked up
  bookIds: Record<string, string>;
  // slugs the signed-in user currently has real access to (purchased, or membership-covered)
  ownedSlugs: string[];
  membershipActive: boolean;
}

const DEFAULT: State = {
  user: null,
  plan: "free",
  billing: "monthly",
  renewalDate: "",
  cart: [],
  savedForLater: [],
  wishlist: [],
  library: [],
  interests: [],
  orders: [],
  notifications: [],
  reader: {},
  newsletter: false,
  bookIds: {},
  ownedSlugs: [],
  membershipActive: false,
};

// Local, device-specific UI state only — NOT auth. Real session state comes
// from the backend (httpOnly refresh cookie + in-memory access token).
const KEY = "foreword-store-v1";
const today = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();

interface Ctx extends State {
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleWishlist: (slug: string) => void;
  inWishlist: (slug: string) => boolean;
  addToCart: (slug: string) => void;
  removeFromCart: (slug: string) => void;
  saveForLater: (slug: string) => void;
  moveToCart: (slug: string) => void;
  clearCart: () => void;
  cartTotals: (promo?: string) => { subtotal: number; discount: number; total: number; promoApplied: boolean };
  checkout: (email: string, promo?: string) => Promise<Order>;
  owns: (slug: string) => boolean;
  canRead: (slug: string) => boolean;
  addToLibrary: (slug: string, source?: LibraryItem["source"]) => void;
  removeFromLibrary: (slug: string) => void;
  setProgress: (slug: string, page: number, totalPages: number) => void;
  markDownloaded: (slug: string) => void;
  setInterests: (i: string[]) => void;
  subscribeToPlan: (planId: string) => Promise<void>;
  notify: (n: Omit<Notification, "id" | "date" | "read">) => void;
  markAllRead: () => void;
  readerState: (slug: string) => ReaderState;
  updateReader: (slug: string, patch: Partial<ReaderState>) => void;
  subscribe: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

const DEFAULT_READER: ReaderState = { bookmarks: [], highlights: [], notes: {}, fontSize: 18, dark: false };

// Resolves a slug to the backend's real book id, caching the result.
async function resolveBookId(slug: string, cache: Record<string, string>): Promise<string> {
  if (cache[slug]) return cache[slug];
  const book = await api.books.bySlug(slug);
  return book.id;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  // Restore local UI-only state (cart, wishlist, reader prefs) from localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  // On load, try to silently restore a real session using the refresh
  // cookie, then pull the user's real purchases + membership status.
  useEffect(() => {
    (async () => {
      try {
        const refreshed = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!refreshed.ok) return;
        const json = await refreshed.json();
        if (!json.data?.accessToken) return;
        api.setAccessToken(json.data.accessToken);

        const me = await api.auth.me();
        const [purchasesList, membershipStatus] = await Promise.all([api.purchases.mine(), api.membership.myStatus()]);

        setState((s) => ({
          ...s,
          user: { name: me.name, email: me.email },
          ownedSlugs: purchasesList.map((p) => p.book.slug).filter(Boolean) as string[],
          membershipActive: membershipStatus.active,
        }));
      } catch {
        // No valid session — user stays logged out. This is expected on first visit.
      }
    })();
  }, []);

  const patch = useCallback((fn: (s: State) => Partial<State>) => setState((s) => ({ ...s, ...fn(s) })), []);

  const notify = useCallback<Ctx["notify"]>(
    (n) =>
      patch((s) => ({
        notifications: [{ ...n, id: uid(), date: today(), read: false }, ...s.notifications].slice(0, 40),
      })),
    [patch]
  );

  const ctx = useMemo<Ctx>(() => {
    const owns = (slug: string) => state.ownedSlugs.includes(slug);
    const canRead = (slug: string) => owns(slug) || state.membershipActive === true && bookBySlug(slug)?.access !== "paid";

    const cartTotals = (promo?: string) => {
      const subtotal = state.cart.reduce((n, s) => n + (bookBySlug(s)?.price ?? 0), 0);
      const promoApplied = promo?.trim().toUpperCase() === "READMORE";
      const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
      return { subtotal, discount, total: subtotal - discount, promoApplied };
    };

    return {
      ...state,
      hydrated,

      login: async (email, password) => {
        const { user, accessToken } = await api.auth.login(email, password);
        api.setAccessToken(accessToken);
        const [purchasesList, membershipStatus] = await Promise.all([api.purchases.mine(), api.membership.myStatus()]);
        patch(() => ({
          user: { name: user.name, email: user.email },
          ownedSlugs: purchasesList.map((p) => p.book.slug).filter(Boolean) as string[],
          membershipActive: membershipStatus.active,
        }));
      },

      register: async (name, email, password) => {
        const { user, accessToken } = await api.auth.register(name, email, password);
        api.setAccessToken(accessToken);
        patch(() => ({ user: { name: user.name, email: user.email }, ownedSlugs: [], membershipActive: false }));
      },

      logout: async () => {
        await api.auth.logout();
        api.setAccessToken(null);
        patch(() => ({ user: null, ownedSlugs: [], membershipActive: false }));
      },

      inWishlist: (slug) => state.wishlist.includes(slug),
      toggleWishlist: (slug) => {
        const adding = !state.wishlist.includes(slug);
        patch((s) => ({ wishlist: adding ? [...s.wishlist, slug] : s.wishlist.filter((x) => x !== slug) }));
        if (adding) notify({ type: "wishlist", title: "Saved to wishlist", body: `${bookBySlug(slug)?.title} was added to your wishlist.` });
      },
      addToCart: (slug) => patch((s) => ({ cart: s.cart.includes(slug) ? s.cart : [...s.cart, slug], savedForLater: s.savedForLater.filter((x) => x !== slug) })),
      removeFromCart: (slug) => patch((s) => ({ cart: s.cart.filter((x) => x !== slug), savedForLater: s.savedForLater.filter((x) => x !== slug) })),
      saveForLater: (slug) => patch((s) => ({ cart: s.cart.filter((x) => x !== slug), savedForLater: [...s.savedForLater, slug] })),
      moveToCart: (slug) => patch((s) => ({ savedForLater: s.savedForLater.filter((x) => x !== slug), cart: [...s.cart, slug], wishlist: s.wishlist.filter((x) => x !== slug) })),
      clearCart: () => patch(() => ({ cart: [] })),
      cartTotals,

      // Real purchase: buys each book in the cart against the backend one by
      // one. If any purchase fails (already owned, payment issue, etc.) it
      // stops and surfaces the error instead of pretending it succeeded.
      checkout: async (email, promo) => {
        const t = cartTotals(promo);
        const boughtSlugs: string[] = [];
        for (const slug of state.cart) {
          const bookId = await resolveBookId(slug, state.bookIds);
          await api.purchases.buy(bookId);
          boughtSlugs.push(slug);
        }
        const order: Order = { id: `FW-${uid()}`, date: today(), items: state.cart, ...t, email };
        patch((s) => ({
          orders: [order, ...s.orders],
          cart: [],
          wishlist: s.wishlist.filter((w) => !order.items.includes(w)),
          ownedSlugs: [...new Set([...s.ownedSlugs, ...boughtSlugs])],
        }));
        notify({ type: "purchase", title: "Order confirmed", body: `Order ${order.id} · ${order.items.length} book${order.items.length > 1 ? "s" : ""} added to your library.` });
        return order;
      },

      owns,
      canRead,

      addToLibrary: (slug, source = "free") =>
        patch((s) => (s.library.some((l) => l.slug === slug) ? {} : { library: [...s.library, { slug, progress: 0, page: 0, status: "unread", downloaded: false, addedAt: today(), source }] })),
      removeFromLibrary: (slug) => patch((s) => ({ library: s.library.filter((l) => l.slug !== slug) })),

      // Sends real progress to the backend (fire-and-forget from the UI's
      // perspective) in addition to updating local library state for the UI.
      setProgress: (slug, page, totalPages) => {
        const percent = Math.min(100, Math.round(((page + 1) / totalPages) * 100));
        patch((s) => {
          const exists = s.library.some((l) => l.slug === slug);
          const items = exists ? s.library : [...s.library, { slug, progress: 0, page: 0, status: "unread" as const, downloaded: false, addedAt: today(), source: "purchase" as const }];
          return { library: items.map((l) => (l.slug === slug ? { ...l, page, progress: percent, status: percent >= 100 ? "completed" : "reading" } : l)) };
        });
        resolveBookId(slug, state.bookIds)
          .then((bookId) => api.progress.update(bookId, percent, page))
          .catch(() => {
            // Non-fatal: local reading state still updates even if the
            // network call fails (e.g. offline); it'll just be out of sync
            // with the backend until the next successful update.
          });
      },

      markDownloaded: (slug) => patch((s) => ({ library: s.library.map((l) => (l.slug === slug ? { ...l, downloaded: true } : l)) })),
      setInterests: (interests) => patch(() => ({ interests })),

      subscribeToPlan: async (planId) => {
        await api.membership.subscribe(planId);
        patch(() => ({ membershipActive: true }));
        notify({ type: "membership", title: "Membership active", body: "Membership-only books are now unlocked." });
      },

      notify,
      markAllRead: () => patch((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      readerState: (slug) => state.reader[slug] ?? DEFAULT_READER,
      updateReader: (slug, p) => patch((s) => ({ reader: { ...s.reader, [slug]: { ...(s.reader[slug] ?? DEFAULT_READER), ...p } } })),
      subscribe: () => patch(() => ({ newsletter: true })),
    };
  }, [state, hydrated, patch, notify]);

  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

export const allBooks = BOOKS;
