import { useEffect, useRef, useState } from 'react'
import { AufnahmeKnopf } from './aufnahme'

/* ============================================================
   SPRACH-ANTWORT (Übersetzungsspiel, Franz 08.09.)

   Antworten wie eine Sprachnachricht: einmal tippen und sprechen,
   noch einmal tippen und fertig. Danach steht eine Abspiel-Leiste
   da — anhören, so oft man will, oder neu aufnehmen, wenn man sich
   verhaspelt hat.

   Die Aufnahme wird wortgetreu transkribiert (die speech-Function
   weist das Modell ausdrücklich an, NICHTS zu glätten). Der erkannte
   Text steht unter der Leiste und geht genau so in die Bewertung —
   nur dann sind eigene Fehler sichtbar und korrigierbar.
   ============================================================ */

function AbspielLeiste({ url, dauer, t }) {
  const audio = useRef(null)
  const [laeuft, setLaeuft] = useState(false)
  const [stand, setStand] = useState(0)

  useEffect(() => {
    const a = audio.current
    if (!a) return
    const tick = () => setStand(a.currentTime)
    const aus = () => {
      setLaeuft(false)
      setStand(0)
    }
    a.addEventListener('timeupdate', tick)
    a.addEventListener('ended', aus)
    return () => {
      a.removeEventListener('timeupdate', tick)
      a.removeEventListener('ended', aus)
    }
  }, [url])

  function umschalten() {
    const a = audio.current
    if (!a) return
    if (laeuft) {
      a.pause()
      setLaeuft(false)
    } else {
      a.play().then(
        () => setLaeuft(true),
        () => setLaeuft(false)
      )
    }
  }

  const gesamt = Math.max(1, dauer || 1)
  const anteil = Math.min(1, stand / gesamt)
  const sek = Math.round(laeuft || stand ? gesamt - stand : gesamt)

  return (
    <div className="sn-leiste">
      <button type="button" className="sn-play" onClick={umschalten} aria-label={t.audioAbspielen}>
        {laeuft ? '❚❚' : '▶'}
      </button>
      <span className="sn-balken">
        <span className="sn-fortschritt" style={{ transform: `scaleX(${anteil})` }} />
      </span>
      <span className="sn-zeit">{Math.max(0, sek)}s</span>
      <audio ref={audio} src={url} preload="metadata" />
    </div>
  )
}

/* wert = erkannter Text, audio = { url, dauer } | null */
function Sprachantwort({ profile, lang, wert, audio, onFertig, t, nurAnhoeren }) {
  const [fehler, setFehler] = useState('')

  /* In der bewerteten Ansicht steht der erkannte Text schon oben —
     dort bleibt nur die Abspiel-Leiste */
  if (audio && nurAnhoeren) {
    return (
      <div className="sn sn-klein">
        <AbspielLeiste url={audio.url} dauer={audio.dauer} t={t} />
      </div>
    )
  }

  if (audio) {
    return (
      <div className="sn">
        <AbspielLeiste url={audio.url} dauer={audio.dauer} t={t} />
        <p className="sn-erkannt" lang={lang}>
          <span className="sn-label">{t.audioErkannt}</span> {wert || '—'}
        </p>
        <button type="button" className="sn-neu" onClick={() => onFertig(null)}>
          🎙 {t.audioNeu}
        </button>
      </div>
    )
  }

  return (
    <div className="sn">
      <AufnahmeKnopf
        profile={profile}
        lang={lang}
        maxSek={60}
        texte={{
          bereit: t.audioAufnehmen,
          laeuft: (s) => `● ${s}s — ${t.audioStopp}`,
          denkt: t.audioDenkt,
        }}
        onFertig={({ text, audioUrl, dauer }) => {
          setFehler('')
          onFertig({ text: (text || '').trim(), url: audioUrl, dauer })
        }}
        onFehler={(art) =>
          setFehler(art === 'mikro' ? t.audioFehlerMikro : art === 'limit' ? t.challengeLimit : t.audioFehlerNetz)
        }
      />
      {fehler && <p className="add-msg add-error">{fehler}</p>}
    </div>
  )
}

export default Sprachantwort
