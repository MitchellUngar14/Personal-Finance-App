import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="terminal-glow bg-terminal-bg-card p-8 w-full max-w-md flex items-center justify-center">
          <div className="loading-spinner" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
