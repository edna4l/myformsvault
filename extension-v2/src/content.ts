type VaultField = {
  label: string
  value: string
}

type FillResult = {
  filled: number
  total: number
}

function normalize(s: string): string {
  return `${s || ''}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function getSignal(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const parts: string[] = []

  if (input.id) {
    const labelEl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`)
    if (labelEl) parts.push(labelEl.textContent ?? '')
  }

  const parentLabel = input.closest('label')
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true) as HTMLLabelElement
    clone.querySelectorAll('input, textarea, select').forEach((el) => el.remove())
    parts.push(clone.textContent ?? '')
  }

  parts.push(input.getAttribute('aria-label') ?? '')

  const labelledBy = input.getAttribute('aria-labelledby')
  if (labelledBy) {
    parts.push(document.getElementById(labelledBy)?.textContent ?? '')
  }

  parts.push(input.name ?? '')
  parts.push(input.placeholder ?? '')
  parts.push(input.id ?? '')

  // Preceding sibling text (common unlabelled pattern)
  const prev = input.previousElementSibling
  if (prev && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(prev.tagName)) {
    parts.push(prev.textContent ?? '')
  }

  return normalize(parts.filter(Boolean).join(' '))
}

const AUTOCOMPLETE_HINTS: Record<string, string[]> = {
  'given-name': ['first name', 'firstname', 'given name'],
  'family-name': ['last name', 'lastname', 'family name', 'surname'],
  name: ['full name', 'fullname'],
  email: ['email'],
  tel: ['phone', 'telephone', 'mobile', 'cell'],
  'street-address': ['address', 'street address'],
  'address-line1': ['address', 'street'],
  'address-line2': ['address 2', 'apt', 'suite', 'unit'],
  'postal-code': ['zip', 'postal', 'postcode', 'zip code'],
  'address-level2': ['city', 'town'],
  'address-level1': ['state', 'province', 'region'],
  'country-name': ['country'],
  bday: ['date of birth', 'birthday', 'birth date', 'dob'],
  organization: ['organization', 'company', 'school', 'employer'],
}

const TYPE_HINTS: Record<string, string[]> = {
  email: ['email'],
  tel: ['phone', 'mobile', 'telephone'],
  date: ['date', 'birth', 'dob'],
}

function matchScore(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  fieldLabel: string,
): number {
  const normalizedField = normalize(fieldLabel)
  const words = normalizedField.split(' ').filter(Boolean)
  if (!words.length) return 0

  const signal = getSignal(input)
  let score = 0

  if (signal.includes(normalizedField)) score += 10
  else if (words.every((w) => signal.includes(w))) score += 7
  else score += words.filter((w) => signal.includes(w)).length * 2

  const ac = input.getAttribute('autocomplete')?.toLowerCase() ?? ''
  const acTerms = AUTOCOMPLETE_HINTS[ac] ?? []
  if (acTerms.some((t) => normalizedField.includes(normalize(t)))) score += 6

  const inputType = (input as HTMLInputElement).type?.toLowerCase() ?? ''
  const typeTerms = TYPE_HINTS[inputType] ?? []
  if (typeTerms.some((t) => normalizedField.includes(t))) score += 4

  return score
}

function setValue(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void {
  // Use the native value setter so React-controlled inputs pick up the change
  const proto = Object.getPrototypeOf(input)
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  if (descriptor?.set) {
    descriptor.set.call(input, value)
  } else {
    input.value = value
  }
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function fillPage(fields: VaultField[]): FillResult {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      [
        'input:not([type=hidden]):not([type=submit]):not([type=button])',
        ':not([type=reset]):not([type=checkbox]):not([type=radio])',
        ':not([type=file]):not([disabled]):not([readonly])',
        ', textarea:not([disabled]):not([readonly])',
        ', select:not([disabled])',
      ].join(''),
    ),
  )

  let filled = 0

  for (const input of inputs) {
    let bestScore = 3
    let bestField: VaultField | null = null

    for (const field of fields) {
      if (!field.value) continue
      const score = matchScore(input, field.label)
      if (score > bestScore) {
        bestScore = score
        bestField = field
      }
    }

    if (bestField) {
      setValue(input, bestField.value)
      filled++
    }
  }

  return { filled, total: inputs.length }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'MYFORMSVAULT_FILL') {
    sendResponse(fillPage(message.fields as VaultField[]))
  }
  return true
})
