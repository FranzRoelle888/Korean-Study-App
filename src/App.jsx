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
  completeNumberChallenge,
  sinoKorean,
  nativeKorean,
  loadDailyLog,
  markDayDone,
  computeStreak,
  last7Days,
  todayStr,
  writeWordsCache,
  writeCardsCache,
} from './storage'
import Home from './Home'
import Library from './Library'
import Review from './Review'
import DailyWord from './DailyWord'
import NumberChallenge from './NumberChallenge'
import ArticleChallenge from './ArticleChallenge'
import Calendar from './Calendar'
import Sets from './Sets'
import SetSheet from './SetSheet'
import SetSheetDe from './SetSheetDe'
import { HomeIcon, BookIcon, GridIcon, DomIcon } from './icons'
import { PROFILES, readProfile, writeProfile, otherProfile } from './profiles'
import { textFor, targetTextFor } from './i18n'
import { setActiveProfile } from './storage'

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
  const [dailyLog, setDailyLog] = useState([])

  // Beim Start UND bei jedem Umschalten: die Daten der jeweiligen
  // Seite laden. Vorher alles leeren, damit nie kurz die Vokabeln
  // des anderen zu sehen sind.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setWords([])
    setCards([])
    setDailyLog([])
    Promise.all([loadInitial(), loadDailyLog()]).then(([data, log]) => {
      if (cancelled) return
      setWords(data.words)
      setCards(data.cards)
      setOffline(!data.online || pendingCount() > 0)
      setDailyLog(log)
      setNumberState(getNumberChallenge())
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [profileId])

  /* Die App laedt sonst NUR beim Start. Auf dem Handy bleibt sie
     als Verknuepfung tagelang offen — ohne das hier saehe man den
     Stand von vorgestern und zwei Geraete driften auseinander. */
  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== 'visible') return
      Promise.all([loadInitial(), loadDailyLog()]).then(([data, log]) => {
        setWords(data.words)
        setCards(data.cards)
        setOffline(!data.online || pendingCount() > 0)
        setDailyLog(log)
      })
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [profileId])

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

  // Sind heute alle Tagesaufgaben erledigt? Die Zahlen-Challenge
  // gibt es nur auf der koreanischen Seite und zählt sonst nicht mit.
  const numberDone = profile.numberChallenge ? numberState.done : true

  /* Artikel des Tages — nur auf der deutschen Seite, und nur wenn
     ueberhaupt genug Substantive da sind. */
  const article = profile.articleChallenge ? getArticleChallenge(words) : null
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
  const week = last7Days(dailyLog)

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
    const newWords = words.map((w) => (w.id === id ? { ...w, en: res.en, ko: res.ko, pos: res.pos } : w))
    setWords(newWords)
    writeWordsCache(newWords)
    updateWordCloud(id, res.en, res.ko, res.pos).catch((err) => {
      queueFailed({ t: 'edit', id, en: res.en, ko: res.ko, pos: res.pos })
      setOffline(true)
      console.warn('Cloud save (edit) failed:', err?.message || err)
    })
    return { ok: true }
  }

  function handleCompleteArticle() {
    completeArticleChallenge()
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
            onCalendar={() => setView('calendar')}
            onSwitchProfile={switchProfile}
            profile={profile}
            t={t}
            tt={tt}
          />
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
        {view === 'article' && article && (
          <ArticleChallenge
            rounds={article.rounds}
            alreadyDone={article.done}
            onComplete={handleCompleteArticle}
            onExit={() => setView('home')}
            t={t}
          />
        )}
        {view === 'library' && (
          <Library
            vocab={words}
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
            onExit={() => setView('home')}
            profile={profile}
            t={t}
            tt={tt}
          />
        )}
        {view === 'calendar' && <Calendar log={dailyLog} onExit={() => setView('home')} t={t} tt={tt} />}
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

      {(view === 'home' || view === 'library' || view === 'sets') && (
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
