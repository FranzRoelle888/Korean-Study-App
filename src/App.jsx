import { useState } from 'react'
import './App.css'
import { loadVocab, loadCards, addWord, rateCard, dueCards } from './storage'
import Home from './Home'
import Library from './Library'
import Review from './Review'
import { HomeIcon, BookIcon } from './icons'

/* ============================================================
   APP = der "Verteiler".
   - view: welche Ansicht ist offen ('home' | 'library' | 'review')
   - words: die Vokabeln (für Bibliothek + Duplikat-Sperre)
   - cards: die Karteikarten (zwei je Vokabel) mit Lernständen
   ============================================================ */

function App() {
  const [view, setView] = useState('home')
  const [words, setWords] = useState(loadVocab)
  const [cards, setCards] = useState(() => loadCards(loadVocab()))

  // heute fällige Karten (mit en/ko verbunden)
  const due = dueCards(words, cards)

  // Vokabel hinzufügen -> Wort + zwei Karten
  function handleAdd(en, ko) {
    const result = addWord(words, cards, en, ko)
    if (result.error) return result
    setWords(result.words)
    setCards(result.cards)
    return result
  }

  // Eine Karte bewerten -> neuen Lernstand speichern
  function handleRate(cardId, rating) {
    setCards((cur) => rateCard(cur, cardId, rating))
  }

  return (
    <div className="app">
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

      {/* Untere Leiste nur außerhalb der Wiederholung zeigen (Fokus) */}
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
