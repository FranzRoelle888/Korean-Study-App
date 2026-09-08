import { useState } from 'react'
import ClearableInput from '../../shared/ClearableInput'
import { nutzbareGrammatik, zufallsSzenen, zufallsWoerter } from '../../core/satzChallenge'
import { trainerSatzChallengeErzeugen, trainerSatzChallengeBewerten } from './trainerApi'

/* ============================================================
   ÜBERSETZUNGSSPIEL (Trainer, Franz 07.09.)

   Vorab wählen: 3 / 5 / 10 Sätze, leicht / mittel / schwer, dazu ein
   freier Wunsch („mit Vergangenheit", „Essen"). Dann erzeugt der
   Trainer deutsche Sätze AUSSCHLIESSLICH aus den Bibliothekswörtern
   und den abgehakten Grammatikpunkten — ohne Glossen, nur der Satz.
   Franz übersetzt alle, „Bewerten" prüft tolerant: grün / gelb / rot,
   Korrektur mit Übersetzung, ein Satz Begründung, Fazit.
   Nichts wird gespeichert außer dem Journal-Eintrag der Bewertung.
   ============================================================ */

const ANZAHLEN = [3, 5, 10]
const STUFEN = ['leicht', 'mittel', 'schwer']

function UebersetzenSpiel({ profile, words, onExit, t }) {
  const [anzahl, setAnzahl] = useState(5)
  const [stufe, setStufe] = useState('mittel')
  const [wunsch, setWunsch] = useState('')
  const [phase, setPhase] = useState('setup') /* setup | laedt | antworten | bewertet */
  const [saetze, setSaetze] = useState([])
  const [antworten, setAntworten] = useState([])
  const [bewertung, setBewertung] = useState(null)
  const [fehler, setFehler] = useState('')
  const [laedtBewertung, setLaedtBewertung] = useState(false)

  async function starten() {
    setPhase('laedt')
    setFehler('')
    try {
      const grammatik = await nutzbareGrammatik(profile.id)
      const woerter = words.map((w) => ({ ko: w.ko, en: w.en }))
      /* Safari kappt eine Anfrage nach ~60 s. Zehn schwere Saetze in
         EINEM Aufruf dauerten laenger — deshalb in Haelften parallel
         (Franz 07.09.). Doppelte Saetze werden danach aussortiert. */
      const teile = anzahl > 5 ? [Math.ceil(anzahl / 2), Math.floor(anzahl / 2)] : [anzahl]
      /* Jede Haelfte bekommt EIGENE Schauplaetze und Fokus-Woerter —
         sonst schreiben beide Aufrufe dieselben Saetze (Franz 08.09.) */
      const antwortenTeile = await Promise.all(
        teile.map((n) =>
          trainerSatzChallengeErzeugen({
            profile: profile.id,
            woerter,
            grammatik,
            vermeiden: { woerter: [], grammatik: [] },
            anzahl: n,
            schwierigkeit: stufe,
            wunsch: wunsch.trim(),
            szenen: zufallsSzenen(n + 2),
            fokus: zufallsWoerter(words),
          })
        )
      )
      const gesehen = new Set()
      const alle = []
      let verworfen = 0
      for (const res of antwortenTeile) {
        verworfen += (res?.verworfen || []).length
        if (!(res?.saetze || []).length) {
          console.warn('Uebersetzungsspiel leer:', res?.grund || 'unbekannt', (res?.verworfen || []).slice(0, 3))
        }
        for (const s of res?.saetze || []) {
          if (gesehen.has(s.de)) continue
          gesehen.add(s.de)
          alle.push(s)
        }
      }
      const liste = alle.slice(0, anzahl).map((s, i) => ({ nr: i + 1, ...s }))
      if (!liste.length) throw new Error(verworfen ? 'verworfen' : 'leer')
      setSaetze(liste)
      setAntworten(liste.map(() => ''))
      setBewertung(null)
      setPhase('antworten')
    } catch (e) {
      setFehler(
        e && e.message === 'rate-limit' ? t.challengeLimit : e && e.message === 'verworfen' ? t.spielVerworfen : t.spielFehler
      )
      setPhase('setup')
    }
  }

  async function bewerten() {
    if (laedtBewertung) return
    setLaedtBewertung(true)
    setFehler('')
    try {
      const paare = saetze.map((s, i) => ({ nr: s.nr, de: s.de, muster: s.ko, antwort: antworten[i] || '' }))
      const res = await trainerSatzChallengeBewerten({ profile: profile.id, paare })
      setBewertung({ ergebnisse: res.ergebnisse || [], fazit: res.fazit || '' })
      setPhase('bewertet')
    } catch (e) {
      setFehler(e && e.message === 'rate-limit' ? t.challengeLimit : t.challengeOffline)
    } finally {
      setLaedtBewertung(false)
    }
  }

  const alleBeantwortet = antworten.length === saetze.length && antworten.every((a) => a.trim())
  const urteilVon = (nr) => bewertung?.ergebnisse?.find((e) => e.nr === nr)
  /* Bei Franz: deutsche Aufgabe -> koreanische Antwort. Bei 해인 umgekehrt. */
  const aufgabeLang = profile.knownLang
  const antwortLang = profile.targetLang

  return (
    <div className="number tc">
      <div className="review-header">
        <button className="back-btn" onClick={onExit} aria-label={t.back}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <span className="daily-label">🔁 {t.modeUebersetzen}</span>
      </div>

      <div className="number-body tc-body">
        {phase === 'setup' && (
          <section className="tc-teil us-setup">
            <p className="tc-hinweis">{t.spielHinweis}</p>
            <div className="us-gruppe">
              <span className="us-label">{t.spielAnzahl}</span>
              <div className="us-chips">
                {ANZAHLEN.map((n) => (
                  <button key={n} className={n === anzahl ? 'us-chip us-chip-an' : 'us-chip'} onClick={() => setAnzahl(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="us-gruppe">
              <span className="us-label">{t.spielStufe}</span>
              <div className="us-chips">
                {STUFEN.map((s) => (
                  <button key={s} className={s === stufe ? 'us-chip us-chip-an' : 'us-chip'} onClick={() => setStufe(s)}>
                    {t.spielStufen[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="us-gruppe">
              <span className="us-label">{t.spielWunsch}</span>
              <ClearableInput
                value={wunsch}
                onChange={(e) => setWunsch(e.target.value)}
                onClear={() => setWunsch('')}
                placeholder={t.spielWunschPlatzhalter}
                autoComplete="off"
                maxLength={200}
              />
            </div>
            {fehler && <p className="add-msg add-error">{fehler}</p>}
            <button className="check-btn" onClick={starten}>
              {t.spielStart}
            </button>
          </section>
        )}

        {phase === 'laedt' && <p className="tc-hinweis us-laedt">{t.spielLaedt}</p>}

        {(phase === 'antworten' || phase === 'bewertet') && (
          <section className="tc-teil">
            <ol className="tc-liste">
              {saetze.map((s, i) => {
                const u = urteilVon(s.nr)
                return (
                  <li key={s.nr} className={'tc-satz' + (u ? ` tc-${u.urteil}` : '')}>
                    <span className="tc-satz-nr">{s.nr}</span>
                    <div className="tc-satz-inhalt">
                      <p className="tc-de" lang={aufgabeLang}>
                        {s.de}
                      </p>
                      {phase === 'bewertet' ? (
                        <>
                          <p className="tc-antwort" lang={antwortLang}>
                            {antworten[i] || '—'}
                          </p>
                          {u && u.urteil !== 'gruen' && (
                            <p className="tc-korrektur" lang={antwortLang}>
                              {u.korrektur}
                            </p>
                          )}
                          {u && u.hinweis && <p className="tc-hinweis-satz">{u.hinweis}</p>}
                        </>
                      ) : (
                        <textarea
                          className="tc-feld"
                          lang={antwortLang}
                          rows={2}
                          value={antworten[i] || ''}
                          placeholder={t.satzPlatzhalter}
                          onChange={(e) => {
                            const next = [...antworten]
                            next[i] = e.target.value
                            setAntworten(next)
                          }}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
            {phase === 'bewertet' && bewertung?.fazit && <p className="tc-fazit">{bewertung.fazit}</p>}
            {fehler && <p className="add-msg add-error">{fehler}</p>}
            {phase === 'antworten' && (
              <button className="check-btn tc-bewerten" onClick={bewerten} disabled={!alleBeantwortet || laedtBewertung}>
                {laedtBewertung ? t.challengeBewertet : t.challengeBewerten}
              </button>
            )}
            {phase === 'bewertet' && (
              <button className="check-btn" onClick={() => setPhase('setup')}>
                {t.spielNeueRunde}
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default UebersetzenSpiel
