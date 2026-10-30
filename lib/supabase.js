const SUPABASE_URL = "https://nbqvaonvieyrmbaunkmr.supabase.co";
const SUPABASE_ANON_KEY = "Sb_publishable_vd-6bBiawyuskflS2wvkrw_8C7ysmm1";

export async function supabaseFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options?.prefer || "return=representation",
      ...options?.headers,
    },
  });
  return res.json();
}
