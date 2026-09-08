import { useEffect, useState } from 'react'
import { ladeTagesChallenge, sichereTagesChallenge } from '../../core/satzChallenge'
import { trainerSatzChallengeBewerten } from '../trainer/trainerApi'

/* ============================================================
   SATZ-TEIL der Tages-Challenge (beide Seiten, 07./08.09.)

   Fünf Sätze in der Sprache, die man KANN; man schreibt sie in der
   Sprache, die man LERNT. Gebaut nur aus den eigenen Bibliotheks-
   wörtern und der eigenen Grammatik. „Bewerten" schickt alle fünf
   auf einmal: grün / gelb / rot, Korrektur, ein Satz Begründung.

   Abschicken zählt sofort als erledigt — auch wenn die Bewertung am
   Netz scheitert. Gibt es keine Sätze, meldet die Komponente das
   nach oben (onKeineSaetze), damit der Tag trotzdem zugeht.
   ============================================================ */

function SatzTeil({ profile, words, onFertig, onKeineSaetze, t }) {
  const [ch, setCh] = useState(undefined) /* undefined = lädt, null = keine */
  const [antworten, setAntworten] = useState([])
  const [bewertet, setBewertet] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    let weg = false
    ladeTagesChallenge(words).then((d) => {
      if (weg) return
      setCh(d)
      if (d) {
        setAntworten(d.saetze.map((s, i) => d.antworten?.[i] ?? ''))
        setBewertet(!!d.bewertung)
      } else if (onKeineSaetze) {
        onKeineSaetze()
      }
    })
    return () => {
      weg = true
    }
  }, [profile.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const alleBeantwortet = ch && antworten.length === ch.saetze.length && antworten.every((a) => a.trim())

  async function bewerten() {
    if (!ch || laedt) return
    setLaedt(true)
    setFehler('')
    const paare = ch.saetze.map((s, i) => ({ nr: s.nr, de: s.de, muster: s.ko, antwort: antworten[i] || '' }))
    const naechst = { ...ch, antworten, fertig: true }
    if (!ch.fertig && onFertig) onFertig()
    try {
      const res = await trainerSatzChallengeBewerten({ profile: profile.id, paare })
      naechst.bewertung = { ergebnisse: res.ergebnisse || [], fazit: res.fazit || '' }
      setBewertet(true)
    } catch (e) {
      setFehler(e && e.message === 'rate-limit' ? t.challengeLimit : t.challengeOffline)
    } finally {
      setCh(naechst)
      sichereTagesChallenge(naechst)
      setLaedt(false)
    }
  }

  if (ch === undefined) return <p className="tc-hinweis">{t.loading}</p>
  if (ch === null) return <p className="tc-hinweis">{t.challengeKeineSaetze}</p>

  const urteilVon = (nr) => ch.bewertung?.ergebnisse?.find((e) => e.nr === nr)
  /* Die Aufgabe steht in der bekannten Sprache, die Antwort in der
     Zielsprache — bei Franz Deutsch -> Koreanisch, bei 해인 umgekehrt. */
  const aufgabeLang = profile.knownLang
  const antwortLang = profile.targetLang

  return (
    <>
      <p className="tc-hinweis">{t.challengeHinweis}</p>
      <ol className="tc-liste">
        {ch.saetze.map((s, i) => {
          const u = urteilVon(s.nr)
          return (
            <li key={s.nr} className={'tc-satz' + (u ? ` tc-${u.urteil}` : '')}>
              <span className="tc-satz-nr">{s.nr}</span>
              <div className="tc-satz-inhalt">
                <p className="tc-de" lang={aufgabeLang}>
                  {s.de}
                </p>
                {bewertet ? (
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
      {bewertet && ch.bewertung?.fazit && <p className="tc-fazit">{ch.bewertung.fazit}</p>}
      {fehler && <p className="add-msg add-error">{fehler}</p>}
      {!bewertet && (
        <button className="check-btn tc-bewerten" onClick={bewerten} disabled={!alleBeantwortet || laedt}>
          {laedt ? t.challengeBewertet : ch.fertig ? t.challengeSpaeterBewerten : t.challengeBewerten}
        </button>
      )}
    </>
  )
}

export default SatzTeil
