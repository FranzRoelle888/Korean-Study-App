import {
  FlameIcon,
  SparkIcon,
  CardsIcon,
  ChevronIcon,
  HashIcon,
  CheckIcon,
  QuoteIcon,
  KoreanFlag,
  GermanFlag,
  MountainBand,
  SkylineBand,
} from '../../shared/icons'
import { istNotizbuch } from '../../core/profiles'
import { BaerIcon, HaseIcon, HeuteKringel, StreakHerz, GrussKringel } from '../../shared/sticker'

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
  onArticle,
  articleDone,
  articleReady,
  articleKind,
  onCalendar,
  onSwitchProfile,
  onKalibrierung,
  kalOffen,
  onStudioTest,
  onArtikelTest,
  profile,
  t,
  tt,
}) {
  const Flag = profile.flag === 'de' ? GermanFlag : KoreanFlag
  /* Bergkette bzw. Stadtsilhouette hinter dem Inhalt */
  const Band = profile.targetLang === 'de' ? SkylineBand : MountainBand
  /* Notizbuch-Theme (Design-Spec 05.09.): Gruß in Handschrift,
     Herz statt Flamme, Bär & Hase in der Wochenzeile */
  const notiz = istNotizbuch(profile.id)

  return (
    <div className="screen">
      {/* ---------- Begrüßung + Streak ---------- */}
      <header className="header">
        <div className="greeting-row">
          <div className="greeting">
            {notiz ? (
              /* M2: Handschrift-Gruß mit Marker-Unterlegung + Kringel */
              <>
                <h1 className="greeting-hello notiz-gruss" lang="de">
                  Hallo, <em>Haein</em>!{' '}
                  <span className="margin-note" aria-hidden="true">화이팅! ♡</span>
                </h1>
                <GrussKringel />
                <p className="greeting-sub">{t.ready}</p>
              </>
            ) : (
              <>
                <h1 className="greeting-hello">
                  <span className="greeting-ko" lang={profile.greetingLang}>
                    {profile.greeting}
                  </span>
                  {profile.name && <span className="greeting-name">{profile.name}</span>}
                </h1>
                <p className="greeting-sub">{t.ready}</p>
              </>
            )}
          </div>

          {/* Die Flagge ist nur noch DEKO (Entscheidung Franz 06.09.:
              kein Profil-Wechsel mehr in der App — jede Handy-
              Verknüpfung zeigt fest ihre Seite über ?lang=…).
              Im Notizbuch-Theme als „angeklebter" Sticker (M6). */}
          <span className={notiz ? 'flag-switch notiz-flagge' : 'flag-switch'} aria-hidden="true">
            {notiz && <span className="notiz-tape" />}
            <Flag />
          </span>
        </div>

        <button className="streak-card" onClick={onCalendar}>
          <div className="streak-top">
            {/* M3: im Notizbuch-Theme schlägt das Herz statt der Flamme */}
            {notiz ? <StreakHerz aktiv={streak > 0} /> : <FlameIcon />}
            <span className="streak-count">{streak}</span>
            <span className="streak-label">{t.dayStreak}</span>
            <ChevronIcon />
          </div>
          <div className="streak-days">
            {week.map((d) => (
              <div key={d.day} className={d.isToday ? 'streak-day streak-day-today' : 'streak-day'}>
                {/* Links = ich, rechts = Partner. So sieht jeder auf
                    einen Blick, ob der andere heute schon dran war. */}
                {notiz ? (
                  /* M4: Bär & Hase als Tagesmarker (Haein = Hase,
                     Franz = Bär) — beide gelernt: überlappend */
                  <span
                    className={
                      'notiz-tag' +
                      (d.done && d.partnerDone ? ' notiz-tag-beide' : '') +
                      (d.done || d.partnerDone ? '' : ' notiz-tag-leer')
                    }
                  >
                    {d.done && <HaseIcon size={24} />}
                    {d.partnerDone && <BaerIcon size={24} />}
                    {!d.done && !d.partnerDone &&
                      (d.isToday ? <HeuteKringel size={22} /> : <span className="day-dot" />)}
                  </span>
                ) : (
                  <div
                    className={
                      'dot' + (d.done ? ' dot-self' : '') + (d.partnerDone ? ' dot-partner' : '')
                    }
                  />
                )}
                <span className="dot-label" lang={profile.targetLang}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
          {/* Wochen-Zeile (Entscheidung Franz: Ergänzung zum Streak,
              kein Ersatz) — zählt die eigenen Punkte dieser Woche */}
          <span className="week-note">
            {t.weekLearned(week.filter((d) => d.done).length)}
          </span>
        </button>
      </header>

      {/* ---------- Tagesaufgaben ---------- */}
      <main className="actions">
        {/* Das Kalibrierungs-Banner flog raus (Franz 06.09.: nervte
            im Hauptmenü) — die Einstufung wohnt im Profil unter
            „Meine Grammatik". */}
        {/* Vorläufiger Test-Zugang zum Grammatik-Studio — fliegt
            raus, sobald das Studio im Tagespensum/Dojo hängt */}
        {onStudioTest && (
          <button className="studio-test" onClick={onStudioTest}>
            🧪 {t.studioTestBtn}
          </button>
        )}
        {/* Artikel-Swipe: der/die/das-Spiel (nur de-Seite) */}
        {onArtikelTest && (
          <button className="studio-test" onClick={onArtikelTest}>
            🃏 {t.modeArtikel}
          </button>
        )}
        <button
          className={dailyDone ? 'action action-secondary aktion-wort' : 'action action-full action-full-purple aktion-wort'}
          onClick={onDaily}
        >
          <div className="action-icon">
            <SparkIcon />
          </div>
          <div className="action-text">
            <span className="action-title">{t.wordOfDay}</span>
            {/* de-Seite: koreanischer Untertitel (Sprachregel 05.09.);
                sonst wie gehabt die Zielsprache */}
            <span className="action-sub" lang={t.wordOfDaySub ? 'ko' : profile.targetLang}>
              {t.wordOfDaySub ?? tt.wordOfDay}
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
          className={dueCount > 0 ? 'action action-full action-full-orange aktion-wdh' : 'action action-secondary aktion-wdh'}
          onClick={onReview}
        >
          <div className="action-icon action-icon-accent">
            <CardsIcon />
          </div>
          <div className="action-text">
            <span className="action-title">{t.review}</span>
            <span className="action-sub" lang={t.reviewSub ? 'ko' : profile.targetLang}>
              {t.reviewSub ?? tt.review}
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

        {/* Artikel des Tages — das Gegenstueck auf der deutschen Seite */}
        {profile.articleChallenge && articleReady && (
          <button
            className={articleDone ? 'action action-secondary aktion-tages' : 'action action-full action-full-gold aktion-tages'}
            onClick={onArticle}
          >
            <div className="action-icon action-icon-number">
              <QuoteIcon />
            </div>
            <div className="action-text">
              <span className="action-title">
                {articleKind === 'plural'
                  ? t.pluralOfDay
                  : articleKind === 'conj'
                    ? t.conjOfDay
                    : t.articleOfDay}
              </span>
              <span className="action-sub" lang={t.articleOfDaySub ? 'ko' : profile.targetLang}>
                {articleKind === 'plural'
                  ? (t.pluralOfDaySub ?? tt.pluralOfDay)
                  : articleKind === 'conj'
                    ? (t.conjOfDaySub ?? tt.conjOfDay)
                    : (t.articleOfDaySub ?? tt.articleOfDay)}
              </span>
            </div>
            {articleDone ? (
              <span className="done-check">
                <CheckIcon />
              </span>
            ) : (
              <ChevronIcon />
            )}
          </button>
        )}

        {/* Der Niveau-Fortschritt zog ins Profil um („Meine
            Grammatik", Wunsch Franz 05.09.) */}
        <p className="vocab-count-note">{t.wordsInLibrary(vocabCount)}</p>
      </main>

      {/* Bau-Kennung: welche Version läuft gerade? (Cache-Kontrolle) */}
      <span className="version-note">v {__BUILD_KENNUNG__}</span>

      {/* Liegt hinter dem Inhalt (siehe .mountain-band in App.css) */}
      <Band />
    </div>
  )
}

export default Home
