/* ============================================================
   APP-IDENTITÄT je Seite: Titel, Homescreen-Icon, Manifest
   (Franz 07.09.: Haeins App heisst „Deutsch <3" und traegt den
   gezeichneten Hasen mit Flagge)

   Beide Seiten liegen unter derselben Adresse (?lang=…), index.html
   ist statisch. Deshalb setzt die App die Kennung selbst, sobald das
   Profil feststeht:
   - document.title          -> Tab-Titel und iOS-Vorschlag beim
                                „Zum Home-Bildschirm"
   - apple-mobile-web-app-title -> der Name unter dem iOS-Icon
   - apple-touch-icon        -> das iOS-Homescreen-Icon
   - link rel=manifest       -> Android/Chrome: Name, Icon, Startadresse

   WICHTIG (iOS): Icon und Name werden beim Hinzufuegen zum Home-
   Bildschirm EINGEFROREN. Eine schon installierte Verknuepfung
   aendert sich nicht — sie muss einmal entfernt und neu hinzugefuegt
   werden. Android/Chrome zieht Manifest-Aenderungen von selbst nach.

   Pfade tragen den Vite-Basispfad (/Korean-Study-App/ im Build).
   ============================================================ */

const BASIS = import.meta.env.BASE_URL || '/'

const IDENTITAET = {
  ko: { titel: '한국어 · Franz', kurz: '한국어', icon: 'icons/baer-180.png', manifest: 'manifest-ko.json' },
  de: { titel: 'Deutsch <3', kurz: 'Deutsch <3', icon: 'icons/hase-180.png', manifest: 'manifest-de.json' },
  /* Sandbox sieht aus wie ihre Seite, heisst aber anders */
  sb: { titel: 'Sandbox 🧪', kurz: 'Sandbox', icon: 'icons/hase-180.png', manifest: 'manifest-de.json' },
}

function setzeLink(rel, href, extra = {}) {
  let el = document.head.querySelector(`link[rel="${rel}"][data-app]`)
  if (!href) {
    if (el) el.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    el.dataset.app = '1'
    document.head.appendChild(el)
  }
  el.href = href
  for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v)
}

function setzeMeta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

export function setzeAppIdentitaet(profileId) {
  const id = IDENTITAET[profileId] || IDENTITAET.ko
  document.title = id.titel
  setzeMeta('apple-mobile-web-app-title', id.kurz)
  setzeLink('apple-touch-icon', id.icon ? BASIS + id.icon : null, { sizes: '180x180' })
  setzeLink('manifest', BASIS + id.manifest)
}
