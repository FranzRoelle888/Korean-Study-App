/* ============================================================
   SATZ-HILFE — Wörter der Aufgabe, die noch nicht in der Bibliothek
   stehen (Franz 09.10.)

   Der Satz-Baukasten darf in kleiner Menge fremde Wörter benutzen:
   so begegnet man Neuem im Zusammenhang. Lösbar bleibt die Aufgabe
   aber nur mit Übersetzung — deshalb steht jedes solche Wort als
   kleiner Zettel unter der Aufgabe: das Wort in der Lernsprache, die
   Bedeutung in der Sprache, die man kann.

   hilfe: [{ wort, bedeutung }] — kommt mit dem Satz aus der Bank
   bzw. aus der Function (core/baukasten.js, pruefeSaetze). Fehlt sie
   oder ist sie leer, zeigt die Komponente nichts.
   ============================================================ */
function SatzHilfe({ hilfe, lang }) {
  if (!Array.isArray(hilfe) || !hilfe.length) return null
  return (
    <p className="tc-hilfe">
      {hilfe.map((h, i) => (
        <span key={i} className="tc-hilfe-wort">
          <b lang={lang}>{h.wort}</b> = {h.bedeutung}
        </span>
      ))}
    </p>
  )
}

export default SatzHilfe
