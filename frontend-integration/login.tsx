import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/Header";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional(), mode: z.enum(["signin", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Foreword" },
      { name: "description", content: "Sign in or create a free Foreword account to read, save and track your books." },
      { property: "og:title", content: "Sign in — Foreword" },
      { property: "og:description", content: "Sign in or create a free Foreword account." },
    ],
  }),
  component: Login,
});

function Login() {
  const store = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        await store.register(name || email.split("@")[0] || "Reader", email, password);
        toast.success("Welcome to Foreword.");
      } else {
        await store.login(email, password);
        toast.success("Welcome back.");
      }
      navigate({ to: (search.redirect as "/") ?? "/account" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-x grid min-h-[80vh] items-center gap-12 py-12 lg:grid-cols-2">
      <div className="hidden lg:block">
        <Logo className="text-3xl" />
        <h1 className="mt-10 max-w-md text-5xl leading-[1.05]">Your next chapter starts here.</h1>
        <p className="mt-5 max-w-md text-lg text-muted-foreground">A free account gives you the free library, a personal shelf, wishlist and reading progress that follows you everywhere.</p>
      </div>
      <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-card">
        <div className="mb-6 grid grid-cols-2 rounded-md bg-taupe p-1 text-sm font-medium">
          {(["signup", "signin"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-sm py-2 transition-colors ${mode === m ? "bg-paper shadow-sm" : "text-muted-foreground"}`}>{m === "signup" ? "Create account" : "Sign in"}</button>
          ))}
        </div>
        <h2 className="text-2xl">{mode === "signup" ? "Create your free account" : "Welcome back"}</h2>
        {error && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div><Label htmlFor="name" className="mb-1.5 block">Full name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11 bg-paper" autoComplete="name" /></div>
          )}
          <div><Label htmlFor="email" className="mb-1.5 block">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-paper" autoComplete="email" /></div>
          <div><Label htmlFor="password" className="mb-1.5 block">Password</Label><Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-paper" autoComplete={mode === "signup" ? "new-password" : "current-password"} /></div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</Button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          By continuing you agree to our <Link to="/terms" className="underline underline-offset-4">Terms</Link> and <Link to="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
