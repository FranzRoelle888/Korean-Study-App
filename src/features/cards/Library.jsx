import { useState, useEffect, useRef } from 'react'
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, InfoIcon } from '../../shared/icons'
import ClearableInput from '../../shared/ClearableInput'
import { SpeakButton, prewarmSpeech } from '../../shared/tts'
import { trainerUebersetzung } from '../trainer/trainerApi'

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

/* Zusatzinfos zu einem Wort: Pluralform bzw. Konjugation.
   Wird unter der Zeile aufgeklappt, wenn man das i antippt. */
function WordExtras({ vocab, t, lang }) {
  const hatPlural = vocab.plural || vocab.pluralNote
  const hatKonj = vocab.conj && Object.keys(vocab.conj).length > 0
  const hatSatz = !!vocab.ex

  /* Sobald das Info-Feld aufklappt, den Beispielsatz im
     Hintergrund vorwärmen — beim Tipp aufs Lautsprecher-Symbol
     ist die Stimme dann schon da. */
  useEffect(() => {
    if (vocab.ex) prewarmSpeech(vocab.ex, lang)
  }, [vocab.id])

  if (!hatPlural && !hatKonj && !hatSatz) {
    return <div className="extras"><p className="extras-empty">{t.noExtras}</p></div>
  }
  return (
    <div className="extras">
      {hatPlural && (
        <div className="extras-block">
          <span className="extras-label">{t.pluralLabel}</span>
          {vocab.plural && <span className="extras-plural" lang="de">{vocab.plural}</span>}
          {vocab.pluralNote && <span className="extras-note">{vocab.pluralNote}</span>}
        </div>
      )}
      {hatKonj && (
        <div className="extras-block">
          <span className="extras-label">{t.conjLabel}</span>
          <div className="conj-grid">
            {['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie'].map((p) => {
              const k = p === 'er/sie/es' ? 'er' : p
              return (
                <div className="conj-row" key={p}>
                  <span className="conj-person">{p}</span>
                  <span className="conj-form" lang="de">{vocab.conj[k] || '—'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {hatSatz && (
        <div className="extras-block">
          <span className="extras-label">{t.exampleLabel}</span>
          <span className="extras-plural" lang={lang}>
            {vocab.ex}
            <SpeakButton text={vocab.ex} lang={lang} className="speak-inline" />
          </span>
          {vocab.exTr && <span className="extras-note">{vocab.exTr}</span>}
        </div>
      )}
      {vocab.extrasAuto && <p className="extras-auto">{t.autoFilled}</p>}
    </div>
  )
}

/* ============================================================
   BACKUP ALS CSV

   Der gesamte Lernstand haengt an einer Datenbank ohne eigene
   Sicherung. Der Export ist die billigste Versicherung: eine
   Zeile pro Karte, mit Wort, Zusatzinfos und Lernstand.
   BOM vorweg, damit Excel Umlaute und Hangul richtig liest.
   ============================================================ */
function exportCsv(vocab, cards, profileId) {
  const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
  const kopf = [
    'wort', 'bedeutung', 'wortart', 'plural', 'konjugation', 'beispiel',
    'kartentyp', 'faellig', 'ease', 'intervall_tage', 'wiederholungen', 'ausrutscher',
  ]
  const byWord = {}
  cards.forEach((c) => {
    ;(byWord[c.wordId] = byWord[c.wordId] || []).push(c)
  })
  const zeilen = [kopf.join(',')]
  vocab.forEach((w) => {
    const eigene = byWord[w.id] || [{}]
    eigene.forEach((c) => {
      zeilen.push(
        [
          q(w.ko), q(w.en), q(w.pos), q(w.plural),
          q(w.conj ? JSON.stringify(w.conj) : ''), q(w.ex),
          q(c.front), q(c.due), q(c.ease), q(c.intervalDays), q(c.reps), q(c.lapses),
        ].join(',')
      )
    })
  })
  const blob = new Blob(['\uFEFF' + zeilen.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vokabel-backup-' + profileId + '-' + new Date().toISOString().slice(0, 10) + '.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function Library({ vocab, cards, onAdd, onEdit, onDelete, trickyIds, profile, t, tt }) {
  const [en, setEn] = useState('')
  const [ko, setKo] = useState('')
  const [error, setError] = useState('')
  const [justAdded, setJustAdded] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest') // 'newest' | 'alpha'
  const [pos, setPos] = useState('') // Wortart des neuen Wortes
  const [posFilter, setPosFilter] = useState('') // '' = alle
  const [trickyOnly, setTrickyOnly] = useState(false)

  /* Wortart-Filter nur zeigen, wenn Wortarten hinterlegt sind */
  const hasPos = vocab.some((v) => v.pos)
  const hasTricky = !!trickyIds && trickyIds.size > 0

  /* ---------- Bedeutungs-Vorschlag (Wunsch 해인, 31.08.) ----------
     Sobald im Zielsprachen-Feld getippt wurde und das Bedeutungs-
     Feld noch leer ist: nach 1 s Tipp-Pause im Hintergrund einen
     Vorschlag holen. Übernehmen per ✓ ist freiwillig — selbst
     tippen geht jederzeit (dann verschwindet der Vorschlag).
     Der Zähl-Trick (Ref) verwirft verspätete Antworten, wenn
     inzwischen weitergetippt wurde. */
  const [vorschlag, setVorschlag] = useState(null) /* null | 'laedt' | string */
  const vorschlagNr = useRef(0)
  useEffect(() => {
    const wort = ko.trim()
    vorschlagNr.current++
    const nr = vorschlagNr.current
    /* Koreanisch hat viele Einsilber (물, 밥, 집 …) — dort reicht
       EIN Zeichen. Nur auf der deutschen Seite wären einzelne
       Buchstaben Rauschen. (Bug-Meldung Franz: 물 kam nie.) */
    const mindestens = profile.id === 'ko' ? 1 : 2
    if (wort.length < mindestens || en.trim()) {
      setVorschlag(null)
      return
    }
    setVorschlag(null)
    const timer = setTimeout(async () => {
      if (vorschlagNr.current !== nr) return
      setVorschlag('laedt')
      try {
        const res = await trainerUebersetzung({ profile: profile.id, wort })
        if (vorschlagNr.current !== nr) return
        setVorschlag(res.vorschlag ? res.vorschlag : null)
      } catch {
        if (vorschlagNr.current === nr) setVorschlag(null)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [ko, en, profile.id])

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
  const byTricky = trickyOnly && trickyIds ? vocab.filter((v) => trickyIds.has(v.id)) : vocab
  const byPos = posFilter ? byTricky.filter((v) => v.pos === posFilter) : byTricky
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

      {/* ---------- Add ----------
          Zielsprache OBEN, Muttersprache unten (Wunsch Franz
          31.08.) — man traegt zuerst das fremde Wort ein, und der
          Bedeutungs-Vorschlag erscheint direkt unter dem Feld,
          in das er gehoert. */}
      <form className="add-card" onSubmit={handleSubmit}>
        <label className="field">
          <span>{profile.targetName}</span>
          <ClearableInput
            value={ko}
            onChange={(e) => setKo(e.target.value)}
            onClear={() => setKo('')}
            placeholder={tt.example}
            lang={profile.targetLang}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>{profile.knownName}</span>
          <ClearableInput
            value={en}
            onChange={(e) => setEn(e.target.value)}
            onClear={() => setEn('')}
            placeholder={tt.knownExample}
            autoComplete="off"
          />
        </label>

        {/* Bedeutungs-Vorschlag unter dem Muttersprach-Feld */}
        {vorschlag === 'laedt' ? (
          <p className="lib-vorschlag lib-vorschlag-laedt">
            <span className="lib-kreis" aria-hidden="true" /> {t.libVorschlagLaedt}
          </p>
        ) : vorschlag ? (
          <p className="lib-vorschlag">
            💡 {vorschlag}
            <button
              type="button"
              className="lib-vorschlag-ok"
              onClick={() => {
                setEn(vorschlag)
                setVorschlag(null)
              }}
              aria-label={t.libVorschlagNehmen}
            >
              ✓
            </button>
          </p>
        ) : null}

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
        <ClearableInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
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

      {(hasPos || hasTricky) && (
        <div className="pos-row">
          {hasPos && (
            <button
              className={posFilter === '' ? 'pos-pick pos-pick-on' : 'pos-pick'}
              onClick={() => setPosFilter('')}
            >
              {t.posAll}
            </button>
          )}
          {POS_KEYS.filter((k) => vocab.some((v) => v.pos === k)).map((k) => (
            <button
              key={k}
              className={posFilter === k ? 'pos-pick pos-pick-on' : 'pos-pick'}
              onClick={() => setPosFilter(posFilter === k ? '' : k)}
            >
              {t.pos[k]}
            </button>
          ))}
          {/* Nur zeigen, wenn es ueberhaupt Wackelkandidaten gibt */}
          {trickyIds && trickyIds.size > 0 && (
            <button
              className={trickyOnly ? 'pos-pick pos-pick-tricky-on' : 'pos-pick'}
              onClick={() => setTrickyOnly((v) => !v)}
            >
              ⚠ {t.tricky}
            </button>
          )}
        </div>
      )}

      {/* ---------- List ---------- */}
      <ul className="vocab-list">
        {shown.map((v) => (
          <VocabRow
            key={v.id}
            vocab={v}
            onEdit={onEdit}
            onDelete={onDelete}
            tricky={!!trickyIds && trickyIds.has(v.id)}
            profile={profile}
            t={t}
          />
        ))}
        {shown.length === 0 && (
          <li className="vocab-empty">
            {vocab.length === 0 ? t.noWords : t.nothingFound}
          </li>
        )}
      </ul>

      {vocab.length > 0 && (
        <button className="export-btn" onClick={() => exportCsv(vocab, cards || [], profile.id)}>
          {t.exportCsv}
        </button>
      )}
    </div>
  )
}

function VocabRow({ vocab, onEdit, onDelete, tricky, profile, t }) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'confirmDelete'
  const [en, setEn] = useState(vocab.en)
  const [ko, setKo] = useState(vocab.ko)
  /* Muss mitgefuehrt werden, sonst wuerde Speichern die Wortart loeschen */
  const [pos, setPos] = useState(vocab.pos || '')
  const [zeigeInfo, setZeigeInfo] = useState(false)
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
          <ClearableInput
            className="edit-input"
            value={ko}
            onChange={(e) => setKo(e.target.value)}
            onClear={() => setKo('')}
            lang={profile.targetLang}
            placeholder={profile.targetName}
            autoComplete="off"
          />
          <ClearableInput
            className="edit-input"
            value={en}
            onChange={(e) => setEn(e.target.value)}
            onClear={() => setEn('')}
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

  /* Nur da, wo es ueberhaupt Zusatzinfos geben kann */
  const kannInfo =
    vocab.pos === 'noun' || vocab.pos === 'verb' || !!vocab.ex || !!vocab.plural || !!vocab.conj

  return (
    <li className={zeigeInfo ? 'vocab-row vocab-row-open' : 'vocab-row'}>
      <div className="vocab-texts">
        <span className="vocab-ko" lang={profile.targetLang}>
          {vocab.ko}
          <PosTag pos={vocab.pos} t={t} />
          {tricky && <span className="pos-tag tricky-tag">⚠</span>}
        </span>
        <span className="vocab-en">{vocab.en}</span>
      </div>
      <div className="row-actions">
        <SpeakButton text={vocab.ko} lang={profile.targetLang} className="speak-row" />
        {kannInfo && (
          <button
            className={zeigeInfo ? 'row-btn row-btn-on' : 'row-btn'}
            onClick={() => setZeigeInfo((v) => !v)}
            aria-label={t.info}
          >
            <InfoIcon />
          </button>
        )}
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
      {/* Volle Breite unter der Zeile — in der Textspalte endete die
          Tafel dort, wo die Knopfspalte beginnt */}
      {zeigeInfo && <WordExtras vocab={vocab} t={t} lang={profile.targetLang} />}
    </li>
  )
}

export default Library
