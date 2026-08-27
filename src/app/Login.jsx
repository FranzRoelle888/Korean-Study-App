import { useState } from 'react'
import { login } from '../core/auth'

/* ============================================================
   LOGIN — erscheint nur, wenn keine Sitzung gespeichert ist.

   Zweisprachig (Englisch · Koreanisch), weil vor dem Login noch
   niemand weiß, wessen Handy das ist. Es gibt bewusst KEINE
   Registrierung — die zwei Konten legt Franz im Supabase-
   Dashboard an, mehr Nutzer soll es nie geben.

   autoComplete-Attribute sind gesetzt, damit das iPhone anbietet,
   das Passwort im Schlüsselbund zu speichern — einmal anmelden,
   dann nie wieder.
   ============================================================ */
function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState(false)

  async function absenden(e) {
    e.preventDefault()
    if (busy || !email.trim() || !pass) return
    setBusy(true)
    setFehler(false)
    try {
      await login(email.trim(), pass)
      /* Erfolg: onAuthChange in App.jsx übernimmt ab hier */
    } catch {
      setFehler(true)
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={absenden}>
        <div className="login-flags" aria-hidden="true">🇰🇷🇩🇪</div>
        <h1 className="login-title">안녕 · Hallo</h1>
        <p className="login-sub">Our language app · 우리 언어 앱</p>

        <label className="login-label">
          Email · 이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </label>

        <label className="login-label">
          Password · 비밀번호
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {fehler && (
          <p className="login-error">
            Login failed — please check email &amp; password.
            <br />
            로그인 실패 — 이메일과 비밀번호를 확인해 주세요.
          </p>
        )}

        <button type="submit" className="login-btn" disabled={busy || !email.trim() || !pass}>
          {busy ? '…' : 'Sign in · 로그인'}
        </button>
      </form>
    </div>
  )
}

export default Login
