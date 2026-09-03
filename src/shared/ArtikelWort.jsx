/* ============================================================
   ARTIKEL-FARBCODE (Notizbuch-Spec 3.7, app-weiter Grundsatz)

   der = Lavendel · die = Rosé · das = Gold-Tinte.
   Deutsche Wörter stehen im Stapel MIT Artikel („der Tisch") —
   dieser Baustein trennt den Artikel ab und färbt ihn. Die
   Farben existieren nur unter dem Notizbuch-Theme; überall
   sonst erbt der span einfach die Textfarbe — deshalb darf der
   Baustein bedenkenlos auf allen Seiten benutzt werden.
   ============================================================ */

export function ArtikelWort({ text }) {
  const treffer = /^(der|die|das) (.+)$/.exec(text ?? '')
  if (!treffer) return text ?? ''
  return (
    <>
      <span className={`art-${treffer[1]}`}>{treffer[1]}</span> {treffer[2]}
    </>
  )
}
