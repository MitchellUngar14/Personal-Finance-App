"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // Redirect to login on success
      router.push("/login?registered=true");
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
          ~/finance-tracker/register
        </span>
      </div>

      {/* Title */}
      <h1 className="text-terminal-green text-xl mb-2">
        <span className="text-terminal-cyan">$</span> create_account
      </h1>
      <p className="text-text-muted text-sm mb-6">
        Initialize new user credentials...
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-terminal-green text-sm block mb-1">
            NAME<span className="cursor-blink">_</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
            className="w-full bg-black/50 border border-terminal-green/30
                       text-terminal-green p-3
                       focus:border-terminal-green focus:ring-1
                       focus:ring-terminal-green outline-none
                       disabled:opacity-50"
            placeholder="Your name"
          />
        </div>

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
            placeholder="Min 12 characters"
          />
          <p className="text-text-muted text-xs mt-1">
            Must include: uppercase, lowercase, number, special char
          </p>
        </div>

        <div>
          <label className="text-terminal-green text-sm block mb-1">
            CONFIRM PASSWORD<span className="cursor-blink">_</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            className="w-full bg-black/50 border border-terminal-green/30
                       text-terminal-green p-3
                       focus:border-terminal-green focus:ring-1
                       focus:ring-terminal-green outline-none
                       disabled:opacity-50"
            placeholder="Repeat password"
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
              <span>CREATING...</span>
            </>
          ) : (
            "[CREATE ACCOUNT]"
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-4 text-terminal-magenta text-sm p-3 border border-terminal-magenta/30 bg-terminal-magenta/10">
          ERROR: {error}
        </div>
      )}

      {/* Login Link */}
      <div className="mt-6 text-center text-sm">
        <span className="text-text-muted">Already have an account? </span>
        <Link
          href="/login"
          className="text-terminal-cyan hover:text-terminal-cyan/80 transition-colors"
        >
          [LOGIN]
        </Link>
      </div>
    </div>
  );
}
