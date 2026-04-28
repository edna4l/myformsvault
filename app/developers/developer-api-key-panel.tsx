"use client";

import { useState } from "react";

export function DeveloperApiKeyPanel() {
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("Chrome extension");

  async function createKey() {
    setMessage("");
    setApiKey("");

    const response = await fetch("/developers/api-keys", {
      body: JSON.stringify({ name }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Unable to create an API key.");
      return;
    }

    setApiKey(data.key);
    setMessage("Copy this key now. Only the hashed version is saved.");
  }

  return (
    <div className="developer-key-panel">
      <label className="field">
        <span>API key name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <button type="button" className="button button-primary" onClick={createKey}>
        Generate API key
      </button>
      {message ? <p>{message}</p> : null}
      {apiKey ? <code className="developer-api-key">{apiKey}</code> : null}
    </div>
  );
}
