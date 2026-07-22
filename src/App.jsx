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
  writeWordsCache,
  writeCardsCache,
} from './storage'
import Home from './Home'
import Library from './Library'
import Review from './Review'
import DailyWord from './DailyWord'
import NumberChallenge from './NumberChallenge'
import { HomeIcon, BookIcon } from './icons'

/* ============================================================
   APP = der "Verteiler".
   - lädt beim Start die Daten aus der Cloud (mit Ladeanzeige)
   - view: 'home' | 'library' | 'review'
   - words / cards: der aktuelle Stand im Speicher der App
   Änderungen: sofort in die Anzeige + lokalen Puffer, und im
   Hintergrund dauerhaft in die Cloud.
   ============================================================ */

function App() {
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [view, setView] = useState('home')
  const [words, setWords] = useState([])
  const [cards, setCards] = useState([])
  const [numberState, setNumberState] = useState(getNumberChallenge)

  // Beim allerersten Anzeigen: Daten laden.
  useEffect(() => {
    loadInitial().then(({ words, cards, online }) => {
      setWords(words)
      setCards(cards)
      setOffline(!online)
      setLoading(false)
    })
  }, [])

  const due = dueCards(words, cards)
  const daily = dailyStatus(words)

  // Eine "Vokabel des Tages" einführen -> Wort + zwei Karten (sofort
  // fällig, also direkt auf den Stapel), speichern, Tageszähler hoch.
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
      console.warn('Cloud-Speichern (Vokabel des Tages) fehlgeschlagen:', err?.message || err)
    )
  }

  // Vokabel hinzufügen -> Wort + zwei Karten
  function handleAdd(en, ko) {
    const res = validateNewWord(words, en, ko)
    if (res.error) return res

    const newWords = [res.word, ...words]
    const newCards = [res.c1, res.c2, ...cards]
    setWords(newWords)
    setCards(newCards)
    writeWordsCache(newWords)
    writeCardsCache(newCards)
    // dauerhaft in die Cloud (im Hintergrund)
    persistNewWord(res.word, res.c1, res.c2).catch((err) =>
      console.warn('Cloud-Speichern (neue Vokabel) fehlgeschlagen:', err?.message || err)
    )
    return { word: res.word }
  }

  // Vokabel bearbeiten (en/ko). Beide Karten aktualisieren sich mit,
  // weil sie am Wort hängen; ihr Lernstand bleibt.
  function handleEditWord(id, en, ko) {
    const res = validateEdit(words, id, en, ko)
    if (res.error) return res
    const newWords = words.map((w) => (w.id === id ? { ...w, en: res.en, ko: res.ko } : w))
    setWords(newWords)
    writeWordsCache(newWords)
    updateWordCloud(id, res.en, res.ko).catch((err) =>
      console.warn('Cloud-Speichern (bearbeiten) fehlgeschlagen:', err?.message || err)
    )
    return { ok: true }
  }

  // Vokabel löschen (samt ihrer beiden Karten)
  function handleDeleteWord(id) {
    const newWords = words.filter((w) => w.id !== id)
    const newCards = cards.filter((c) => c.wordId !== id)
    setWords(newWords)
    setCards(newCards)
    writeWordsCache(newWords)
    writeCardsCache(newCards)
    deleteWordCloud(id).catch((err) =>
      console.warn('Cloud-Löschen fehlgeschlagen:', err?.message || err)
    )
  }

  // Zahlen-Challenge als erledigt markieren
  function handleCompleteNumber() {
    completeNumberChallenge()
    setNumberState((s) => ({ ...s, done: true }))
  }

  // Eine Karte bewerten -> neuen Lernstand speichern
  function handleRate(cardId, rating) {
    const target = cards.find((c) => c.id === cardId)
    if (!target) return
    const updatedCard = applyRating(target, rating)
    const next = cards.map((c) => (c.id === cardId ? updatedCard : c))
    setCards(next)
    writeCardsCache(next)
    persistCard(updatedCard).catch((err) =>
      console.warn('Cloud-Speichern (Bewertung) fehlgeschlagen:', err?.message || err)
    )
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-hangul">한국어</div>
          <p>Lade deine Vokabeln…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {offline && (
        <div className="offline-banner">Offline – Änderungen werden lokal gespeichert.</div>
      )}

      <div className="page">
        {view === 'home' && (
          <Home
            vocabCount={words.length}
            dueCount={due.length}
            dailyDone={daily.done}
            dailyLeft={daily.left}
            numberDone={numberState.done}
            onReview={() => setView('review')}
            onDaily={() => setView('daily')}
            onNumber={() => setView('number')}
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
        {view === 'daily' && (
          <DailyWord
            candidates={daily.candidates}
            onIntroduce={handleIntroduce}
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
      </div>

      {view !== 'review' && view !== 'daily' && view !== 'number' && (
        <nav className="tabbar">
          <button
            className={view === 'home' ? 'tab tab-active' : 'tab'}
            onClick={() => setView('home')}
          >
            <HomeIcon />
            <span>Start</span>
          </button>
          <button
            className={view === 'library' ? 'tab tab-active' : 'tab'}
            onClick={() => setView('library')}
          >
            <BookIcon />
            <span>Bibliothek</span>
          </button>
        </nav>
      )}
    </div>
  )
}

export default App
