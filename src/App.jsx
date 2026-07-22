import { useState } from 'react'
import './App.css'
import { loadVocab, addWord } from './storage'
import Home from './Home'
import Library from './Library'
import { HomeIcon, BookIcon } from './icons'

/* ============================================================
   APP = der "Verteiler".
   - merkt sich, welcher Tab offen ist (Start oder Bibliothek)
   - hält die Vokabel-Liste als Zustand ("state")
   - reicht die Umschalt-Leiste (tabbar) unten immer mit an
   ============================================================ */

function App() {
  const [tab, setTab] = useState('home') // 'home' oder 'library'
  // loadVocab wird nur EINMAL beim Start ausgeführt (Funktion übergeben)
  const [vocab, setVocab] = useState(loadVocab)

  // Wird von der Bibliothek aufgerufen, wenn eine Vokabel dazukommt.
  function handleAdd(en, ko) {
    const result = addWord(vocab, en, ko)
    if (result.error) return result // Fehler zurück an die Bibliothek
    setVocab(result.list) // neue Liste merken -> Oberfläche aktualisiert sich
    return result
  }

  return (
    <div className="app">
      {/* Der obere, wechselnde Bereich */}
      <div className="page">
        {tab === 'home' ? (
          <Home vocabCount={vocab.length} />
        ) : (
          <Library vocab={vocab} onAdd={handleAdd} />
        )}
      </div>

      {/* Die feste Leiste ganz unten */}
      <nav className="tabbar">
        <button
          className={tab === 'home' ? 'tab tab-active' : 'tab'}
          onClick={() => setTab('home')}
        >
          <HomeIcon />
          <span>Start</span>
        </button>
        <button
          className={tab === 'library' ? 'tab tab-active' : 'tab'}
          onClick={() => setTab('library')}
        >
          <BookIcon />
          <span>Bibliothek</span>
        </button>
      </nav>
    </div>
  )
}

export default App
