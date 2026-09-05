import { useState, useEffect } from 'react'
import { jamoDiff } from '../core/hangul'
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

/* Drei Punkte je Wort: Erkennen · Produktion · Hören */
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
