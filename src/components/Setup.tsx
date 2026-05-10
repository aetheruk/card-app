import { ArrowRight } from 'lucide-react'
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
        <label>
          Trainer Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={32}
            autoFocus
          />
        </label>
        <button
          className="setup-submit-button"
          disabled={saving || !name.trim()}
          aria-label="Save trainer name"
        >
          <ArrowRight size={20} />
        </button>
      </form>
    </main>
  )
}
