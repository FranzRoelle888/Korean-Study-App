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
    /* A2-Sprint (02.09.2026): Menü komplett auf Deutsch —
       die Alltagsbegriffe lernt sie beim Benutzen passiv mit */
    ui: 'de',
    flag: 'de',
    numberChallenge: false,
    /* Statt der Zahl: der/die/das — der eigentliche Brocken */
    articleChallenge: true,
    trainer: false,
    /* Der A2-Trainings-Reiter (Goethe-Prüfung) */
    a2: true,
  },

  /* SANDBOX (Wunsch Franz, 03.09.): baugleich mit 해인s Seite,
     aber eine komplett EIGENE Datenwelt — zum folgenfreien Testen
     neuer Funktionen, bevor sie sie zu sehen bekommt. Bewusst
     nur über die Adresse ?lang=sb erreichbar (kein Knopf) und
     vom Umschalter ausgenommen. Befüllen mit einer Kopie ihrer
     Daten: Actions -> "Sandbox befüllen". */
  sb: {
    id: 'sb',
    name: 'Sandbox 🧪',
    greeting: 'Hallo',
    greetingLang: 'de',
    targetLang: 'de',
    targetName: 'Deutsch',
    knownLang: 'ko',
    knownName: '한국어',
    ui: 'de',
    flag: 'de',
    numberChallenge: false,
    articleChallenge: true,
    trainer: false,
    a2: true,
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

/* ---------- Notizbuch-Theme (Claude-Design-Spec, 05.09.) ----------
   Erst nur die Sandbox; nach Franz' Freigabe kommt 'de' in die
   Liste — mehr braucht der Rollout nicht. Der Schalter setzt in
   App.jsx data-theme='notizbuch' und steuert die kleinen
   Markup-Extras (Gruß, Wochenzeilen-Tiere, Sticker). */
const NOTIZBUCH_PROFILE = ['sb', 'de'] /* Freigabe Franz 05.09. */

export function istNotizbuch(id) {
  return NOTIZBUCH_PROFILE.includes(id)
}
