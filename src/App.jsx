import { useState, useEffect } from 'react'
import './App.css'
import {
  loadInitial,
  validateNewWord,
  persistNewWord,
  persistCard,
  applyRating,
  dueCards,
  writeWordsCache,
  writeCardsCache,
} from './storage'
import Home from './Home'
import Library from './Library'
import Review from './Review'
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
            onReview={() => setView('review')}
          />
        )}
        {view === 'library' && <Library vocab={words} onAdd={handleAdd} />}
        {view === 'review' && (
          <Review initialQueue={due} onRate={handleRate} onExit={() => setView('home')} />
        )}
      </div>

      {view !== 'review' && (
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
