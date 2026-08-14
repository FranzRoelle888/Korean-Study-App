import {
  FlameIcon,
  SparkIcon,
  CardsIcon,
  ChevronIcon,
  HashIcon,
  CheckIcon,
  KoreanFlag,
  GermanFlag,
  MountainBand,
  SkylineBand,
} from './icons'

/* ============================================================
   STARTSEITE (Begrüßung, Streak, Tagesaufgaben)

   Alle Texte kommen von aussen:
     t   Menütexte (Englisch oder Koreanisch)
     tt  Texte in der Zielsprache (Koreanisch oder Deutsch)
   ============================================================ */

function Home({
  vocabCount,
  dueCount,
  dailyDone,
  dailyLeft,
  numberDone,
  streak,
  week,
  onReview,
  onDaily,
  onNumber,
  onCalendar,
  onSwitchProfile,
  profile,
  t,
  tt,
}) {
  const Flag = profile.flag === 'de' ? GermanFlag : KoreanFlag
  /* Bergkette bzw. Stadtsilhouette hinter dem Inhalt */
  const Band = profile.id === 'de' ? SkylineBand : MountainBand

  return (
    <div className="screen">
      {/* ---------- Begrüßung + Streak ---------- */}
      <header className="header">
        <div className="greeting-row">
          <div className="greeting">
            <h1 className="greeting-hello">
              <span className="greeting-ko" lang={profile.greetingLang}>
                {profile.greeting}
              </span>
              {profile.name && <span className="greeting-name">{profile.name}</span>}
            </h1>
            <p className="greeting-sub">{t.ready}</p>
          </div>

          {/* Flagge = Umschalter auf die andere Seite der App */}
          <button className="flag-switch" onClick={onSwitchProfile} title={t.switchLanguage}>
            <Flag />
          </button>
        </div>

        <button className="streak-card" onClick={onCalendar}>
          <div className="streak-top">
            <FlameIcon />
            <span className="streak-count">{streak}</span>
            <span className="streak-label">{t.dayStreak}</span>
            <ChevronIcon />
          </div>
          <div className="streak-days">
            {week.map((d) => (
              <div key={d.day} className={d.isToday ? 'streak-day streak-day-today' : 'streak-day'}>
                <div className={d.done ? 'dot dot-on' : 'dot'} />
                <span className="dot-label" lang={profile.targetLang}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </button>
      </header>

      {/* ---------- Tagesaufgaben ---------- */}
      <main className="actions">
        <button
          className={dailyDone ? 'action action-secondary' : 'action action-full action-full-purple'}
          onClick={onDaily}
        >
          <div className="action-icon">
            <SparkIcon />
          </div>
          <div className="action-text">
            <span className="action-title">{t.wordOfDay}</span>
            <span className="action-sub" lang={profile.targetLang}>
              {tt.wordOfDay}
            </span>
          </div>
          {dailyDone ? (
            <span className="done-check">
              <CheckIcon />
            </span>
          ) : (
            <ChevronIcon />
          )}
        </button>

        <button
          className={dueCount > 0 ? 'action action-full action-full-orange' : 'action action-secondary'}
          onClick={onReview}
        >
          <div className="action-icon action-icon-accent">
            <CardsIcon />
          </div>
          <div className="action-text">
            <span className="action-title">{t.review}</span>
            <span className="action-sub" lang={profile.targetLang}>
              {tt.review}
            </span>
          </div>
          {dueCount > 0 ? (
            <span className="badge">{dueCount}</span>
          ) : (
            <span className="done-check">
              <CheckIcon />
            </span>
          )}
        </button>

        {/* Die Zahl des Tages gibt es nur beim Koreanisch-Lernen —
            auf Deutsch wäre sie zu einfach. */}
        {profile.numberChallenge && (
          <button
            className={numberDone ? 'action action-secondary' : 'action action-full action-full-green'}
            onClick={onNumber}
          >
            <div className="action-icon action-icon-number">
              <HashIcon />
            </div>
            <div className="action-text">
              <span className="action-title">{t.numberOfDay}</span>
              <span className="action-sub" lang={profile.targetLang}>
                {tt.numberOfDay}
              </span>
            </div>
            {numberDone ? (
              <span className="done-check">
                <CheckIcon />
              </span>
            ) : (
              <ChevronIcon />
            )}
          </button>
        )}

        <p className="vocab-count-note">{t.wordsInLibrary(vocabCount)}</p>
      </main>

      {/* Liegt hinter dem Inhalt (siehe .mountain-band in App.css) */}
      <Band />
    </div>
  )
}

export default Home
