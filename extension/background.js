chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.tabs.sendMessage(tab.id, { type: "MYFORMSVAULT_FILL" });
  }
});
