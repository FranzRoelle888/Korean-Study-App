/* ============================================================
   ZWEI SEITEN DERSELBEN APP

   'ko'  Franz lernt Koreanisch, Menü auf Englisch
   'de'  seine Freundin lernt Deutsch, Menü auf Koreanisch

   Das Kürzel steckt an EINER Stelle (hier) und wird von
   storage.js an jede Datenbank-Abfrage gehängt. Dadurch sind die
   Daten der beiden vollständig getrennt: es gibt keine Zeile, die
   beiden gehört, also kann auch keiner den anderen überschreiben.
   ============================================================ */

/* Ihr Name für die Begrüßung. Leer lassen = nur "Hallo".
   Hier eintragen, sonst ändert sich nichts. */
const HER_NAME = '해인'

export const PROFILES = {
  ko: {
    id: 'ko',
    name: 'Franz',
    /* Begrüßung immer in der ZIELsprache */
    greeting: '안녕하세요',
    greetingLang: 'ko',
    /* Sprache, die gelernt wird — bestimmt auch das lang-Attribut,
       damit der Browser die richtige Schrift wählt */
    targetLang: 'ko',
    targetName: 'Korean',
    /* Sprache, in der die Bedeutung steht (die man schon kann) */
    knownLang: 'en',
    knownName: 'English',
    /* Menüsprache */
    ui: 'en',
    flag: 'kr',
    /* Die Zahlen-Challenge gibt es nur auf der koreanischen Seite —
       auf Deutsch wäre sie zu einfach. */
    numberChallenge: true,
    articleChallenge: false,
    /* Der Trainer startet als Test bei Franz; 해인 folgt, sobald er
       sich bewaehrt hat (Konzept, Runde 3). */
    trainer: true,
  },

  de: {
    id: 'de',
    name: HER_NAME,
    greeting: 'Hallo',
    greetingLang: 'de',
    targetLang: 'de',
    targetName: 'Deutsch',
    knownLang: 'ko',
    knownName: '한국어',
    ui: 'ko',
    flag: 'de',
    numberChallenge: false,
    /* Statt der Zahl: der/die/das — der eigentliche Brocken */
    articleChallenge: true,
    trainer: false,
  },
}

export const DEFAULT_PROFILE = 'ko'
const STORE_KEY = 'korean-app:profile'

/* Welche Seite ist gemeint?
   1. ?lang=de in der Adresse (damit man sich SEINE Seite auf den
      Startbildschirm legen kann und immer richtig landet)
   2. sonst das, was zuletzt gewählt wurde
   3. sonst die koreanische Seite */
export function readProfile() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    if (fromUrl && PROFILES[fromUrl]) return fromUrl
    const saved = localStorage.getItem(STORE_KEY)
    if (saved && PROFILES[saved]) return saved
  } catch {
    /* kein Zugriff auf Adresse/Speicher — dann eben der Standard */
  }
  return DEFAULT_PROFILE
}

/* Umschalten. Schreibt die Wahl auch in die Adresse, damit ein
   Neuladen oder ein Lesezeichen auf derselben Seite bleibt. */
export function writeProfile(id) {
  if (!PROFILES[id]) return
  try {
    localStorage.setItem(STORE_KEY, id)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', id)
    window.history.replaceState({}, '', url)
  } catch {
    /* nicht schlimm — die App läuft auch ohne */
  }
}

export function otherProfile(id) {
  return id === 'ko' ? 'de' : 'ko'
}
