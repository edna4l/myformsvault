import Link from "next/link";

import { DeveloperApiKeyPanel } from "@/app/developers/developer-api-key-panel";
import { getCurrentUserApiKeys } from "@/lib/api-keys";

export const dynamic = "force-dynamic";

export default async function DevelopersPage() {
  const apiKeys = await getCurrentUserApiKeys();

  return (
    <main className="app-shell workbench-shell">
      <div className="dashboard-shell">
        <div className="dashboard-heading">
          <div className="dashboard-copy">
            <span className="eyebrow">Developers</span>
            <h1>Connect the vault to browsers, automations, and external tools.</h1>
            <p>
              Use API keys with the api-vault edge function, then install the Chrome extension to
              read fields on a page and fill matching saved vault values.
            </p>
          </div>
          <div className="button-row">
            <Link href="/developers/extension.zip" className="button button-primary">
              Download extension ZIP
            </Link>
            <Link href="/dashboard" className="button button-secondary">
              Dashboard
            </Link>
          </div>
        </div>

        <div className="detail-grid">
          <section className="form-surface">
            <span className="eyebrow">API key</span>
            <h2>Create a key for the extension</h2>
            <p>
              Keys are stored as SHA-256 hashes. The plain key is shown once so it can be pasted
              into the extension options screen.
            </p>
            <DeveloperApiKeyPanel />
          </section>

          <aside className="surface-card">
            <span className="eyebrow">Existing keys</span>
            <h2>Saved hashed keys</h2>
            <div className="detail-stack" style={{ marginTop: "1rem" }}>
              {apiKeys.length === 0 ? (
                <div className="empty-state">
                  <strong>No API keys yet</strong>
                  <p>Create one after signing in to use the extension and REST API.</p>
                </div>
              ) : (
                apiKeys.map((apiKey) => (
                  <article key={apiKey.id} className="list-card compact-card">
                    <strong>{apiKey.name}</strong>
                    <p className="list-copy">
                      Prefix {apiKey.keyPrefix}
                      {apiKey.revokedAt ? " · revoked" : ""}
                    </p>
                  </article>
                ))
              )}
            </div>
          </aside>
        </div>

        <section className="surface-card developer-docs">
          <span className="eyebrow">REST API</span>
          <h2>api-vault edge function</h2>
          <div className="response-grid">
            <div className="response-item">
              <span>GET</span>
              <strong>/vault</strong>
            </div>
            <div className="response-item">
              <span>GET</span>
              <strong>/templates</strong>
            </div>
            <div className="response-item">
              <span>POST</span>
              <strong>/templates/:id/fill</strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
