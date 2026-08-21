/* ============================================================
   EINGABEFELD MIT LÖSCH-KNOPF

   Ein kleines × rechts im Feld, das den ganzen Inhalt leert.
   Erscheint nur, wenn etwas drinsteht.

   Zwei Feinheiten, die auf dem Handy den Unterschied machen:

   - onMouseDown/onTouchStart verhindern das Standardverhalten.
     Ohne das verliert das Feld beim Antippen des × den Fokus,
     die Tastatur klappt zu und gleich wieder auf — genau das
     Zucken, das wir loswerden wollen.
   - Nach dem Leeren bekommt das Feld den Fokus zurück, damit man
     direkt weitertippen kann.
   ============================================================ */

function ClearableInput({ value, onChange, onClear, className, wrapClassName, ...rest }) {
  let feld = null

  function leeren() {
    onClear()
    if (feld) feld.focus()
  }

  return (
    <span className={wrapClassName ? `input-wrap ${wrapClassName}` : 'input-wrap'}>
      <input
        ref={(el) => (feld = el)}
        className={className}
        value={value}
        onChange={onChange}
        {...rest}
      />
      {value && (
        <button
          type="button"
          className="input-clear"
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          onClick={leeren}
          aria-label="Clear"
          tabIndex={-1}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </span>
  )
}

export default ClearableInput
