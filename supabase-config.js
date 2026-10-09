const SUPABASE_URL = "https://jxdcmkdsbdompvyoqjbp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rgVAuatgi9YljulaOTLbZA_rhKOS0Ar";
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

/* La lib est cherchée en local d'abord (vendor/supabase.js, chargé par index.html),
   puis via le CDN en secours. Nouvelle tentative automatique au retour du réseau. */
function initSupabaseClient(){
  if (window.supabaseClient) return true;
  if (window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try { window.dispatchEvent(new Event('supabase-ready')); } catch(e) {}
    return true;
  }
  return false;
}
function loadSupabaseFromCdn(){
  if (window.supabaseClient || document.getElementById('supabase-cdn-script')) return;
  const s = document.createElement('script');
  s.id = 'supabase-cdn-script';
  s.src = SUPABASE_CDN;
  s.onload = initSupabaseClient;
  s.onerror = () => { s.remove(); }; // échec (hors-ligne) : on pourra retenter
  document.head.appendChild(s);
}
if (!initSupabaseClient()) {
  loadSupabaseFromCdn();
  window.addEventListener('online', loadSupabaseFromCdn);
}
var supabaseClient = window.supabaseClient || null;
