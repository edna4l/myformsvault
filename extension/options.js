async function loadOptions() {
  const values = await chrome.storage.sync.get(["apiBaseUrl", "apiKey"]);

  document.getElementById("apiBaseUrl").value = values.apiBaseUrl || "";
  document.getElementById("apiKey").value = values.apiKey || "";
}

async function saveOptions() {
  await chrome.storage.sync.set({
    apiBaseUrl: document.getElementById("apiBaseUrl").value.trim(),
    apiKey: document.getElementById("apiKey").value.trim(),
  });
  document.getElementById("status").textContent = "Saved.";
}

async function fillCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "MYFORMSVAULT_FILL" });
    document.getElementById("status").textContent = "Fill request sent.";
  }
}

document.getElementById("save").addEventListener("click", saveOptions);
document.getElementById("fill").addEventListener("click", fillCurrentPage);
loadOptions();
