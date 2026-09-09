import { useState, useEffect } from 'react'
import { jamoDiff } from '../core/hangul'
import { wortDiff } from '../core/vergleich'
import { bedeutung } from '../core/motor'

/* ============================================================
   BAUSTEINE DES VOKABEL-MOTORS (Franz' Seite)
   Konzept docs/VOKABEL-KONZEPT.md §4/§7

   HanjaZeile     Chips je sino-koreanischer Silbe (水 수); Antippen
                  öffnet eine Blase mit der Zeichenbedeutung
   Bedeutung      `water (Wasser·)` — der Punkt markiert eine Nuance
                  und öffnet sie per Tipp als Sprechblase
   JamoVergleich  Eingabe neben Lösung, Abweichungen bausteinweise
   StufenPunkte   Erkennen · Produktion · Hören (leer/aktiv/fest)

   Alles rein darstellend, keine Speicherzugriffe. Blasen schließen
   sich beim nächsten Tipp irgendwohin (Klick auf das Dokument).
   ============================================================ */

/* Eine Blase, die sich bei jedem Klick außerhalb wieder schließt */
function Blase({ text, onClose }) {
  useEffect(() => {
    const zu = () => onClose()
    /* erst NACH dem öffnenden Tipp lauschen */
    const id = setTimeout(() => document.addEventListener('pointerdown', zu), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('pointerdown', zu)
    }
  }, [onClose])
  return (
    <span className="blase" role="tooltip" onPointerDown={(e) => e.stopPropagation()}>
      {text}
    </span>
  )
}

export function HanjaZeile({ hanja, ko, className = '' }) {
  const [offen, setOffen] = useState(null)
  if (!Array.isArray(hanja) || !hanja.length) return null
  /* Chips in Wortreihenfolge; native Silben ohne Chip, damit die
     Zeile zum Wort passt (강하다 -> [强 강] 하다) */
  const silben = [...String(ko || '')]
  const anIndex = new Map(hanja.map((h) => [h.i, h]))
  return (
    <span className={`hanja-zeile ${className}`.trim()} lang="ko">
      {silben.map((s, i) => {
        const h = anIndex.get(i)
        if (!h) {
          return (
            <span key={i} className="hanja-nativ">
              {s}
            </span>
          )
        }
        return (
          <span key={i} className="hanja-chip-wrap">
            <button
              type="button"
              className={offen === i ? 'hanja-chip hanja-chip-an' : 'hanja-chip'}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setOffen(offen === i ? null : i)}
              aria-label={`${h.les}: ${h.de}`}
            >
              {/* Nur die koreanische Silbe (Franz 06.09.: chinesische
                  Zeichen braucht er nie) — die Bedeutung per Tipp */}
              <span className="hanja-lesung">{h.les}</span>
            </button>
            {offen === i && <Blase text={h.de} onClose={() => setOffen(null)} />}
          </span>
        )
      })}
    </span>
  )
}

/* `water (Wasser·)` — Englisch Hauptanker, Deutsch in Klammern,
   Punkt nur bei vorhandener Nuance */
export function Bedeutung({ word, className = '', lang = 'en' }) {
  const [offen, setOffen] = useState(false)
  if (!word) return null
  const text = bedeutung(word)
  if (!word.nuance) {
    return (
      <span className={`bedeutung ${className}`.trim()} lang={lang}>
        {text}
      </span>
    )
  }
  return (
    <span className={`bedeutung bedeutung-nuance ${className}`.trim()} lang={lang}>
      <button
        type="button"
        className="nuance-knopf"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOffen((o) => !o)}
        aria-label={word.nuance}
      >
        {text}
        <span className="nuance-punkt" aria-hidden="true" />
      </button>
      {offen && <Blase text={word.nuance} onClose={() => setOffen(false)} />}
    </span>
  )
}

/* Eingabe neben Lösung, Silbe für Silbe; falsche Silben rot, darunter
   die drei Bausteine der falschen Silbe mit Pfeil (ㅇ → ㄱ) */
export function JamoVergleich({ eingabe, richtig, t }) {
  const silben = jamoDiff(eingabe, richtig)
  const falsche = silben.filter((s) => !s.ok && s.jamo)
  return (
    <div className="jamo-vergleich" lang="ko">
      <div className="jamo-zeile">
        <span className="jamo-label">{t.deinWort}</span>
        <span className="jamo-wort">
          {silben.map((s, i) => (
            <span key={i} className={s.ok ? 'jamo-silbe' : 'jamo-silbe jamo-falsch'}>
              {s.ist || '·'}
            </span>
          ))}
        </span>
      </div>
      <div className="jamo-zeile">
        <span className="jamo-label">{t.richtigWort}</span>
        <span className="jamo-wort">
          {silben.map((s, i) => (
            <span key={i} className={s.ok ? 'jamo-silbe' : 'jamo-silbe jamo-soll'}>
              {s.soll || '·'}
            </span>
          ))}
        </span>
      </div>
      {falsche.length > 0 && (
        <div className="jamo-details">
          {falsche.map((s, i) => (
            <span key={i} className="jamo-detail">
              <b>{s.ist}</b>
              {' → '}
              <b>{s.soll}</b>
              <span className="jamo-teile">
                {s.jamo
                  .filter((j) => !j.ok)
                  .map((j, k) => (
                    <span key={k} className="jamo-teil">
                      {j.ist || '∅'} → {j.soll || '∅'}
                    </span>
                  ))}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Deutsch (해인): Plural neben dem Nomen, Verb-Chip ----------
   Statt Hanja: beim Nomen die volle Pluralform (`die Tische`), beim
   Verb ein Chip „trennbar" oder „unregelmäßig", wenn die Konjugation
   das verrät (rufe an / fährst). Nichts davon wird abgefragt. */
export function DeutschZeile({ word, className = '' }) {
  if (!word) return null
  if (word.pos === 'noun' && word.plural) {
    return (
      <span className={`de-zeile ${className}`.trim()} lang="de">
        <span className="de-plural">{word.plural}</span>
      </span>
    )
  }
  if (word.pos === 'verb') {
    /* conj = Nachtlauf-Objekt (ich/du/er…), konj = Kurzform aus der
       Goethe-Liste ("ruft an") bei Vorratswörtern im Ritual */
    const konj = word.conj || word.konj
    const formen = konj && typeof konj === 'object' ? Object.values(konj) : typeof konj === 'string' ? [konj] : []
    const trennbar = formen.some((f) => /\s/.test(String(f)))
    const grund = String(word.ko || '').toLowerCase().replace(/e?n$/, '')
    const er = typeof konj === 'string' ? konj : konj && typeof konj === 'object' ? String(konj.er || '') : ''
    const unregel = !!er && !er.toLowerCase().replace(/\s.*$/, '').startsWith(grund.slice(0, Math.max(2, grund.length - 1)))
    if (!trennbar && !unregel) return null
    return (
      <span className={`de-zeile ${className}`.trim()} lang="de">
        {trennbar && <span className="de-chip">trennbar</span>}
        {unregel && <span className="de-chip">unregelmäßig</span>}
        {er && <span className="de-form">er {er}</span>}
      </span>
    )
  }
  return null
}

/* Eingabe gegen Lösung, sprachabhängig: Koreanisch als Jamo-Vergleich,
   Deutsch Buchstabe für Buchstabe mit getrennt bewertetem Artikel */
export function WortVergleich({ eingabe, richtig, lang, t }) {
  if (lang !== 'de') return <JamoVergleich eingabe={eingabe} richtig={richtig} t={t} />
  const { teile, artikel } = wortDiff(eingabe, richtig, 'de')
  const zeile = (label, wert, klasse) => (
    <div className="jamo-zeile">
      <span className="jamo-label">{label}</span>
      <span className="jamo-wort jamo-wort-de">
        {artikel && (
          <span className={'jamo-silbe' + (artikel.ok ? '' : klasse === 'ist' ? ' jamo-falsch' : ' jamo-soll')}>
            {(klasse === 'ist' ? artikel.ist : artikel.soll) || '·'}&nbsp;
          </span>
        )}
        {teile.map((s, i) => (
          <span key={i} className={'jamo-silbe' + (s.ok ? '' : klasse === 'ist' ? ' jamo-falsch' : ' jamo-soll')}>
            {(klasse === 'ist' ? s.ist : s.soll) || '·'}
          </span>
        ))}
      </span>
    </div>
  )
  return (
    <div className="jamo-vergleich" lang="de">
      {zeile(t.deinWort, eingabe, 'ist')}
      {zeile(t.richtigWort, richtig, 'soll')}
      {artikel && !artikel.ok && <div className="jamo-details">{t.artikelFalsch}</div>}
    </div>
  )
}

/* Drei Punkte je Wort: Erkennen · Produktion · Hören */
/* ---------- Vokabel-Qualität (Franz 09.09.) ----------
   InfoText   „Gut zu wissen": 2-5 Zeilen, jede beginnt mit einem
              fetten Stichwort (**Gebrauch:** …) — ausklappbar, damit
              die Karte kompakt bleibt (Motto: das Auge isst mit)
   ZaehlChip  kleiner Chip „Zählwort" mit Zahlensystem als Titel */
function infoZeilen(info) {
  return String(info || '')
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z) => {
      const m = z.match(/^\*\*([^*]+?):?\*\*:?\s*(.*)$/)
      return m ? { kopf: m[1].trim(), rest: m[2] } : { kopf: '', rest: z }
    })
}
export function InfoText({ info, t, offen = false, className = '' }) {
  if (!info) return null
  const zeilen = infoZeilen(info)
  if (!zeilen.length) return null
  return (
    <details className={`info-text ${className}`.trim()} open={offen || undefined} onPointerDown={(e) => e.stopPropagation()}>
      <summary>{t.infoLabel}</summary>
      <ul>
        {zeilen.map((z, i) => (
          <li key={i}>
            {z.kopf && <b>{z.kopf}: </b>}
            {z.rest}
          </li>
        ))}
      </ul>
    </details>
  )
}
export function ZaehlChip({ word, t, className = '' }) {
  if (!word?.zaehlwort) return null
  const system = word.zahlsystem && t.zahlsystem ? t.zahlsystem[word.zahlsystem] : ''
  return (
    <span className={`zaehl-chip ${className}`.trim()} title={system || undefined}>
      {t.zaehlwortChip}
      {system ? ` · ${system}` : ''}
    </span>
  )
}

export function StufenPunkte({ stufe, t }) {
  const s = stufe || { erkennen: 0, produktion: 0, hoeren: 0 }
  const punkt = (wert, label) => (
    <span
      className={'stufe-punkt' + (wert === 2 ? ' stufe-fest' : wert === 1 ? ' stufe-aktiv' : '')}
      title={label}
      aria-label={label}
    />
  )
  return (
    <span className="stufen-punkte">
      {punkt(s.erkennen, t.stufeErkennen)}
      {punkt(s.produktion, t.stufeProduktion)}
      {punkt(s.hoeren, t.stufeHoeren)}
    </span>
  )
}
