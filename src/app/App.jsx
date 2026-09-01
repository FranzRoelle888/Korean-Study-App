import { useState, useEffect } from 'react'
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
  markDayDone,
  computeStreak,
  last7Days,
  loadPartnerLog,
  todayStr,
  writeWordsCache,
  writeCardsCache,
} from '../core/storage'
import Home from '../features/today/Home'
import Library from '../features/cards/Library'
import Review from '../features/cards/Review'
import DailyWord from '../features/cards/DailyWord'
import NumberChallenge from '../features/challenges/NumberChallenge'
import ArticleChallenge from '../features/challenges/ArticleChallenge'
import PluralChallenge from '../features/challenges/PluralChallenge'
import ConjChallenge from '../features/challenges/ConjChallenge'
import Calendar from '../features/today/Calendar'
import Trainer from '../features/trainer/Trainer'
import Sets from '../features/sets/Sets'
import SetSheet from '../features/sets/SetSheet'
import SetSheetDe from '../features/sets/SetSheetDe'
import { HomeIcon, BookIcon, GridIcon, DomIcon, ChatIcon } from '../shared/icons'
import { PROFILES, readProfile, writeProfile, otherProfile } from '../core/profiles'
import { textFor, targetTextFor } from '../shared/i18n'
import { setActiveProfile } from '../core/storage'
import { readSession, onAuthChange } from '../core/auth'
import Login from './Login'
import Kalibrierung from '../features/kalibrierung/Kalibrierung'
import Studio from '../features/ueben/Studio'
import ArtikelSwipe from '../features/ueben/ArtikelSwipe'
import { kalibrierungErledigt } from '../core/kalibrierung'

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
      setOffline(!data.online || pendingCount() > 0)
      setDailyLog(log)
      setPartnerLog(plog)
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
     anzufassen. */
  useEffect(() => {
    document.documentElement.dataset.profile = profileId
  }, [profileId])

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

  const due = dueCards(words, cards)
  const daily = dailyStatus(words)

  /* Woerter, die immer wieder vergessen werden (>= 3 Ausrutscher
     auf mindestens einer Karte). Anki nennt sie "leeches". */
  const trickyIds = new Set(cards.filter((c) => c.lapses >= 3).map((c) => c.wordId))

  // Sind heute alle Tagesaufgaben erledigt? Die Zahlen-Challenge
  // gibt es nur auf der koreanischen Seite und zählt sonst nicht mit.
  const numberDone = profile.numberChallenge ? numberState.done : true

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
  const articleDone = article ? article.done || !article.enough : true

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
    const { word, c1, c2 } = makeIntroducedWord(poolEntry)
    const newWords = [word, ...words]
    const newCards = [c1, c2, ...cards]
    setWords(newWords)
    setCards(newCards)
    writeWordsCache(newWords)
    writeCardsCache(newCards)
    countIntroductionToday()
    persistNewWord(word, c1, c2).catch((err) => {
      queueFailed({ t: 'new', word, c1, c2 })
      setOffline(true)
      console.warn('Cloud save (word of the day) failed:', err?.message || err)
    })
  }

  function handleCompleteNumber() {
    completeNumberChallenge()
    setNumberState((s) => ({ ...s, done: true }))
  }

  function handleAdd(en, ko, pos) {
    const res = validateNewWord(words, en, ko, pos)
    if (res.error) return res
    const newWords = [res.word, ...words]
    const newCards = [res.c1, res.c2, ...cards]
    setWords(newWords)
    setCards(newCards)
    writeWordsCache(newWords)
    writeCardsCache(newCards)
    persistNewWord(res.word, res.c1, res.c2).catch((err) => {
      queueFailed({ t: 'new', word: res.word, c1: res.c1, c2: res.c2 })
      setOffline(true)
      console.warn('Cloud save (new word) failed:', err?.message || err)
    })
    return { word: res.word }
  }

  function handleEditWord(id, en, ko, pos) {
    const res = validateEdit(words, id, en, ko, pos)
    if (res.error) return res
    const alt = words.find((w) => w.id === id)
    /* Anderes Wort = andere Grammatik. Sonst zeigt die Info-Tafel
       den Plural des ALTEN Wortes. */
    const clearExtras =
      !!alt && alt.ko.trim() !== res.ko.trim() && !!(alt.plural || alt.conj || alt.pluralNote)
    const newWords = words.map((w) =>
      w.id === id
        ? clearExtras
          ? { ...w, en: res.en, ko: res.ko, pos: res.pos, plural: null, pluralNote: null, conj: null, extrasAuto: false }
          : { ...w, en: res.en, ko: res.ko, pos: res.pos }
        : w
    )
    setWords(newWords)
    writeWordsCache(newWords)
    updateWordCloud(id, res.en, res.ko, res.pos, clearExtras).catch((err) => {
      queueFailed({ t: 'edit', id, en: res.en, ko: res.ko, pos: res.pos, clearExtras })
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
    }
    const next = cards.map((c) => (c.id === restored.id ? restored : c))
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
    const updatedCard = applyRating(target, rating)
    const next = cards.map((c) => (c.id === cardId ? updatedCard : c))
    setCards(next)
    writeCardsCache(next)
    persistCard(updatedCard).catch((err) => {
      queueFailed({ t: 'card', card: updatedCard })
      setOffline(true)
      console.warn('Cloud save (rating) failed:', err?.message || err)
    })
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
            numberDone={numberDone}
            streak={streak}
            week={week}
            onReview={() => setView('review')}
            onDaily={() => setView('daily')}
            onNumber={() => setView('number')}
            onArticle={() => setView('article')}
            articleDone={articleDone}
            articleReady={!!article && article.enough}
            articleKind={useKind}
            onCalendar={() => setView('calendar')}
            onSwitchProfile={switchProfile}
            onKalibrierung={() => setView('kalibrierung')}
            kalOffen={!kalibrierungErledigt(profileId)}
            /* Test-Zugaenge: Studio nur auf Franz' ko-Seite; das
               Artikel-Spiel nur auf der de-Seite UND nur mit
               ?test in der URL — 해인 sieht nichts Unfertiges */
            onStudioTest={profileId === 'ko' ? () => setView('studio') : undefined}
            onArtikelTest={
              profileId === 'de' && new URLSearchParams(window.location.search).has('test')
                ? () => setView('artikeltest')
                : undefined
            }
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
        {view === 'daily' && (
          <DailyWord
            candidates={daily.candidates}
            onIntroduce={handleIntroduce}
            onExit={() => setView('home')}
            profile={profile}
            t={t}
            tt={tt}
          />
        )}
        {view === 'number' && (
          <NumberChallenge
            number={numberState.number}
            sino={sinoKorean(numberState.number)}
            native={nativeKorean(numberState.number)}
            alreadyDone={numberState.done}
            onComplete={handleCompleteNumber}
            onExit={() => setView('home')}
            t={t}
          />
        )}
        {view === 'article' && article && useKind === 'article' && (
          <ArticleChallenge
            rounds={article.rounds}
            alreadyDone={article.done}
            onComplete={handleCompleteArticle}
            onExit={() => setView('home')}
            t={t}
          />
        )}
        {view === 'article' && article && useKind === 'plural' && (
          <PluralChallenge
            rounds={article.rounds}
            alreadyDone={article.done}
            onComplete={handleCompletePlural}
            onExit={() => setView('home')}
            t={t}
            tt={tt}
          />
        )}
        {view === 'article' && article && useKind === 'conj' && (
          <ConjChallenge
            rounds={article.rounds}
            alreadyDone={article.done}
            onComplete={handleCompleteConj}
            onExit={() => setView('home')}
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
        {view === 'review' && (
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
        {view === 'calendar' && <Calendar
            log={dailyLog}
            onExit={() => setView('home')}
            t={t}
            tt={tt}
            partnerNote={partnerDoneToday ? t.partnerDoneToday(partnerName) : null}
          />}
        {view === 'trainer' && profile.trainer && (
          <Trainer profile={profile} t={t} onChatActive={setChatOffen} onAddWord={handleAdd} />
        )}
        {view === 'sets' &&
          (openSet ? (
            (profile.id === 'de' ? (
              <SetSheetDe id={openSet} onExit={() => setOpenSet(null)} />
            ) : (
              <SetSheet id={openSet} onExit={() => setOpenSet(null)} />
            ))
          ) : (
            <Sets onOpen={setOpenSet} profile={profile} t={t} />
          ))}
      </div>

      {!chatOffen && (view === 'home' || view === 'library' || view === 'sets' || view === 'trainer') && (
        <nav className="tabbar">
          <button
            className={view === 'sets' ? 'tab tab-active' : 'tab'}
            onClick={() => {
              setOpenSet(null)
              setView('sets')
            }}
          >
            <GridIcon />
            <span>{t.tabSets}</span>
          </button>
          <button
            className={view === 'home' ? 'tab tab-active' : 'tab'}
            onClick={() => setView('home')}
          >
            {profile.id === 'de' ? <DomIcon /> : <HomeIcon />}
            <span>{t.tabHome}</span>
          </button>
          {profile.trainer && (
            <button
              className={view === 'trainer' ? 'tab tab-active' : 'tab'}
              onClick={() => setView('trainer')}
            >
              <ChatIcon />
              <span>{t.tabTrainer}</span>
            </button>
          )}
          <button
            className={view === 'library' ? 'tab tab-active' : 'tab'}
            onClick={() => setView('library')}
          >
            <BookIcon />
            <span>{t.tabLibrary}</span>
          </button>
        </nav>
      )}
    </div>
  )
}

export default App
