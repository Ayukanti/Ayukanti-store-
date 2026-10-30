const SUPABASE_URL = "https://nbqvaonvieyrmbaunkmr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icXZhb252aWV5cm1iYXVua21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzY2MzAsImV4cCI6MjEwODk1MjYzMH0.WlhanAIyuhd3fg0XdNMCQ-lsgpjbjVp-Z4yI8WbhwFM";

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
