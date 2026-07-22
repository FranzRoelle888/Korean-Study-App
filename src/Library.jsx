import { useState } from 'react'
import { PlusIcon, SearchIcon, EditIcon, TrashIcon } from './icons'

/* ============================================================
   LIBRARY
   - add form (English + Korean)
   - searchable list; each row can be edited or deleted
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
    setJustAdded(`"${result.word.ko}" added ✓`)
    setError('')
    setEn('')
    setKo('')
  }

  const q = query.trim().toLowerCase()
  const shown = q
    ? vocab.filter((v) => v.en.toLowerCase().includes(q) || v.ko.includes(query.trim()))
    : vocab

  return (
    <div className="library">
      <h1 className="page-title">Library</h1>
      <p className="page-sub">{vocab.length} words</p>

      {/* ---------- Add ---------- */}
      <form className="add-card" onSubmit={handleSubmit}>
        <label className="field">
          <span>English</span>
          <input
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder="e.g. water"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Korean</span>
          <input
            value={ko}
            onChange={(e) => setKo(e.target.value)}
            placeholder="e.g. 물"
            lang="ko"
            autoComplete="off"
          />
        </label>

        {error && <p className="add-msg add-error">{error}</p>}
        {justAdded && <p className="add-msg add-ok">{justAdded}</p>}

        <button type="submit" className="add-btn">
          <PlusIcon /> Add
        </button>
      </form>

      {/* ---------- Search ---------- */}
      <div className="search">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          autoComplete="off"
        />
      </div>

      {/* ---------- List ---------- */}
      <ul className="vocab-list">
        {shown.map((v) => (
          <VocabRow key={v.id} vocab={v} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {shown.length === 0 && (
          <li className="vocab-empty">
            {vocab.length === 0 ? 'No words yet – add your first one above.' : 'Nothing found.'}
          </li>
        )}
      </ul>
    </div>
  )
}

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
            placeholder="Korean"
            autoComplete="off"
          />
          <input
            className="edit-input"
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder="English"
            autoComplete="off"
          />
          {error && <p className="add-msg add-error">{error}</p>}
          <div className="edit-actions">
            <button type="button" className="edit-cancel" onClick={() => setMode('view')}>
              Cancel
            </button>
            <button type="submit" className="edit-save">
              Save
            </button>
          </div>
        </form>
      </li>
    )
  }

  if (mode === 'confirmDelete') {
    return (
      <li className="vocab-row vocab-row-confirm">
        <span className="confirm-text">Delete "{vocab.ko}"?</span>
        <div className="confirm-actions">
          <button className="edit-cancel" onClick={() => setMode('view')}>
            No
          </button>
          <button className="confirm-delete" onClick={() => onDelete(vocab.id)}>
            Delete
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
        <button className="row-btn" onClick={startEdit} aria-label="Edit">
          <EditIcon />
        </button>
        <button
          className="row-btn row-btn-danger"
          onClick={() => setMode('confirmDelete')}
          aria-label="Delete"
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  )
}

export default Library
