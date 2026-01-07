"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials. Access denied.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="terminal-glow bg-terminal-bg-card p-8 w-full max-w-md">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-terminal-green text-sm ml-2">
          ~/finance-tracker/auth
        </span>
      </div>

      {/* Title */}
      <h1 className="text-terminal-green text-xl mb-2">
        <span className="text-terminal-cyan">$</span> authenticate
      </h1>
      <p className="text-text-muted text-sm mb-6">
        Enter credentials to access terminal...
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-terminal-green text-sm block mb-1">
            EMAIL<span className="cursor-blink">_</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="w-full bg-black/50 border border-terminal-green/30
                       text-terminal-green p-3
                       focus:border-terminal-green focus:ring-1
                       focus:ring-terminal-green outline-none
                       disabled:opacity-50"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="text-terminal-green text-sm block mb-1">
            PASSWORD<span className="cursor-blink">_</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="w-full bg-black/50 border border-terminal-green/30
                       text-terminal-green p-3
                       focus:border-terminal-green focus:ring-1
                       focus:ring-terminal-green outline-none
                       disabled:opacity-50"
            placeholder="********"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-terminal-green/10 border border-terminal-green
                     text-terminal-green py-3 mt-4
                     hover:bg-terminal-green/20 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="loading-spinner" />
              <span>AUTHENTICATING...</span>
            </>
          ) : (
            "[EXECUTE LOGIN]"
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-4 text-terminal-magenta text-sm p-3 border border-terminal-magenta/30 bg-terminal-magenta/10">
          ERROR: {error}
        </div>
      )}

      {/* Register Link */}
      <div className="mt-6 text-center text-sm">
        <span className="text-text-muted">New user? </span>
        <Link
          href="/register"
          className="text-terminal-cyan hover:text-terminal-cyan/80 transition-colors"
        >
          [CREATE ACCOUNT]
        </Link>
      </div>
    </div>
  );
}
