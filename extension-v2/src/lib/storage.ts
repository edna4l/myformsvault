export type StoredConfig = {
  apiKey: string
  apiBaseUrl: string
}

export async function getConfig(): Promise<StoredConfig> {
  const result = await chrome.storage.sync.get(['apiKey', 'apiBaseUrl'])
  return {
    apiKey: result.apiKey ?? '',
    apiBaseUrl: result.apiBaseUrl ?? '',
  }
}

export async function saveConfig(config: Partial<StoredConfig>): Promise<void> {
  await chrome.storage.sync.set(config)
}
