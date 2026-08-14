import { useState } from 'react'
import { PlusIcon, SearchIcon, EditIcon, TrashIcon } from './icons'

/* ============================================================
   LIBRARY
   - add form (English + Korean)
   - searchable list; each row can be edited or deleted
   ============================================================ */


/* Wortarten in fester Reihenfolge. Der Filter blendet sich selbst
   aus, solange kein einziges Wort eine Wortart hat — auf der
   koreanischen Seite ist das (noch) so. */
const POS_KEYS = ['noun', 'verb', 'adj', 'adv', 'phrase', 'other']

/* Kleines Kürzel hinter dem Wort */
function PosTag({ pos, t }) {
  if (!pos) return null
  return <span className={pos === 'noun' ? 'pos-tag pos-noun' : 'pos-tag'}>{t.posShort[pos] || '·'}</span>
}

function Library({ vocab, onAdd, onEdit, onDelete, profile, t, tt }) {
  const [en, setEn] = useState('')
  const [ko, setKo] = useState('')
  const [error, setError] = useState('')
  const [justAdded, setJustAdded] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest') // 'newest' | 'alpha'
  const [pos, setPos] = useState('') // Wortart des neuen Wortes
  const [posFilter, setPosFilter] = useState('') // '' = alle

  /* Filter nur zeigen, wenn ueberhaupt Wortarten hinterlegt sind */
  const hasPos = vocab.some((v) => v.pos)

  function handleSubmit(e) {
    e.preventDefault()
    const result = onAdd(en, ko, pos)
    if (result.error) {
      setError(result.error === 'duplicate' ? t.duplicate(result.word) : t[result.error])
      setJustAdded('')
      return
    }
    setJustAdded(t.addedOk(result.word.ko))
    setError('')
    setEn('')
    setKo('')
    setPos('')
  }

  const q = query.trim().toLowerCase()
  const byPos = posFilter ? vocab.filter((v) => v.pos === posFilter) : vocab
  const filtered = q
    ? byPos.filter((v) => v.en.toLowerCase().includes(q) || v.ko.includes(query.trim()))
    : byPos
  const shown = [...filtered].sort((a, b) =>
    sort === 'alpha'
      ? a.en.toLowerCase().localeCompare(b.en.toLowerCase())
      : (b.createdAt || 0) - (a.createdAt || 0)
  )

  return (
    <div className="library">
      <h1 className="page-title">{t.library}</h1>
      <p className="page-sub">{t.wordsCount(vocab.length)}</p>

      {/* ---------- Add ---------- */}
      <form className="add-card" onSubmit={handleSubmit}>
        <label className="field">
          <span>{profile.knownName}</span>
          <input
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder={tt.knownExample}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>{profile.targetName}</span>
          <input
            value={ko}
            onChange={(e) => setKo(e.target.value)}
            placeholder={tt.example}
            lang={profile.targetLang}
            autoComplete="off"
          />
        </label>

        <div className="pos-row">
          {POS_KEYS.map((k) => (
            <button
              type="button"
              key={k}
              className={pos === k ? 'pos-pick pos-pick-on' : 'pos-pick'}
              onClick={() => setPos(pos === k ? '' : k)}
            >
              {t.pos[k]}
            </button>
          ))}
        </div>

        {error && <p className="add-msg add-error">{error}</p>}
        {justAdded && <p className="add-msg add-ok">{justAdded}</p>}

        <button type="submit" className="add-btn">
          <PlusIcon /> {t.add}
        </button>
      </form>

      {/* ---------- Search ---------- */}
      <div className="search">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          autoComplete="off"
        />
      </div>

      {/* ---------- Sort ---------- */}
      <div className="sort-row">
        <span className="sort-label">{t.sort}</span>
        <button
          className={sort === 'newest' ? 'sort-pill sort-active' : 'sort-pill'}
          onClick={() => setSort('newest')}
        >
          {t.newest}
        </button>
        <button
          className={sort === 'alpha' ? 'sort-pill sort-active' : 'sort-pill'}
          onClick={() => setSort('alpha')}
        >
          {t.alpha}
        </button>
      </div>

      {hasPos && (
        <div className="pos-row">
          <button
            className={posFilter === '' ? 'pos-pick pos-pick-on' : 'pos-pick'}
            onClick={() => setPosFilter('')}
          >
            {t.posAll}
          </button>
          {POS_KEYS.filter((k) => vocab.some((v) => v.pos === k)).map((k) => (
            <button
              key={k}
              className={posFilter === k ? 'pos-pick pos-pick-on' : 'pos-pick'}
              onClick={() => setPosFilter(posFilter === k ? '' : k)}
            >
              {t.pos[k]}
            </button>
          ))}
        </div>
      )}

      {/* ---------- List ---------- */}
      <ul className="vocab-list">
        {shown.map((v) => (
          <VocabRow key={v.id} vocab={v} onEdit={onEdit} onDelete={onDelete} profile={profile} t={t} />
        ))}
        {shown.length === 0 && (
          <li className="vocab-empty">
            {vocab.length === 0 ? t.noWords : t.nothingFound}
          </li>
        )}
      </ul>
    </div>
  )
}

function VocabRow({ vocab, onEdit, onDelete, profile, t }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'confirmDelete'
  const [en, setEn] = useState(vocab.en)
  const [ko, setKo] = useState(vocab.ko)
  /* Muss mitgefuehrt werden, sonst wuerde Speichern die Wortart loeschen */
  const [pos, setPos] = useState(vocab.pos || '')
  const [error, setError] = useState('')

  function startEdit() {
    setEn(vocab.en)
    setKo(vocab.ko)
    setPos(vocab.pos || '')
    setError('')
    setMode('edit')
  }

  function save(e) {
    e.preventDefault()
    const res = onEdit(vocab.id, en, ko, pos)
    if (res.error) {
      setError(res.error === 'duplicate' ? t.duplicate(res.word) : t[res.error])
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
            lang={profile.targetLang}
            placeholder={profile.targetName}
            autoComplete="off"
          />
          <input
            className="edit-input"
            value={en}
            onChange={(e) => setEn(e.target.value)}
            placeholder={profile.knownName}
            autoComplete="off"
          />
          <div className="pos-row">
          {POS_KEYS.map((k) => (
            <button
              type="button"
              key={k}
              className={pos === k ? 'pos-pick pos-pick-on' : 'pos-pick'}
              onClick={() => setPos(pos === k ? '' : k)}
            >
              {t.pos[k]}
            </button>
          ))}
        </div>

        {error && <p className="add-msg add-error">{error}</p>}
          <div className="edit-actions">
            <button type="button" className="edit-cancel" onClick={() => setMode('view')}>
              {t.cancel}
            </button>
            <button type="submit" className="edit-save">
              {t.save}
            </button>
          </div>
        </form>
      </li>
    )
  }

  if (mode === 'confirmDelete') {
    return (
      <li className="vocab-row vocab-row-confirm">
        <span className="confirm-text">{t.deleteWord(vocab.ko)}</span>
        <div className="confirm-actions">
          <button className="edit-cancel" onClick={() => setMode('view')}>
            {t.no}
          </button>
          <button className="confirm-delete" onClick={() => onDelete(vocab.id)}>
            {t.delete}
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="vocab-row">
      <div className="vocab-texts">
        <span className="vocab-ko" lang={profile.targetLang}>
          {vocab.ko}
          <PosTag pos={vocab.pos} t={t} />
        </span>
        <span className="vocab-en">{vocab.en}</span>
      </div>
      <div className="row-actions">
        <button className="row-btn" onClick={startEdit} aria-label={t.edit}>
          <EditIcon />
        </button>
        <button
          className="row-btn row-btn-danger"
          onClick={() => setMode('confirmDelete')}
          aria-label={t.delete}
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  )
}

export default Library
