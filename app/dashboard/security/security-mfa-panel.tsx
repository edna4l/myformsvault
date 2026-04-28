"use client";

import { useMemo, useState } from "react";

import { createClient } from "@/utils/supabase/client";

type TotpEnrollment = {
  id: string;
  totp?: {
    qr_code?: string;
    secret?: string;
  };
};

type MfaApi = {
  challenge(input: { factorId: string }): Promise<{ data: { id: string } | null; error: Error | null }>;
  enroll(input: { factorType: "totp"; friendlyName?: string }): Promise<{
    data: TotpEnrollment | null;
    error: Error | null;
  }>;
  listFactors(): Promise<{
    data: { totp?: Array<{ id: string; status?: string }> } | null;
    error: Error | null;
  }>;
  unenroll(input: { factorId: string }): Promise<{ error: Error | null }>;
  verify(input: {
    challengeId: string;
    code: string;
    factorId: string;
  }): Promise<{ error: Error | null }>;
};

function getMfaApi() {
  return createClient().auth.mfa as unknown as MfaApi;
}

function makeRecoveryCodes() {
  return Array.from({ length: 8 }, () =>
    crypto
      .getRandomValues(new Uint32Array(1))[0]
      .toString(36)
      .slice(0, 8)
      .toUpperCase(),
  );
}

export function SecurityMfaPanel() {
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [message, setMessage] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState("");
  const qrCodeIsImage = useMemo(() => qrCode.startsWith("data:") || qrCode.startsWith("http"), [qrCode]);

  async function refreshFactors() {
    setMessage("");
    const { data, error } = await getMfaApi().listFactors();

    if (error) {
      setMessage(error.message);
      return;
    }

    const factor = data?.totp?.[0];
    setFactorId(factor?.id ?? "");
    setStatus(factor?.status ?? "not enrolled");
  }

  async function enroll() {
    setMessage("");
    const { data, error } = await getMfaApi().enroll({
      factorType: "totp",
      friendlyName: "MyFormsVault",
    });

    if (error || !data) {
      setMessage(error?.message ?? "Unable to start enrollment.");
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp?.qr_code ?? "");
    setSecret(data.totp?.secret ?? "");
    setRecoveryCodes(makeRecoveryCodes());
    setStatus("waiting for verification");
  }

  async function challenge() {
    if (!factorId) {
      setMessage("Start enrollment first.");
      return;
    }

    const { data, error } = await getMfaApi().challenge({ factorId });

    if (error || !data) {
      setMessage(error?.message ?? "Unable to start challenge.");
      return;
    }

    setChallengeId(data.id);
    setMessage("Enter the six-digit code from your authenticator app.");
  }

  async function verify() {
    if (!factorId || !challengeId || !code.trim()) {
      setMessage("Start a challenge and enter the authenticator code.");
      return;
    }

    const { error } = await getMfaApi().verify({
      challengeId,
      code: code.trim(),
      factorId,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    await fetch("/dashboard/security/audit", {
      body: JSON.stringify({ action: "2fa_enabled" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    setStatus("verified");
    setMessage("Two-factor authentication is enabled.");
  }

  async function disable() {
    if (!factorId) {
      setMessage("No authenticator factor is enrolled.");
      return;
    }

    const { error } = await getMfaApi().unenroll({ factorId });

    if (error) {
      setMessage(error.message);
      return;
    }

    setChallengeId("");
    setCode("");
    setFactorId("");
    setQrCode("");
    setRecoveryCodes([]);
    setSecret("");
    setStatus("disabled");
    setMessage("Two-factor authentication has been disabled.");
  }

  return (
    <div className="security-panel">
      <div className="security-actions">
        <button type="button" className="button button-secondary" onClick={refreshFactors}>
          Check status
        </button>
        <button type="button" className="button button-primary" onClick={enroll}>
          Enroll authenticator
        </button>
        <button type="button" className="button button-secondary" onClick={challenge}>
          Start challenge
        </button>
        <button type="button" className="button button-secondary" onClick={verify}>
          Confirm code
        </button>
        <button type="button" className="button button-danger" onClick={disable}>
          Disable 2FA
        </button>
      </div>

      <div className="security-status">
        <strong>Status: {status || "not checked"}</strong>
        {message ? <p>{message}</p> : null}
      </div>

      {qrCode ? (
        <div className="security-qr">
          <div>
            <span className="eyebrow">Authenticator QR</span>
            <h2>Scan this QR code</h2>
            {secret ? <p className="mono">Secret: {secret}</p> : null}
          </div>
          {qrCodeIsImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCode} alt="Authenticator QR code" />
          ) : (
            <div className="qr-svg" dangerouslySetInnerHTML={{ __html: qrCode }} />
          )}
        </div>
      ) : null}

      <label className="field">
        <span>Authenticator code</span>
        <input
          inputMode="numeric"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="123456"
        />
      </label>

      <div className="recovery-codes-card">
        <span className="eyebrow">Recovery codes</span>
        <h2>Save these before finishing enrollment</h2>
        {recoveryCodes.length === 0 ? (
          <p>Recovery codes will appear after starting enrollment.</p>
        ) : (
          <div className="recovery-code-grid">
            {recoveryCodes.map((recoveryCode) => (
              <code key={recoveryCode}>{recoveryCode}</code>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
