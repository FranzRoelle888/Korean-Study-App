import { useState } from 'react'
import { PlusIcon, SearchIcon, EditIcon, TrashIcon } from './icons'

/* ============================================================
   BIBLIOTHEK
   - oben ein Formular zum Hinzufügen (Englisch + Koreanisch)
   - darunter eine durchsuchbare Liste
   - jede Zeile lässt sich bearbeiten oder löschen
   ============================================================ */

function Library({ vocab, onAdd, onEdit, onDelete }) {
  const [en, setEn] = useState('')
  const [ko, setKo] = useState('')
  const [error, setError] = useState('')
  const [justAdded, setJustAdded] = useState('')
  const [query, setQuery] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const result = onAdd(en, ko)
    if (result.error) {
      setError(result.error)
      setJustAdded('')
      return
    }
    setJustAdded(`„${result.word.ko}" hinzugefügt ✓`)
    setError('')
    setEn('')
    setKo('')
  }

  const q = query.trim().toLowerCase()
  const shown = q
    ? vocab.filter(
        (v) => v.en.toLowerCase().includes(q) || v.ko.includes(query.trim())
      )
    : vocab

  return (
    <div className="library">
      <h1 className="page-title">Bibliothek</h1>
      <p className="page-sub">{vocab.length} Vokabeln</p>

      {/* ---------- Hinzufügen ---------- */}
      <form className="add-card" onSubmit={handleSubmit}>
        <label className="field">
          <span>Englisch</span>
          <input
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder="z. B. water"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Koreanisch</span>
          <input
            value={ko}
            onChange={(e) => setKo(e.target.value)}
            placeholder="z. B. 물"
            lang="ko"
            autoComplete="off"
          />
        </label>

        {error && <p className="add-msg add-error">{error}</p>}
        {justAdded && <p className="add-msg add-ok">{justAdded}</p>}

        <button type="submit" className="add-btn">
          <PlusIcon /> Hinzufügen
        </button>
      </form>

      {/* ---------- Suche ---------- */}
      <div className="search">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen…"
          autoComplete="off"
        />
      </div>

      {/* ---------- Liste ---------- */}
      <ul className="vocab-list">
        {shown.map((v) => (
          <VocabRow key={v.id} vocab={v} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {shown.length === 0 && (
          <li className="vocab-empty">
            {vocab.length === 0
              ? 'Noch keine Vokabeln – füge oben deine erste hinzu.'
              : 'Nichts gefunden.'}
          </li>
        )}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------
   Eine einzelne Vokabel-Zeile. Sie kann drei Zustände haben:
   - normal (anzeigen + Stift/Papierkorb)
   - bearbeiten (zwei Eingabefelder + Speichern/Abbrechen)
   - löschen bestätigen
   ------------------------------------------------------------ */
function VocabRow({ vocab, onEdit, onDelete }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'confirmDelete'
  const [en, setEn] = useState(vocab.en)
  const [ko, setKo] = useState(vocab.ko)
  const [error, setError] = useState('')

  function startEdit() {
    setEn(vocab.en)
    setKo(vocab.ko)
    setError('')
    setMode('edit')
  }

  function save(e) {
    e.preventDefault()
    const res = onEdit(vocab.id, en, ko)
    if (res.error) {
      setError(res.error)
      return
    }
    setMode('view')
  }

  if (mode === 'edit') {
    return (
      <li className="vocab-row-edit">
        <form onSubmit={save}>
          <input
            className="edit-input"
            value={ko}
            onChange={(e) => setKo(e.target.value)}
            lang="ko"
            placeholder="Koreanisch"
            autoComplete="off"
          />
          <input
            className="edit-input"
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder="Englisch"
            autoComplete="off"
          />
          {error && <p className="add-msg add-error">{error}</p>}
          <div className="edit-actions">
            <button type="button" className="edit-cancel" onClick={() => setMode('view')}>
              Abbrechen
            </button>
            <button type="submit" className="edit-save">
              Speichern
            </button>
          </div>
        </form>
      </li>
    )
  }

  if (mode === 'confirmDelete') {
    return (
      <li className="vocab-row vocab-row-confirm">
        <span className="confirm-text">„{vocab.ko}" wirklich löschen?</span>
        <div className="confirm-actions">
          <button className="edit-cancel" onClick={() => setMode('view')}>
            Nein
          </button>
          <button className="confirm-delete" onClick={() => onDelete(vocab.id)}>
            Löschen
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="vocab-row">
      <div className="vocab-texts">
        <span className="vocab-ko" lang="ko">
          {vocab.ko}
        </span>
        <span className="vocab-en">{vocab.en}</span>
      </div>
      <div className="row-actions">
        <button className="row-btn" onClick={startEdit} aria-label="Bearbeiten">
          <EditIcon />
        </button>
        <button
          className="row-btn row-btn-danger"
          onClick={() => setMode('confirmDelete')}
          aria-label="Löschen"
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  )
}

export default Library
