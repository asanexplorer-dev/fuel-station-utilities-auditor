// TODO: replace with your real Supabase project URL and anon key
// Find these at: Supabase Dashboard -> Project Settings -> API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://PLACEHOLDER_PROJECT.supabase.co"; // TODO: replace with your real Supabase URL
const SUPABASE_ANON_KEY = "PLACEHOLDER_ANON_KEY"; // TODO: replace with your real Supabase anon key

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TABLE = "audits";

// Expected "audits" table schema (create via Supabase SQL editor):
//
// create table audits (
//   id text primary key,
//   station_name text,
//   brand_name text,
//   post_code text,
//   auditor_name text,
//   audit_date text,
//   notes text,
//   data jsonb,           -- all facility fields (Waiting Time, Fuel Card Availability,
//                         -- Loyalty Programs, Parcel Drop-off, Delivery Partners, etc.)
//   created_at timestamp with time zone default now()
// );
// alter table audits enable row level security;
// create policy "allow all (dev mode)" on audits for all using (true) with check (true);
// alter publication supabase_realtime add table audits;

function rowToAudit(row) {
  return { id: row.id, ...(row.data || {}), stationName: row.station_name, brandName: row.brand_name, postCode: row.post_code, auditorName: row.auditor_name, auditDate: row.audit_date, notes: row.notes };
}
function auditToRow(id, audit) {
  const { stationName, brandName, postCode, auditorName, auditDate, notes, ...rest } = audit;
  return { id, station_name: stationName, brand_name: brandName, post_code: postCode, auditor_name: auditorName, audit_date: auditDate, notes: notes || "", data: rest };
}

async function fetchAll() {
  const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(rowToAudit);
}

window.__supabase = {
  client: supabase,
  table: TABLE,
  rowToAudit,
  auditToRow,
  async insert(audit) {
    const id = String(Date.now());
    const { error } = await supabase.from(TABLE).insert(auditToRow(id, audit));
    if (error) throw error;
    return id;
  },
  async update(id, audit) {
    const { error } = await supabase.from(TABLE).update(auditToRow(id, audit)).eq("id", id);
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
  },
  fetchAll,
  subscribe(onChange) {
    fetchAll().then(onChange).catch(err => console.warn('Supabase fetch failed, using local fallback:', err));
    return supabase
      .channel("audits-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
        fetchAll().then(onChange).catch(() => {});
      })
      .subscribe();
  },
};
window.dispatchEvent(new Event("supabase-ready"));
