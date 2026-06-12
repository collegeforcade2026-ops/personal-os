"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(from);
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
      <h1 className="text-xl font-semibold tracking-tight">Personal OS</h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoFocus
        className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--ink-0)] placeholder:text-[var(--ink-2)] focus:outline-none focus:border-[var(--accent)]"
      />
      {error && <p className="text-[var(--danger)] text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-[var(--accent)] text-[var(--ink-4)] rounded-lg px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
