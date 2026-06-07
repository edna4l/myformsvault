import { useState, useEffect } from 'react'
import type { Member } from './lib/api'
import { fetchVaultMembers } from './lib/api'
import { getConfig } from './lib/storage'

type State =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }
  | { status: 'ready'; members: Member[]; selectedId: string }
  | { status: 'filling'; members: Member[]; selectedId: string }
  | { status: 'filled'; count: number; total: number }

export function App() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setState({ status: 'loading' })
    const config = await getConfig()
    if (!config.apiKey || !config.apiBaseUrl) {
      setState({ status: 'unconfigured' })
      return
    }
    try {
      const members = await fetchVaultMembers(config.apiBaseUrl, config.apiKey)
      if (members.length === 0) {
        setState({ status: 'error', message: 'No family members in your vault yet. Add one in MyFormsVault first.' })
        return
      }
      setState({ status: 'ready', members, selectedId: members[0].id })
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load vault.' })
    }
  }

  async function fill() {
    if (state.status !== 'ready') return
    const { members, selectedId } = state
    const member = members.find((m) => m.id === selectedId)
    if (!member) return

    setState({ status: 'filling', members, selectedId })

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      setState({ status: 'error', message: 'Could not find the active tab.' })
      return
    }

    try {
      const result = (await chrome.tabs.sendMessage(tab.id, {
        type: 'MYFORMSVAULT_FILL',
        fields: member.fields,
      })) as { filled: number; total: number }
      setState({ status: 'filled', count: result.filled, total: result.total })
    } catch {
      setState({ status: 'error', message: 'Could not reach the page. Try reloading it first.' })
    }
  }

  function openSettings() {
    chrome.runtime.openOptionsPage()
  }

  function selectMember(id: string) {
    if (state.status === 'ready' || state.status === 'filling') {
      setState({ ...state, selectedId: id })
    }
  }

  return (
    <div>
      <div className="header">
        <div className="brand">
          <div className="brand-mark">MFV</div>
          MyFormsVault
        </div>
        <button className="settings-btn" onClick={openSettings} title="Settings" aria-label="Open settings">
          ⚙
        </button>
      </div>

      <div className="body">
        {state.status === 'loading' && (
          <div className="loading">
            <div className="spinner" />
            Loading vault&hellip;
          </div>
        )}

        {state.status === 'unconfigured' && (
          <>
            <div className="state-notice">
              <strong>Not configured</strong>
              Add your API key to start autofilling forms from your vault.
            </div>
            <button className="btn-primary" onClick={openSettings}>
              Open Settings
            </button>
          </>
        )}

        {state.status === 'error' && (
          <>
            <div className="error-notice">{state.message}</div>
            <button className="btn-ghost" onClick={load}>
              Try again
            </button>
          </>
        )}

        {(state.status === 'ready' || state.status === 'filling') && (
          <>
            <div>
              <div className="section-label">Family member</div>
              <div className="member-list">
                {state.members.map((member) => (
                  <label
                    key={member.id}
                    className={`member-option${state.selectedId === member.id ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="member"
                      value={member.id}
                      checked={state.selectedId === member.id}
                      onChange={() => selectMember(member.id)}
                      disabled={state.status === 'filling'}
                    />
                    <span className="member-name">{member.name}</span>
                    <span className="member-count">{member.fields.length} fields</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={fill} disabled={state.status === 'filling'}>
              {state.status === 'filling' ? 'Filling…' : 'Fill this page'}
            </button>
          </>
        )}

        {state.status === 'filled' && (
          <>
            <div className="result-notice">
              <strong>
                {state.count} field{state.count !== 1 ? 's' : ''} filled
              </strong>
              <p>
                {state.total} input{state.total !== 1 ? 's' : ''} found on the page
              </p>
            </div>
            <button className="btn-ghost" onClick={load}>
              Fill again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
