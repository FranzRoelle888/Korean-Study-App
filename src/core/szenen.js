/* ============================================================
   SCHAUPLÄTZE für die Satz-Challenge (Franz 08.09.)

   Das Modell greift von sich aus immer zu denselben Szenen („im
   Restaurant"). Deshalb würfelt die App je Runde die Schauplätze aus
   und gibt sie als Vorgabe mit.

   Eigenes, abhängigkeitsfreies Modul, damit der Nachtlauf
   (scripts/baue-satzchallenge.mjs) dieselbe Liste nutzen kann, ohne
   den Browser-Client mitzuladen.
   ============================================================ */
export const SZENEN = [
  'at home', 'in the kitchen', 'at a café', 'on the bus or subway', 'at work', 'talking about the weather',
  'weekend plans', 'family', 'grocery shopping', "at the doctor's", 'on the phone', 'studying',
  'sport and exercise', 'a trip', 'clothes and shopping', 'a hobby', 'meeting a friend', 'the morning routine',
  'in the evening', 'money and paying', 'the post office', 'the library', 'cinema or TV', 'in a park',
  'a birthday', 'the neighbours', 'a pet', 'cooking dinner', 'something got lost', 'making an appointment',
  'being late', 'a small argument', 'the new flat', 'music', 'a photo', 'the weather got cold',
]

export function mischeListe(liste) {
  const a = [...liste]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function zufallsSzenen(n) {
  return mischeListe(SZENEN).slice(0, Math.max(1, n))
}
