import { useState } from 'react'
import { PlusIcon, SearchIcon } from './icons'

/* ============================================================
   BIBLIOTHEK
   - oben ein Formular zum Hinzufügen (Englisch + Koreanisch)
   - darunter eine durchsuchbare Liste aller Vokabeln
   Das eigentliche Speichern passiert über "onAdd", das von App
   hereingereicht wird (siehe App.jsx + storage.js).
   ============================================================ */

function Library({ vocab, onAdd }) {
  // Zustände der Eingabefelder + Rückmeldungen
  const [en, setEn] = useState('')
  const [ko, setKo] = useState('')
  const [error, setError] = useState('')
  const [justAdded, setJustAdded] = useState('')
  const [query, setQuery] = useState('') // Suchtext

  function handleSubmit(e) {
    e.preventDefault() // verhindert das Neuladen der Seite
    const result = onAdd(en, ko)
    if (result.error) {
      setError(result.error)
      setJustAdded('')
      return
    }
    // Erfolg: Felder leeren, kurze Bestätigung zeigen
    setJustAdded(`„${result.word.ko}" hinzugefügt ✓`)
    setError('')
    setEn('')
    setKo('')
  }

  // Liste nach Suchtext filtern (Englisch ODER Koreanisch)
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
          <li key={v.id} className="vocab-row">
            <span className="vocab-ko" lang="ko">
              {v.ko}
            </span>
            <span className="vocab-en">{v.en}</span>
          </li>
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

export default Library
