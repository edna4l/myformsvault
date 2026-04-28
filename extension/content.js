function normalize(value) {
  return `${value || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function fieldLabelFor(input) {
  const labels = [];

  if (input.id) {
    const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    if (label) labels.push(label.textContent);
  }

  labels.push(input.getAttribute("aria-label"));
  labels.push(input.name);
  labels.push(input.placeholder);
  labels.push(input.id);

  return normalize(labels.filter(Boolean).join(" "));
}

async function fillFromVault() {
  const { apiBaseUrl, apiKey } = await chrome.storage.sync.get(["apiBaseUrl", "apiKey"]);

  if (!apiBaseUrl || !apiKey) {
    return;
  }

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/vault`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    return;
  }

  const { fields } = await response.json();
  const inputs = Array.from(document.querySelectorAll("input, textarea, select")).filter(
    (input) => !input.disabled && !input.readOnly && input.type !== "hidden",
  );

  for (const input of inputs) {
    const label = fieldLabelFor(input);
    const match = fields.find((field) => label.includes(normalize(field.label)));

    if (match?.value) {
      input.value = match.value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "MYFORMSVAULT_FILL") {
    fillFromVault();
  }
});
