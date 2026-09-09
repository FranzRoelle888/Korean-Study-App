import { useState, useEffect, useRef } from 'react'
import './App.css'
import {
  loadInitial,
  validateNewWord,
  persistNewWord,
  persistCard,
  validateEdit,
  updateWordCloud,
  deleteWordCloud,
  applyRating,
  logReview,
  dueCards,
  dailyStatus,
  makeIntroducedWord,
  countIntroductionToday,
  getNumberChallenge,
  getArticleChallenge,
  queueFailed,
  pendingCount,
  completeArticleChallenge,
  getPluralChallenge,
  completePluralChallenge,
  getConjChallenge,
  completeConjChallenge,
  todaysChallengeKind,
  flipChallengeKind,
  completeNumberChallenge,
  sinoKorean,
  nativeKorean,
  loadDailyLog,
  uebernehmeTagesstand,
  markDayDone,
  computeStreak,
  last7Days,
  loadPartnerLog,
  todayStr,
  writeWordsCache,
  writeCardsCache,
  ergaenzeWortInhalte,
  makeVorratWord,
  markiereVorratEingefuehrt,
  verarbeiteBewertung,
  persistNewCard,
  deleteCardCloud,
  setzeNeuePause,
} from '../core/storage'
import { inventarEintrag } from '../core/inventarBezug'
import { istMotor, trenneBedeutung, gleichbedeutende } from '../core/motor'
import { trainerVokabelAnreichern, trainerVokabelNuancen } from '../features/trainer/trainerApi'
import Einfuehrung from '../features/cards/Einfuehrung'
import { motorInfoSichtbar } from '../features/today/MotorInfo'
import { setzeAppIdentitaet } from '../core/appIdentitaet'
import ReviewMotor from '../features/cards/ReviewMotor'
import './motor.css'
import Home from '../features/today/Home'
import Library from '../features/cards/Library'
import Review from '../features/cards/Review'
import TagesChallenge from '../features/challenges/TagesChallenge'
import TagesChallengeDe from '../features/challenges/TagesChallengeDe'
import ExtraRunde from '../features/challenges/ExtraRunde'
import { completeSatzChallenge, extraRundeErledigt, completeExtraRunde } from '../core/storage'
import { ladeExtraMaterial } from '../core/extraRunde'
import ArticleChallenge from '../features/challenges/ArticleChallenge'
import PluralChallenge from '../features/challenges/PluralChallenge'
import ConjChallenge from '../features/challenges/ConjChallenge'
import Calendar from '../features/today/Calendar'
import Trainer from '../features/trainer/Trainer'
import Sets from '../features/sets/Sets'
import SetSheet from '../features/sets/SetSheet'
import SetSheetDe from '../features/sets/SetSheetDe'
import { HomeIcon, BookIcon, GridIcon, DomIcon, ChatIcon, PersonIcon } from '../shared/icons'
import { PROFILES, readProfile, writeProfile, otherProfile, istNotizbuch } from '../core/profiles'
import { textFor, targetTextFor } from '../shared/i18n'
import { setActiveProfile } from '../core/storage'
import { readSession, onAuthChange } from '../core/auth'
import Login from './Login'
import Kalibrierung from '../features/kalibrierung/Kalibrierung'
import Studio from '../features/ueben/Studio'
import ArtikelSwipe from '../features/ueben/ArtikelSwipe'
import A2Training from '../features/a2/A2Training'
import { kalibrierungErledigt, kalibrierungErledigtDB } from '../core/kalibrierung'
import Profil from '../features/profil/Profil'

function App() {
  /* Welche Seite der App: 'ko' (Franz) oder 'de' (seine Freundin).
     Muss VOR dem ersten Laden feststehen, damit storage.js weiss,
     wessen Daten es holen soll. */
  const [profileId, setProfileId] = useState(() => {
    const id = readProfile()
    setActiveProfile(id)
    return id
  })
  const profile = PROFILES[profileId]
  const t = textFor(profile.ui)
  const tt = targetTextFor(profile.targetLang)

  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [view, setView] = useState('home')
  /* Welches Themen-Blatt gerade offen ist (null = Übersicht) */
  const [openSet, setOpenSet] = useState(null)
  const [words, setWords] = useState([])
  const [cards, setCards] = useState([])
  const [numberState, setNumberState] = useState(getNumberChallenge)
  /* Läuft gerade ein Trainer-Chat? Dann verschwindet die
     Tab-Leiste — sonst flackert sie über der Tastatur auf. */
  const [chatOffen, setChatOffen] = useState(false)
  /* Liegt auf dem Server eine neuere Version als die, die gerade
     läuft? Dann erscheint die Update-Pille (Cache-Raten ade). */
  const [updateDa, setUpdateDa] = useState(false)
  const [dailyLog, setDailyLog] = useState([])
  const [partnerLog, setPartnerLog] = useState([])
  /* Vokabel-Motor V2 (Franz): angereicherter Vorrat + ein Zähler, der
     nach lokalen Schalter-Änderungen (Pause) ein Neuzeichnen anstößt */
  const [vorrat, setVorrat] = useState([])
  const [, setTick] = useState(0)
  /* Rückgängig-Netz: welche Produktions-Karte hat die letzte
     Bewertung per Warmstart erzeugt? */
  const letzterWarmstart = useRef(null)
  /* Extra-Runde (Franz 07./08.09.): Material der letzten 5 Lerntage, nur ko */
  const [extraMaterial, setExtraMaterial] = useState([])
  const [extraTick, setExtraTick] = useState(0)

  /* Anmeldung: null = wird noch geprüft, false = nicht angemeldet,
     sonst die Supabase-Sitzung. Die Sitzung liegt im localStorage
     und überlebt App-Neustarts — angemeldet wird man nur einmal. */
  const [session, setSession] = useState(null)
  useEffect(() => {
    readSession().then((s) => setSession(s ?? false))
    return onAuthChange((s) => setSession(s ?? false))
  }, [])
  const angemeldet = !!session

  // Beim Start UND bei jedem Umschalten: die Daten der jeweiligen
  // Seite laden. Vorher alles leeren, damit nie kurz die Vokabeln
  // des anderen zu sehen sind. Erst NACH dem Login — vorher würde
  // die Datenbank uns ohnehin abweisen.
  useEffect(() => {
    if (!angemeldet) return
    let cancelled = false
    setLoading(true)
    setWords([])
    setCards([])
    setDailyLog([])
    Promise.all([loadInitial(), loadDailyLog(), loadPartnerLog()]).then(([data, log, plog]) => {
      if (cancelled) return
      setWords(data.words)
      setCards(data.cards)
      setVorrat(data.vorrat || [])
      setOffline(!data.online || pendingCount() > 0)
      setDailyLog(log)
      setPartnerLog(plog)
      /* Cloud-Tagesstand VOR dem Zahlen-Refresh übernehmen —
         so zeigt ein zweites Gerät dieselben Häkchen (Fix 06.09.) */
      uebernehmeTagesstand(log)
      setNumberState(getNumberChallenge())
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [profileId, angemeldet])

  /* Die App laedt sonst NUR beim Start. Auf dem Handy bleibt sie
     als Verknuepfung tagelang offen — ohne das hier saehe man den
     Stand von vorgestern und zwei Geraete driften auseinander. */
  /* Versions-Wächter: vergleicht die Bau-Kennung im Server-HTML
     mit dem gerade laufenden Skript. Im Dev-Modus greift das nie
     (dort gibt es kein gebautes Asset). */
  async function pruefeNeueVersion() {
    try {
      const r = await fetch(import.meta.env.BASE_URL + 'index.html', { cache: 'no-store' })
      const m = /assets\/(index-[^"]+\.js)/.exec(await r.text())
      if (m && !Array.from(document.scripts).some((s) => s.src.includes(m[1]))) {
        setUpdateDa(true)
      }
    } catch {
      /* offline — egal */
    }
  }
  useEffect(() => {
    pruefeNeueVersion()
  }, [])

  useEffect(() => {
    if (!angemeldet) return
    function refresh() {
      if (document.visibilityState !== 'visible') return
      pruefeNeueVersion()
      Promise.all([loadInitial(), loadDailyLog(), loadPartnerLog()]).then(([data, log, plog]) => {
        setWords(data.words)
        setCards(data.cards)
        setOffline(!data.online || pendingCount() > 0)
        setDailyLog(log)
        setPartnerLog(plog)
        uebernehmeTagesstand(log)
        /* Nach 4 Uhr waere die Zahl sonst noch die von gestern,
           wenn die App ueber Nacht offen blieb */
        setNumberState(getNumberChallenge())
      })
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [profileId, angemeldet])

  /* Auf die andere Seite wechseln (Flagge auf der Startseite). */
  /* Das Theme haengt am Wurzelelement: [data-profile='de'] schaltet
     in App.css das Deutsch-Theme ein, ohne die koreanische Seite
     anzufassen. Die Sandbox (sb) ist 해인s Testdouble und traegt
     deshalb IHR Theme — sonst testet Franz in der falschen Optik. */
  useEffect(() => {
    document.documentElement.dataset.profile = profileId === 'sb' ? 'de' : profileId
    /* Notizbuch-Theme obendrauf (erst Sandbox, dann Freigabe) */
    if (istNotizbuch(profileId)) {
      document.documentElement.dataset.theme = 'notizbuch'
    } else {
      delete document.documentElement.dataset.theme
    }
    /* Titel, Homescreen-Icon und Manifest je Seite (Franz 07.09.) */
    setzeAppIdentitaet(profileId)
  }, [profileId])

  /* Material der Extra-Runde: neu laden, wenn sich Karten aendern oder
     man zur Startseite zurueckkommt. Keine Uhrzeit-Grenze (Franz 08.09.) —
     die Runde steht den ganzen Tag bereit, sobald die neuen Tageswoerter
     durch sind. Seit 08.09. auf beiden Seiten.
     (istMotor statt der Variable `motor`: die steht weiter unten und waere
     in der Abhaengigkeitsliste noch nicht sichtbar.) */
  useEffect(() => {
    if (!istMotor(profileId) || !angemeldet || loading) {
      setExtraMaterial([])
      return
    }
    let weg = false
    ladeExtraMaterial(words, cards).then((m) => {
      if (!weg) setExtraMaterial(m)
    })
    return () => {
      weg = true
    }
  }, [profileId, angemeldet, loading, view, cards.length, extraTick]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleExtraFertig() {
    completeExtraRunde()
    setExtraTick((n) => n + 1)
  }

  function switchProfile() {
    const next = otherProfile(profileId)
    writeProfile(next)
    setActiveProfile(next)
    setOpenSet(null)
    setView('home')
    setProfileId(next)
  }

  // Die App an den sichtbaren Bereich koppeln.
  //
  // Wichtig sind DREI Dinge, die vorher fehlten:
  //  1. offsetTop mitnehmen — sonst wandert die App aus dem Bild,
  //     wenn iOS den sichtbaren Ausschnitt verschiebt.
  //  2. Im Bildschirmtakt aktualisieren (requestAnimationFrame).
  //     iOS feuert waehrend der Tastatur-Animation Dutzende
  //     Ereignisse; ungebremst flackert das Layout.
  //  3. Merken, ob die Tastatur offen ist — daran haengt im CSS,
  //     dass die untere Leiste verschwindet, statt ueber der
  //     Tastatur zu kleben.
  useEffect(() => {
    const vv = window.visualViewport
    const root = document.documentElement
    if (!vv) {
      root.style.setProperty('--app-h', '100%')
      return
    }
    let frame = 0
    let warOffen = false

    const anwenden = () => {
      frame = 0
      root.style.setProperty('--app-h', Math.round(vv.height) + 'px')
      root.style.setProperty('--app-top', Math.round(vv.offsetTop) + 'px')

      const offen = window.innerHeight - vv.height > 120
      root.dataset.kb = offen ? 'open' : 'closed'

      // Nur EINMAL beim Aufklappen nachfassen, falls das Feld trotz
      // geschrumpfter Flaeche noch unter der Tastatur liegt.
      if (offen && !warOffen) {
        const el = document.activeElement
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
          setTimeout(() => el.scrollIntoView({ block: 'nearest' }), 60)
        }
      }
      warOffen = offen
    }

    const planen = () => {
      if (!frame) frame = requestAnimationFrame(anwenden)
    }

    anwenden()
    vv.addEventListener('resize', planen)
    vv.addEventListener('scroll', planen)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      vv.removeEventListener('resize', planen)
      vv.removeEventListener('scroll', planen)
    }
  }, [])

  /* Kompass-Banner: Erledigt-Stand kommt jetzt aus der DATENBANK
     (geräteübergreifend) — der lokale Haken ist nur der Schnellstart */
  const [kalOffen, setKalOffen] = useState(() => !kalibrierungErledigt(profileId))
  useEffect(() => {
    let weg = false
    setKalOffen(!kalibrierungErledigt(profileId))
    kalibrierungErledigtDB(profileId).then((done) => {
      if (!weg && done) setKalOffen(false)
    })
    return () => {
      weg = true
    }
  }, [profileId])

  const due = dueCards(words, cards)
  /* Vokabel-Motor (Franz): Vorrat statt Pool, Neu-Stopp bei > 100 fälligen */
  const motor = istMotor(profileId)
  const daily = dailyStatus(words, { vorrat, faellig: due.faelligGesamt ?? due.length })
  /* Extra-Runde (Franz 08.09.): sie hat keinen eigenen Knopf — sind die
     neuen Tageswoerter durch, fuehrt der TAGESWORT-Knopf in die Runde.
     Seit 08.09. auf beiden Seiten. */
  const extraOffen = motor && daily.done && extraMaterial.length > 0

  /* Woerter, die immer wieder vergessen werden (>= 3 Ausrutscher
     auf mindestens einer Karte). Anki nennt sie "leeches". */
  const trickyIds = new Set(cards.filter((c) => c.lapses >= 3).map((c) => c.wordId))

  // Sind heute alle Tagesaufgaben erledigt? Die Zahlen-Challenge
  // gibt es nur auf der koreanischen Seite und zählt sonst nicht mit.
  /* Tages-Challenge (Franz 07.09.): Zahl UND fuenf Saetze abgeschickt */
  const numberDone = profile.numberChallenge ? numberState.done && !!numberState.saetzeDone : true

  /* Artikel des Tages — nur auf der deutschen Seite, und nur wenn
     ueberhaupt genug Substantive da sind. */
  /* Die beiden Aufgaben wechseln sich ab. Fehlt der Plural-Aufgabe
     die Datengrundlage (zu wenige Substantive mit Pluralform), wird
     auf die Artikel zurueckgefallen statt eine leere Aufgabe zu
     zeigen. */
  /* Rotation Artikel -> Plural -> Konjugation. Fehlt einer Aufgabe
     die Datengrundlage, rueckt die naechste verfuegbare nach. */
  let useKind = null
  let article = null
  if (profile.articleChallenge) {
    const datasets = {
      article: getArticleChallenge(words),
      plural: getPluralChallenge(words),
      conj: getConjChallenge(words),
    }
    const reihenfolge = ['article', 'plural', 'conj']
    useKind = todaysChallengeKind()
    for (let i = 0; i < reihenfolge.length; i++) {
      if (datasets[useKind] && datasets[useKind].enough) break
      useKind = reihenfolge[(reihenfolge.indexOf(useKind) + 1) % reihenfolge.length]
    }
    article = datasets[useKind]
  }
  /* Ihr Tag ist zu, wenn Quiz UND Saetze durch sind (Franz 08.09.) */
  const articleDone = article ? (article.done || !article.enough) && !!numberState.saetzeDone : true

  const allDone = daily.done && numberDone && articleDone && due.length === 0

  // Wenn alle Aufgaben fertig sind, den Tag als erledigt eintragen.
  useEffect(() => {
    if (loading || !allDone) return
    const today = todayStr()
    const already = dailyLog.some((r) => r.day === today && r.done)
    if (!already) markDayDone(dailyLog, today).then(setDailyLog)
  }, [allDone, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const streak = computeStreak(dailyLog)
  const week = last7Days(dailyLog, partnerLog)
  /* Fuer die Zeile unterm Kalender: hat die andere Seite heute schon? */
  const partnerName = PROFILES[otherProfile(profileId)].name
  const partnerDoneToday = partnerLog.some((r) => r.day === todayStr() && r.done)

  function handleIntroduce(poolEntry) {
    /* Vokabel-Motor (Franz): Vorratswort mit allen Inhalten, nur die
       Erkennen-Karte; der Vorrat merkt sich das Wort als erledigt */
    const { word, c1, c2 } = motor ? makeVorratWord(poolEntry) : makeIntroducedWord(poolEntry)
    const newWords = [word, ...words]
    const newCards = [c1, c2].filter(Boolean).concat(cards)
    setWords(newWords)
    setCards(newCards)
    writeWordsCache(newWords)
    writeCardsCache(newCards)
    countIntroductionToday()
    if (motor) {
      markiereVorratEingefuehrt(poolEntry.invId)
      setVorrat((v) => v.filter((x) => x.invId !== poolEntry.invId))
    }
    persistNewWord(word, c1, c2).catch((err) => {
      queueFailed({ t: 'new', word, c1, c2 })
      setOffline(true)
      console.warn('Cloud save (word of the day) failed:', err?.message || err)
    })
  }

  /* "Kenn ich schon" (A2-Sprint): Wort als angelernt buchen —
     zaehlt NICHT als heutige Neu-Einfuehrung (kein countIntroduction),
     und die App liefert sofort den naechsten Pool-Kandidaten. */
  function handleCompleteNumber() {
    completeNumberChallenge()
    setNumberState((s) => ({ ...s, done: true }))
  }

  function handleCompleteSaetze() {
    completeSatzChallenge()
    setNumberState((s) => ({ ...s, saetzeDone: true }))
  }

  function handleAdd(en, ko, pos, notiz) {
    const res = validateNewWord(words, en, ko, pos)
    if (res.error) return res
    /* Franz' Seite: `water (Wasser)` -> Englisch + Deutsch getrennt.
       (해인s Bedeutung ist `English (한국어)` — die Klammer bleibt.) */
    if (profile.targetLang === 'ko') {
      const teile = trenneBedeutung(res.word.en)
      res.word.en = teile.en
      if (teile.de) res.word.de = teile.de
    }
    /* Notizfeld (Franz 06.09.): die gewuenschte Nuance steht sofort
       auf der Karte und geht dem Modell als Richtung mit */
    const hinweis = String(notiz ?? '').trim().slice(0, 120)
    if (hinweis) res.word.nuance = hinweis
    const newWords = [res.word, ...words]
    const newCards = [res.c1, res.c2].filter(Boolean).concat(cards)
    setWords(newWords)
    setCards(newCards)
    writeWordsCache(newWords)
    writeCardsCache(newCards)
    persistNewWord(res.word, res.c1, res.c2).catch((err) => {
      queueFailed({ t: 'new', word: res.word, c1: res.c1, c2: res.c2 })
      setOffline(true)
      console.warn('Cloud save (new word) failed:', err?.message || err)
    })
    if (motor) reichereNeuesWortAn(res.word, hinweis)
    return { word: res.word }
  }

  /* Vokabel-Motor V2: Ein von Hand eingetragenes koreanisches Wort
     bekommt im Hintergrund seine Zusatzinhalte (deutsche Bedeutung,
     Nuance, Beispielsatz, Hanja-Bedeutungen, Wortart). Hanja-ZEICHEN
     kommen aus dem Inventar — das Modell darf keine wählen. Scheitert
     etwas (offline, Limit, Migration fehlt), bleibt das Wort schlicht
     ohne Extras; der Anreicherungs-Lauf holt sie später nach. Das Wort
     ist in jedem Fall sofort lernbar. */
  async function reichereNeuesWortAn(word, hinweis = '') {
    /* Inventar-Bezug (Hanja, Rang) gibt es nur fuer Koreanisch */
    const inv = profile.targetLang === 'ko' ? await inventarEintrag(word.ko).catch(() => null) : null
    const bezug = inv
      ? { invId: inv.id, rang: inv.rang != null && inv.rang < 99999 ? inv.rang : null, pos: word.pos || inv.pos || null }
      : {}
    trainerVokabelAnreichern({
      profile: profileId,
      wort: word.ko,
      en: word.en,
      pos: bezug.pos || word.pos || '',
      hanja: inv?.hanja || '',
      hatSatz: !!word.ex,
      hinweis,
      /* Verfahren 2 (09.09.): Kollokation + Zählwort-Vorgabe aus dem Inventar */
      invHinweis: inv?.hinweis || '',
      zaehlwort: !!inv?.zaehlwort,
      zahlsystem: inv?.zahlsystem || null,
    })
      .catch(() => ({}))
      .then((res) => {
        const felder = {}
        if (bezug.invId) felder.invId = bezug.invId
        if (bezug.rang != null) felder.rang = bezug.rang
        if (!word.pos && (res.pos || bezug.pos)) felder.pos = res.pos || bezug.pos
        if (res.de) felder.de = res.de
        /* Eigener Hinweis bleibt Richtung: das Modell darf ihn nur
           schoener formulieren (res.nuance kommt dann daraus) */
        if (res.nuance) felder.nuance = res.nuance
        if (res.hanja) felder.hanja = res.hanja
        /* Vokabel-Qualität (09.09.): Infotext + Zählwort */
        if (res.info) felder.info = res.info
        if (res.zaehlwort) {
          felder.zaehlwort = true
          felder.zahlsystem = res.zahlsystem || null
        }
        if (!word.ex && res.ex) {
          felder.ex = res.ex
          felder.exTr = res.exTr || null
        }
        if (Object.keys(felder).length) {
          setWords((ws) => {
            const neu = ws.map((w) => (w.id === word.id ? { ...w, ...felder } : w))
            writeWordsCache(neu)
            return neu
          })
          ergaenzeWortInhalte(word.id, felder).catch((err) =>
            console.warn('Anreicherung nicht gespeichert:', err?.message || err)
          )
        }
        /* Gleiche Bedeutung wie ein Wort, das schon da ist? Dann
           bekommen ALLE Mitglieder eine unterscheidende Nuance —
           sonst stünden sie in der Vorschlagsliste identisch
           (Franz 06.09.). Feuer-und-vergessen. */
        const neuesWort = { ...word, ...felder }
        const geschwister = gleichbedeutende(words, neuesWort).slice(0, 5)
        if (!geschwister.length) return
        const gruppe = [neuesWort, ...geschwister].map((w) => ({ ko: w.ko, en: w.en, de: w.de, ex: w.ex }))
        trainerVokabelNuancen({ profile: profileId, gruppe })
          .then((r) => {
            const nuancen = Array.isArray(r?.nuancen) ? r.nuancen : []
            if (!nuancen.length) return
            const nachKo = new Map(nuancen.map((n) => [n.ko, n.nuance]))
            setWords((ws) => {
              const neu = ws.map((w) => (nachKo.has(w.ko) ? { ...w, nuance: nachKo.get(w.ko) } : w))
              writeWordsCache(neu)
              return neu
            })
            for (const w of [neuesWort, ...geschwister]) {
              const n = nachKo.get(w.ko)
              if (n) ergaenzeWortInhalte(w.id, { nuance: n }).catch(() => {})
            }
          })
          .catch(() => {})
      })
  }

  function handleEditWord(id, en, ko, pos) {
    const res = validateEdit(words, id, en, ko, pos)
    if (res.error) return res
    const alt = words.find((w) => w.id === id)
    /* Vokabel-Motor: `water (Wasser)` -> Englisch + Deutsch getrennt;
       ohne Klammer bleibt die deutsche Bedeutung, wie sie war */
    let de
    if (motor) {
      const teile = trenneBedeutung(res.en)
      res.en = teile.en
      de = teile.de
    }
    /* Anderes Wort = andere Grammatik. Sonst zeigt die Info-Tafel
       den Plural des ALTEN Wortes. */
    const clearExtras =
      !!alt && alt.ko.trim() !== res.ko.trim() && !!(alt.plural || alt.conj || alt.pluralNote)
    /* Hand-Schutz (Franz 09.09.): Was er hier selbst umschreibt, darf
       der Anreicherungslauf nie mehr überschreiben. Gemerkt wird nur,
       was sich wirklich geändert hat. */
    const hand = new Set(alt?.hand || [])
    if (alt && alt.en !== res.en) hand.add('en')
    if (de && alt && alt.de !== de) hand.add('de')
    const handListe = hand.size ? [...hand] : null
    const newWords = words.map((w) =>
      w.id === id
        ? clearExtras
          ? { ...w, en: res.en, ko: res.ko, pos: res.pos, plural: null, pluralNote: null, conj: null, extrasAuto: false, hand: handListe, ...(de ? { de } : {}) }
          : { ...w, en: res.en, ko: res.ko, pos: res.pos, hand: handListe, ...(de ? { de } : {}) }
        : w
    )
    setWords(newWords)
    writeWordsCache(newWords)
    updateWordCloud(id, res.en, res.ko, res.pos, clearExtras, de, handListe).catch((err) => {
      queueFailed({ t: 'edit', id, en: res.en, ko: res.ko, pos: res.pos, clearExtras, de, hand: handListe })
      setOffline(true)
      console.warn('Cloud save (edit) failed:', err?.message || err)
    })
    return { ok: true }
  }

  function handleCompleteConj() {
    completeConjChallenge()
    flipChallengeKind()
    setWords((w) => [...w])
  }

  function handleCompletePlural() {
    completePluralChallenge()
    flipChallengeKind()
    setWords((w) => [...w])
  }

  function handleCompleteArticle() {
    completeArticleChallenge()
    /* Morgen ist die andere Aufgabe dran */
    flipChallengeKind()
    /* Erzwingt ein Neuzeichnen, damit die Startseite das Haekchen zeigt */
    setWords((w) => [...w])
  }

  function handleDeleteWord(id) {
    const newWords = words.filter((w) => w.id !== id)
    const newCards = cards.filter((c) => c.wordId !== id)
    setWords(newWords)
    setCards(newCards)
    writeWordsCache(newWords)
    writeCardsCache(newCards)
    deleteWordCloud(id).catch((err) => {
      queueFailed({ t: 'del', id })
      setOffline(true)
      console.warn('Cloud delete failed:', err?.message || err)
    })
  }

  /* Bewertung zuruecknehmen: Karte auf den Stand VOR der Bewertung
     setzen, lokal und in der Cloud. */
  function handleUndoRate(prev) {
    const restored = {
      id: prev.id,
      wordId: prev.wordId,
      front: prev.front,
      ease: prev.ease,
      intervalDays: prev.intervalDays,
      reps: prev.reps,
      lapses: prev.lapses,
      due: prev.due,
      lastReviewed: prev.lastReviewed,
      /* FSRS + Vokabel-Motor: auch Stabilität, Hör-Modus und Zähler zurück */
      stab: prev.stab ?? null,
      diff: prev.diff ?? null,
      modus: prev.modus || 'text',
      hoerFehler: prev.hoerFehler || 0,
      erfolge: prev.erfolge || 0,
    }
    let next = cards.map((c) => (c.id === restored.id ? restored : c))
    /* Hat die zurückgenommene Bewertung eine Produktions-Karte
       erzeugt (Warmstart)? Dann verschwindet die wieder. */
    const ws = letzterWarmstart.current
    if (ws && ws.fuer === prev.id) {
      next = next.filter((c) => c.id !== ws.neuId)
      letzterWarmstart.current = null
      deleteCardCloud(ws.neuId).catch((err) => {
        queueFailed({ t: 'delcard', id: ws.neuId })
        setOffline(true)
        console.warn('Cloud delete (undo warm start) failed:', err?.message || err)
      })
    }
    setCards(next)
    writeCardsCache(next)
    persistCard(restored).catch((err) => {
      queueFailed({ t: 'card', card: restored })
      setOffline(true)
      console.warn('Cloud save (undo) failed:', err?.message || err)
    })
  }

  function handleRate(cardId, rating) {
    const target = cards.find((c) => c.id === cardId)
    if (!target) return
    let updatedCard = applyRating(target, rating)
    /* Antwort-Historie (Migration 011): Grundlage für die spätere
       persönliche FSRS-Eichung — nie blockierend */
    logReview(target, rating, updatedCard)

    /* Vokabel-Motor (Franz): Lebenslauf — Produktions-Warmstart und
       Hör-Verwandlung (Konzept §2.3/§2.4) */
    let neueKarte = null
    if (motor) {
      const erg = verarbeiteBewertung(updatedCard, rating, cards)
      updatedCard = erg.karte
      neueKarte = erg.neueKarte
    }
    letzterWarmstart.current = neueKarte ? { fuer: cardId, neuId: neueKarte.id } : null

    let next = cards.map((c) => (c.id === cardId ? updatedCard : c))
    if (neueKarte) next = [...next, neueKarte]
    setCards(next)
    writeCardsCache(next)
    persistCard(updatedCard).catch((err) => {
      queueFailed({ t: 'card', card: updatedCard })
      setOffline(true)
      console.warn('Cloud save (rating) failed:', err?.message || err)
    })
    if (neueKarte) {
      persistNewCard(neueKarte).catch((err) => {
        queueFailed({ t: 'newcard', card: neueKarte })
        setOffline(true)
        console.warn('Cloud save (warm start) failed:', err?.message || err)
      })
    }
  }

  /* Anmelde-Weiche: solange die gespeicherte Sitzung noch geprüft
     wird (null), nichts anzeigen — das dauert nur einen Wimpernschlag
     und verhindert ein Aufblitzen des Login-Bildschirms. */
  if (session === null) {
    return <div className="app" />
  }
  if (!angemeldet) {
    return (
      <div className="app">
        <Login />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-hangul" lang={profile.greetingLang}>{profile.greeting}</div>
          <p>{t.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {offline && <div className="offline-banner">{t.offline}</div>}

      {/* Neue Version auf dem Server: ein Tipp lädt sie */}
      {updateDa && (
        <button className="update-pille" onClick={() => window.location.reload()}>
          {t.updateDa}
        </button>
      )}

      <div className="page">
        {view === 'home' && (
          <Home
            vocabCount={words.length}
            dueCount={due.length}
            dailyDone={daily.done}
            dailyLeft={daily.left}
            /* Vokabel-Motor (Franz): Grund für „nichts Neues" + Pause-Schalter */
            neuGrund={motor ? daily.grund : null}
            zeigeMotorInfo={motorInfoSichtbar(profileId, todayStr())}
            neuTempo={daily.tempo}
            neuFaellig={daily.faellig}
            extraAnzahl={extraMaterial.length}
            extraErledigt={extraRundeErledigt()}
            extraOffen={extraOffen}
            onPauseToggle={
              motor
                ? () => {
                    setzeNeuePause(!daily.pause)
                    setTick((n) => n + 1)
                  }
                : undefined
            }
            numberDone={numberDone}
            streak={streak}
            week={week}
            onReview={() => setView('review')}
            onDaily={() => setView(extraOffen ? 'extra' : 'daily')}
            onNumber={() => setView('number')}
            onArticle={() => setView('article')}
            articleDone={articleDone}
            articleReady={!!article && article.enough}
            articleKind={useKind}
            onCalendar={() => setView('calendar')}
            onSwitchProfile={switchProfile}
            onKalibrierung={() => setView('kalibrierung')}
            kalOffen={kalOffen}
            profile={profile}
            t={t}
            tt={tt}
          />
        )}
        {view === 'kalibrierung' && (
          <Kalibrierung profile={profile} t={t} onExit={() => setView('home')} />
        )}
        {view === 'studio' && (
          <Studio profile={profile} t={t} onExit={() => setView('home')} />
        )}
        {view === 'artikeltest' && (
          <ArtikelSwipe profile={profile} t={t} onExit={() => setView('home')} />
        )}
        {view === 'daily' && motor && (
          <Einfuehrung
            candidates={daily.candidates}
            onIntroduce={handleIntroduce}
            onExit={() => setView('home')}
            profile={profile}
            t={t}
          />
        )}
        {view === 'extra' && (
          <ExtraRunde
            material={extraMaterial}
            onDone={handleExtraFertig}
            onExit={() => setView('home')}
            profile={profile}
            t={t}
          />
        )}
        {view === 'number' && (
          <TagesChallenge
            number={numberState.number}
            sino={sinoKorean(numberState.number)}
            native={nativeKorean(numberState.number)}
            numberDone={numberState.done}
            onNumberDone={handleCompleteNumber}
            saetzeDone={!!numberState.saetzeDone}
            onSaetzeDone={handleCompleteSaetze}
            words={words}
            profile={profile}
            onExit={() => setView('home')}
            t={t}
          />
        )}
        {/* Haeins dritter Knopf: Tagesquiz + fuenf Saetze (Franz 08.09.) */}
        {view === 'article' && article && (
          <TagesChallengeDe
            quizTitel={useKind === 'plural' ? t.pluralOfDay : useKind === 'conj' ? t.conjOfDay : t.articleOfDay}
            quizDone={article.done}
            onQuizOeffnen={() => setView('articleQuiz')}
            saetzeDone={!!numberState.saetzeDone}
            onSaetzeDone={handleCompleteSaetze}
            words={words}
            profile={profile}
            onExit={() => setView('home')}
            t={t}
          />
        )}
        {view === 'articleQuiz' && article && useKind === 'article' && (
          <ArticleChallenge
            rounds={article.rounds}
            alreadyDone={article.done}
            onComplete={handleCompleteArticle}
            onExit={() => setView('article')}
            t={t}
          />
        )}
        {view === 'articleQuiz' && article && useKind === 'plural' && (
          <PluralChallenge
            rounds={article.rounds}
            alreadyDone={article.done}
            onComplete={handleCompletePlural}
            onExit={() => setView('article')}
            t={t}
            tt={tt}
          />
        )}
        {view === 'articleQuiz' && article && useKind === 'conj' && (
          <ConjChallenge
            rounds={article.rounds}
            alreadyDone={article.done}
            onComplete={handleCompleteConj}
            onExit={() => setView('article')}
            t={t}
            tt={tt}
          />
        )}
        {view === 'library' && (
          <Library
            vocab={words}
            cards={cards}
            trickyIds={trickyIds}
            onAdd={handleAdd}
            onEdit={handleEditWord}
            onDelete={handleDeleteWord}
            profile={profile}
            t={t}
            tt={tt}
          />
        )}
        {view === 'review' && motor && (
          <ReviewMotor
            initialQueue={due}
            words={words}
            onRate={handleRate}
            onUndo={handleUndoRate}
            onExit={() => setView('home')}
            profile={profile}
            t={t}
            tt={tt}
          />
        )}
        {view === 'review' && !motor && (
          <Review
            initialQueue={due}
            onRate={handleRate}
            onUndo={handleUndoRate}
            onExit={() => setView('home')}
            profile={profile}
            t={t}
            tt={tt}
          />
        )}
        {view === 'calendar' && (
          <Calendar profile={profile} t={t} words={words} cards={cards} vorrat={vorrat} onExit={() => setView('home')} />
        )}
        {view === 'trainer' && profile.trainer && (
          <Trainer profile={profile} t={t} onChatActive={setChatOffen} onAddWord={handleAdd} words={words} />
        )}
        {view === 'a2' && profile.a2 && (
          <A2Training profile={profile} t={t} words={words} />
        )}
        {view === 'profil' && (
          <Profil profile={profile} t={t} words={words} cards={cards} />
        )}
        {view === 'sets' &&
          (openSet ? (
            (profile.targetLang === 'de' ? (
              <SetSheetDe id={openSet} onExit={() => setOpenSet(null)} />
            ) : (
              <SetSheet id={openSet} onExit={() => setOpenSet(null)} />
            ))
          ) : (
            <Sets onOpen={setOpenSet} profile={profile} t={t} />
          ))}
      </div>

      {!chatOffen && (view === 'home' || view === 'library' || view === 'sets' || view === 'trainer' || view === 'a2' || view === 'profil') && (() => {
        /* Tabs als Liste, damit der gleitende Indikator (Premium-
           Runde 06.09.) seine Position kennt. Start gehört in die
           MITTE (Wunsch Franz 02.09.) — links davon Trainer/A2. */
        const tabs = [
          { id: 'sets', icon: <GridIcon />, label: t.tabSets, tap: () => { setOpenSet(null); setView('sets') } },
          ...(profile.trainer ? [{ id: 'trainer', icon: <ChatIcon />, label: t.tabTrainer, tap: () => setView('trainer') }] : []),
          ...(profile.a2 ? [{ id: 'a2', icon: <ChatIcon />, label: t.tabA2, tap: () => setView('a2') }] : []),
          { id: 'home', icon: profile.targetLang === 'de' ? <DomIcon /> : <HomeIcon />, label: t.tabHome, tap: () => setView('home') },
          { id: 'library', icon: <BookIcon />, label: t.tabLibrary, tap: () => setView('library') },
          { id: 'profil', icon: <PersonIcon />, label: t.tabProfil, tap: () => setView('profil') },
        ]
        const aktiv = Math.max(0, tabs.findIndex((x) => x.id === view))
        return (
          <nav className="tabbar">
            {/* gleitet per transform unter den aktiven Tab —
                im Notizbuch-Theme als Washi-Streifen */}
            <span
              className="tab-gleiter"
              aria-hidden="true"
              style={{ width: `${100 / tabs.length}%`, transform: `translateX(${aktiv * 100}%)` }}
            />
            {tabs.map((x) => (
              <button
                key={x.id}
                className={view === x.id ? 'tab tab-active' : 'tab'}
                onClick={x.tap}
              >
                {x.icon}
                <span>{x.label}</span>
              </button>
            ))}
          </nav>
        )
      })()}
    </div>
  )
}

export default App
