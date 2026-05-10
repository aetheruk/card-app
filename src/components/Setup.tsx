import { useState } from 'react'

interface SetupProps {
  onSave: (name: string) => Promise<void>
}

export function Setup({ onSave }: SetupProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onSave(name)
  }

  return (
    <main className="setup-screen">
      <form className="setup-panel" onSubmit={submit}>
        <div>
          <p className="eyebrow">Local collection</p>
          <h1>Pokemon TCG</h1>
        </div>
        <label>
          Trainer name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={32}
            autoFocus
          />
        </label>
        <button className="primary-button" disabled={saving || !name.trim()}>
          {saving ? 'Saving' : 'Start collecting'}
        </button>
      </form>
    </main>
  )
}
