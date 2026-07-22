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
import Calendar from './Calendar'
import { HomeIcon, BookIcon } from './icons'

function App() {
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [view, setView] = useState('home')
  const [words, setWords] = useState([])
  const [cards, setCards] = useState([])
  const [numberState, setNumberState] = useState(getNumberChallenge)
  const [dailyLog, setDailyLog] = useState([])

  // Beim Start: Vokabeln/Karten + Streak-Log laden.
  useEffect(() => {
    Promise.all([loadInitial(), loadDailyLog()]).then(([data, log]) => {
      setWords(data.words)
      setCards(data.cards)
      setOffline(!data.online)
      setDailyLog(log)
      setLoading(false)
    })
  }, [])

  const due = dueCards(words, cards)
  const daily = dailyStatus(words)

  // Sind heute alle drei Tagesaufgaben erledigt?
  const allDone = daily.done && numberState.done && due.length === 0

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
    persistNewWord(word, c1, c2).catch((err) =>
      console.warn('Cloud save (word of the day) failed:', err?.message || err)
    )
  }

  function handleCompleteNumber() {
    completeNumberChallenge()
    setNumberState((s) => ({ ...s, done: true }))
  }

  function handleAdd(en, ko) {
    const res = validateNewWord(words, en, ko)
    if (res.error) return res
    const newWords = [res.word, ...words]
    const newCards = [res.c1, res.c2, ...cards]
    setWords(newWords)
    setCards(newCards)
    writeWordsCache(newWords)
    writeCardsCache(newCards)
    persistNewWord(res.word, res.c1, res.c2).catch((err) =>
      console.warn('Cloud save (new word) failed:', err?.message || err)
    )
    return { word: res.word }
  }

  function handleEditWord(id, en, ko) {
    const res = validateEdit(words, id, en, ko)
    if (res.error) return res
    const newWords = words.map((w) => (w.id === id ? { ...w, en: res.en, ko: res.ko } : w))
    setWords(newWords)
    writeWordsCache(newWords)
    updateWordCloud(id, res.en, res.ko).catch((err) =>
      console.warn('Cloud save (edit) failed:', err?.message || err)
    )
    return { ok: true }
  }

  function handleDeleteWord(id) {
    const newWords = words.filter((w) => w.id !== id)
    const newCards = cards.filter((c) => c.wordId !== id)
    setWords(newWords)
    setCards(newCards)
    writeWordsCache(newWords)
    writeCardsCache(newCards)
    deleteWordCloud(id).catch((err) => console.warn('Cloud delete failed:', err?.message || err))
  }

  function handleRate(cardId, rating) {
    const target = cards.find((c) => c.id === cardId)
    if (!target) return
    const updatedCard = applyRating(target, rating)
    const next = cards.map((c) => (c.id === cardId ? updatedCard : c))
    setCards(next)
    writeCardsCache(next)
    persistCard(updatedCard).catch((err) =>
      console.warn('Cloud save (rating) failed:', err?.message || err)
    )
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-hangul">한국어</div>
          <p>Loading your words…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {offline && <div className="offline-banner">Offline – changes are saved locally.</div>}

      <div className="page">
        {view === 'home' && (
          <Home
            vocabCount={words.length}
            dueCount={due.length}
            dailyDone={daily.done}
            dailyLeft={daily.left}
            numberDone={numberState.done}
            streak={streak}
            week={week}
            onReview={() => setView('review')}
            onDaily={() => setView('daily')}
            onNumber={() => setView('number')}
            onCalendar={() => setView('calendar')}
          />
        )}
        {view === 'daily' && (
          <DailyWord
            candidates={daily.candidates}
            onIntroduce={handleIntroduce}
            onExit={() => setView('home')}
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
          />
        )}
        {view === 'library' && (
          <Library
            vocab={words}
            onAdd={handleAdd}
            onEdit={handleEditWord}
            onDelete={handleDeleteWord}
          />
        )}
        {view === 'review' && (
          <Review initialQueue={due} onRate={handleRate} onExit={() => setView('home')} />
        )}
        {view === 'calendar' && <Calendar log={dailyLog} onExit={() => setView('home')} />}
      </div>

      {(view === 'home' || view === 'library') && (
        <nav className="tabbar">
          <button
            className={view === 'home' ? 'tab tab-active' : 'tab'}
            onClick={() => setView('home')}
          >
            <HomeIcon />
            <span>Home</span>
          </button>
          <button
            className={view === 'library' ? 'tab tab-active' : 'tab'}
            onClick={() => setView('library')}
          >
            <BookIcon />
            <span>Library</span>
          </button>
        </nav>
      )}
    </div>
  )
}

export default App
