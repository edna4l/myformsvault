import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="app-shell">
      <div style={{ maxWidth: 440, margin: "4rem auto" }}>
        <div className="form-surface">
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.5rem" }}>
            <div className="brand-mark" style={{ width: "2.6rem", height: "2.6rem", borderRadius: "999px", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #4330a8, #5b6ee1)", color: "white", fontSize: "0.82rem", fontWeight: 800 }}>
              MFV
            </div>
            <span style={{ fontWeight: 700, letterSpacing: "-0.04em", fontSize: "1rem" }}>
              MyFormsVault
            </span>
          </div>

          <span className="eyebrow">Admin access</span>
          <h1
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              letterSpacing: "-0.05em",
              lineHeight: 0.95,
              margin: "0.6rem 0 1.5rem",
            }}
          >
            Sign in to your account
          </h1>

          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
