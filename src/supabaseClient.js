import { createClient } from '@supabase/supabase-js'

/* ============================================================
   Verbindung zu deiner Supabase-Datenbank.

   Beide Werte sind ÖFFENTLICH und dürfen im Code stehen:
   - die Projekt-URL
   - der "publishable"-Schlüssel (Supabase sagt selbst: safe to
     share publicly). Geschützt wird die DB über die Regeln
     (Row Level Security), die wir per SQL angelegt haben.

   Der GEHEIME "secret"-Schlüssel steht bewusst NICHT hier.
   ============================================================ */

const SUPABASE_URL = 'https://gkrubhwwzgekmbiltslt.supabase.co'
const SUPABASE_KEY = 'sb_publishable_V2Gk_hicg121JPtU3e6Quw_224_v0_Q'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
