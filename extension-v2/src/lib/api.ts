export type VaultField = {
  key: string
  label: string
  memberId: string
  memberName: string
  value: string
}

export type Member = {
  id: string
  name: string
  fields: VaultField[]
}

export async function fetchVaultMembers(apiBaseUrl: string, apiKey: string): Promise<Member[]> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/vault`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `Request failed (${response.status})`)
  }

  const { fields } = await response.json() as { fields: VaultField[] }

  const byMember = new Map<string, Member>()
  for (const field of fields) {
    if (!byMember.has(field.memberId)) {
      byMember.set(field.memberId, { id: field.memberId, name: field.memberName, fields: [] })
    }
    byMember.get(field.memberId)!.fields.push(field)
  }

  return Array.from(byMember.values())
}
