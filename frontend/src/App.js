import { useState, useEffect, useCallback, useRef } from "react";

// ── API CONFIG ─────────────────────────────────────────────────────────────
const API_BASE = "http://192.168.131.184:5000";

// ── API HELPER ─────────────────────────────────────────────────────────────
// Central fetch wrapper — attaches JWT, handles errors, returns { data, error }
async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem("tf_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json.error || json.message || `HTTP ${res.status}`;
      return { data: null, error: msg };
    }
    return { data: json, error: null };
  } catch (err) {
    return { data: null, error: "Cannot reach server — check backend is running." };
  }
}

// ── SHARED DATA HOOK ───────────────────────────────────────────────────────
// Reusable hook for GET endpoints: handles loading, error, refresh
function useFetch(path, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: json, error: err } = await apiFetch(path);
    if (err) setError(err);
    else     setData(json);
    setLoading(false);
  }, [path]); // eslint-disable-line

  useEffect(() => { load(); }, [load, ...deps]); // eslint-disable-line

  return { data, loading, error, reload: load };
}

// ── CATEGORY LIST (static — not from backend) ──────────────────────────────
const CATEGORIES = ["Music", "Conference", "Food", "Entertainment", "Sports", "Art", "Tech"];

// ── EMOJI MAP — derive emoji from category since backend doesn't store it ──
const CATEGORY_EMOJI = {
  Music: "🎧", Conference: "💡", Food: "🍜",
  Entertainment: "🎭", Sports: "🏃", Art: "🎨", Tech: "💻",
};
function eventEmoji(ev) {
  return CATEGORY_EMOJI[ev.category] || "🎫";
}

// ── NORMALISE API EVENT ────────────────────────────────────────────────────
// Backend shape → UI shape (tickets_available, status, formatted date)
function normaliseEvent(ev) {
  const soldOut = ev.tickets_available <= 0;
  return {
    ...ev,
    status: soldOut ? "Sold Out" : "On Sale",
    sold:   (ev.capacity ?? 0) - (ev.tickets_available ?? 0),
    // Keep ISO date but also make a display date
    displayDate: ev.date ? ev.date.split("T")[0] : "",
    displayTime: ev.date ? new Date(ev.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
  };
}

// ── STYLES ─────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0A0E1A;
    --surface:  #111827;
    --surface2: #1a2235;
    --border:   #1f2d45;
    --accent:   #6C63FF;
    --accent2:  #8B85FF;
    --amber:    #F59E0B;
    --green:    #10B981;
    --red:      #EF4444;
    --text:     #F1F5F9;
    --muted:    #64748B;
    --muted2:   #94A3B8;
    --sidebar-w: 240px;
    --radius:   12px;
  }

  body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

  /* ── Layout ── */
  .app { display: flex; min-height: 100vh; }

  .sidebar {
    width: var(--sidebar-w); background: var(--surface); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; padding: 24px 16px; gap: 6px;
    position: fixed; top: 0; left: 0; height: 100vh; z-index: 100;
  }

  .logo {
    display: flex; align-items: center; gap: 10px; padding: 0 8px 24px;
    border-bottom: 1px solid var(--border); margin-bottom: 12px;
  }
  .logo-icon {
    width: 36px; height: 36px; background: var(--accent); border-radius: 8px;
    display: flex; align-items: center; justify-content: center; font-size: 18px;
  }
  .logo-text { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
  .logo-text span { color: var(--accent2); }

  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;
    color: var(--muted2); transition: all 0.15s; border: none; background: none; width: 100%; text-align: left;
  }
  .nav-item:hover { background: var(--surface2); color: var(--text); }
  .nav-item.active { background: rgba(108,99,255,0.15); color: var(--accent2); }
  .nav-item .icon { font-size: 16px; width: 20px; text-align: center; }

  .sidebar-footer { margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); }
  .user-chip {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px;
    background: var(--surface2); cursor: pointer;
  }
  .avatar {
    width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent), #A855F7);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .user-name { font-size: 13px; font-weight: 600; }
  .user-role { font-size: 11px; color: var(--muted); }

  .main { margin-left: var(--sidebar-w); flex: 1; padding: 28px 32px; min-height: 100vh; }

  .page-header { margin-bottom: 28px; }
  .page-title { font-size: 22px; font-weight: 700; letter-spacing: -0.4px; margin-bottom: 4px; }
  .page-sub { font-size: 13px; color: var(--muted2); }

  /* ── Cards ── */
  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px;
  }

  /* ── Stat Cards ── */
  .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card { position: relative; overflow: hidden; }
  .stat-card::after {
    content: ''; position: absolute; right: -20px; top: -20px;
    width: 80px; height: 80px; border-radius: 50%; opacity: 0.08;
    background: var(--accent);
  }
  .stat-label { font-size: 12px; color: var(--muted2); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .stat-value { font-size: 28px; font-weight: 800; letter-spacing: -1px; }
  .stat-delta { font-size: 12px; margin-top: 6px; color: var(--green); }

  /* ── Section grid ── */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
  .see-all { font-size: 12px; color: var(--accent2); cursor: pointer; font-weight: 500; }

  /* ── Event ticket card ── */
  .event-ticket {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 10px;
    overflow: hidden; margin-bottom: 12px; display: flex; align-items: stretch;
  }
  .ticket-stub {
    width: 56px; display: flex; align-items: center; justify-content: center;
    font-size: 26px; background: rgba(108,99,255,0.1); flex-shrink: 0;
    border-right: 2px dashed var(--border); position: relative;
  }
  .ticket-body { padding: 12px 14px; flex: 1; }
  .ticket-title { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
  .ticket-meta { font-size: 11px; color: var(--muted2); margin-bottom: 6px; }
  .ticket-footer { display: flex; align-items: center; justify-content: space-between; }
  .ticket-price { font-size: 13px; font-weight: 700; color: var(--accent2); }
  .progress-bar { height: 4px; background: var(--border); border-radius: 2px; margin-top: 6px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 2px; background: var(--accent); transition: width 0.3s; }
  .progress-fill.danger { background: var(--red); }
  .progress-fill.warn { background: var(--amber); }

  /* ── Badge / Status ── */
  .badge {
    display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px;
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
  }
  .badge-green { background: rgba(16,185,129,0.15); color: var(--green); }
  .badge-amber { background: rgba(245,158,11,0.15); color: var(--amber); }
  .badge-red   { background: rgba(239,68,68,0.15);  color: var(--red); }
  .badge-blue  { background: rgba(108,99,255,0.15); color: var(--accent2); }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; text-align: left; padding: 0 12px 10px; font-weight: 600; }
  td { padding: 10px 12px; font-size: 13px; border-top: 1px solid var(--border); vertical-align: middle; }
  tr:hover td { background: var(--surface2); }

  /* ── Button ── */
  .btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px;
    border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
    border: none; transition: all 0.15s; font-family: 'Inter', sans-serif;
  }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover:not(:disabled) { background: var(--accent2); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: var(--muted2); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--surface2); color: var(--text); }
  .btn-sm { padding: 6px 12px; font-size: 12px; }

  /* ── Form ── */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group.full { grid-column: 1 / -1; }
  label { font-size: 12px; font-weight: 600; color: var(--muted2); text-transform: uppercase; letter-spacing: 0.4px; }
  input, select, textarea {
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    color: var(--text); font-size: 14px; padding: 10px 12px; font-family: 'Inter', sans-serif;
    transition: border-color 0.15s; outline: none;
  }
  input:focus, select:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(108,99,255,0.15); }
  textarea { resize: vertical; min-height: 90px; }
  select option { background: var(--surface); }
  .form-divider { height: 1px; background: var(--border); grid-column: 1/-1; margin: 4px 0; }

  /* ── Login ── */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--bg); padding: 24px;
  }
  .login-card {
    width: 100%; max-width: 400px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 16px; padding: 40px;
  }
  .login-logo { text-align: center; margin-bottom: 32px; }
  .login-logo .logo-icon { width: 52px; height: 52px; font-size: 26px; margin: 0 auto 12px; border-radius: 12px; }
  .login-logo h1 { font-size: 20px; font-weight: 700; }
  .login-logo p { font-size: 13px; color: var(--muted2); margin-top: 4px; }

  /* ── Booking ── */
  .booking-wrap { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
  .event-select-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .event-select-card {
    background: var(--surface2); border: 2px solid var(--border); border-radius: 10px;
    padding: 14px; cursor: pointer; transition: all 0.15s;
  }
  .event-select-card:hover { border-color: var(--accent); }
  .event-select-card.selected { border-color: var(--accent); background: rgba(108,99,255,0.08); }
  .event-select-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  .event-select-meta { font-size: 11px; color: var(--muted2); }

  .summary-box { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; position: sticky; top: 24px; }
  .summary-row { display: flex; justify-content: space-between; font-size: 13px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .summary-row:last-of-type { border: none; }
  .summary-total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; padding-top: 12px; margin-top: 8px; border-top: 1px solid var(--border); }

  /* ── Events List ── */
  .events-toolbar { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; }
  .search-input { flex: 1; }
  .filter-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .filter-chip {
    padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
    border: 1px solid var(--border); background: transparent; color: var(--muted2);
    cursor: pointer; transition: all 0.15s;
  }
  .filter-chip.active { background: rgba(108,99,255,0.15); border-color: var(--accent); color: var(--accent2); }

  .events-table-wrap { border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); }
  .events-table-wrap table { background: var(--surface); }
  .capacity-text { font-size: 11px; color: var(--muted2); margin-top: 3px; }

  /* ── Topbar ── */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--border);
  }
  .topbar-right { display: flex; align-items: center; gap: 12px; }
  .notif-btn {
    width: 36px; height: 36px; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 16px; position: relative;
  }
  .notif-dot {
    position: absolute; top: 6px; right: 6px; width: 7px; height: 7px;
    background: var(--red); border-radius: 50%; border: 2px solid var(--surface2);
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  /* ── Success card ── */
  .success-card {
    background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3);
    border-radius: var(--radius); padding: 24px; text-align: center; margin-top: 20px;
  }
  .success-icon { font-size: 40px; margin-bottom: 12px; }
  .success-title { font-size: 18px; font-weight: 700; color: var(--green); margin-bottom: 6px; }
  .success-sub { font-size: 13px; color: var(--muted2); }

  /* ── Mini chart ── */
  .mini-chart { display: flex; align-items: flex-end; gap: 4px; height: 60px; }
  .bar { flex: 1; background: rgba(108,99,255,0.25); border-radius: 3px 3px 0 0; transition: height 0.3s; }
  .bar.hi { background: var(--accent); }

  /* ── Loading skeleton ── */
  .skeleton {
    background: linear-gradient(90deg, var(--surface2) 25%, var(--border) 50%, var(--surface2) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 6px;
  }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skeleton-line { height: 14px; margin-bottom: 8px; }
  .skeleton-row { display: flex; gap: 12px; padding: 14px 12px; border-top: 1px solid var(--border); }
  .skeleton-row .skeleton { flex: 1; height: 12px; border-radius: 4px; }

  /* ── Error / Alert banner ── */
  .alert {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 16px; border-radius: 8px; font-size: 13px;
    margin-bottom: 20px; line-height: 1.5;
  }
  .alert-error   { background: rgba(239,68,68,0.1);  border: 1px solid rgba(239,68,68,0.25);  color: #fca5a5; }
  .alert-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #6ee7b7; }
  .alert-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .alert-retry { margin-left: auto; font-size: 12px; color: var(--accent2); cursor: pointer; white-space: nowrap; font-weight: 600; }

  /* ── Spinner ── */
  .spinner-wrap { display: flex; align-items: center; justify-content: center; padding: 40px; }
  .spinner {
    width: 32px; height: 32px; border: 3px solid var(--border);
    border-top-color: var(--accent); border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 1100px) {
    .stats-grid { grid-template-columns: repeat(2,1fr); }
    .two-col { grid-template-columns: 1fr; }
  }
`;

// ── SHARED UI HELPERS ─────────────────────────────────────────────────────

function Badge({ status }) {
  const map = {
    "Confirmed": "badge-green", "On Sale": "badge-green", "confirmed": "badge-green",
    "Pending": "badge-amber", "pending": "badge-amber",
    "Cancelled": "badge-red", "Sold Out": "badge-red", "cancelled": "badge-red",
  };
  return <span className={`badge ${map[status] || "badge-blue"}`}>{status}</span>;
}

function ProgressFill({ pct }) {
  const cls = pct >= 95 ? "danger" : pct >= 75 ? "warn" : "";
  return (
    <div className="progress-bar">
      <div className={`progress-fill ${cls}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="alert alert-error">
      <span className="alert-icon">⚠️</span>
      <span>{message}</span>
      {onRetry && <span className="alert-retry" onClick={onRetry}>↺ Retry</span>}
    </div>
  );
}

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

function SkeletonRows({ count = 5 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className="skeleton-row">
      <div className="skeleton" style={{ maxWidth: 80 }} />
      <div className="skeleton" style={{ maxWidth: 160 }} />
      <div className="skeleton" />
      <div className="skeleton" style={{ maxWidth: 100 }} />
    </div>
  ));
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function Dashboard({ setPage }) {
  const { data: evData, loading: evLoading, error: evError, reload: evReload } = useFetch("/api/events");
  const { data: bkData, loading: bkLoading, error: bkError, reload: bkReload } = useFetch("/api/bookings");

  const chartBars = [40, 65, 52, 80, 73, 90, 68, 88, 95, 72, 85, 100];

  const events   = (evData?.events   || []).map(normaliseEvent);
  const bookings = bkData?.bookings  || [];

  const totalRevenue  = bookings.filter(b => b.status === "confirmed").reduce((s, b) => s + (b.total_price || 0), 0);
  const totalSold     = events.reduce((s, e) => s + (e.sold || 0), 0);
  const activeEvents  = events.filter(e => e.status === "On Sale").length;

  return (
    <div>
      {/* Stat cards */}
      <div className="stats-grid">
        {[
          { label: "Total Revenue",  value: evLoading || bkLoading ? "—" : `$${totalRevenue.toLocaleString()}`, delta: "↑ from live bookings" },
          { label: "Tickets Sold",   value: evLoading ? "—" : totalSold.toLocaleString(),  delta: "↑ across all events" },
          { label: "Active Events",  value: evLoading ? "—" : activeEvents,                delta: "currently on sale" },
          { label: "Total Bookings", value: bkLoading ? "—" : bookings.length,             delta: "↑ confirmed + pending" },
        ].map((s, i) => (
          <div key={i} className="card stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-delta">{s.delta}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        {/* Chart */}
        <div className="card">
          <div className="section-title">
            Revenue (last 12 months)
            <span className="badge badge-green">Live</span>
          </div>
          <div className="mini-chart">
            {chartBars.map((h, i) => (
              <div key={i} className={`bar ${i === 11 ? "hi" : ""}`} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--muted)", marginTop:6 }}>
            <span>Jul '25</span><span>Jun '26</span>
          </div>
        </div>

        {/* Upcoming events from API */}
        <div className="card">
          <div className="section-title">
            Upcoming events
            <span className="see-all" onClick={() => setPage("events")}>See all →</span>
          </div>
          <ErrorBanner message={evError} onRetry={evReload} />
          {evLoading ? <Spinner /> : events.slice(0, 3).map(ev => {
            const pct = ev.capacity > 0 ? Math.round((ev.sold / ev.capacity) * 100) : 0;
            return (
              <div key={ev.id} className="event-ticket">
                <div className="ticket-stub">{eventEmoji(ev)}</div>
                <div className="ticket-body">
                  <div className="ticket-title">{ev.title}</div>
                  <div className="ticket-meta">{ev.displayDate} · {ev.venue}</div>
                  <div className="ticket-footer">
                    <span className="ticket-price">${ev.price}</span>
                    <span style={{fontSize:11,color:"var(--muted2)"}}>{pct}% sold</span>
                  </div>
                  <ProgressFill pct={pct} />
                </div>
              </div>
            );
          })}
          {!evLoading && !evError && events.length === 0 && (
            <div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"20px 0"}}>No events yet</div>
          )}
        </div>
      </div>

      {/* Recent bookings from API */}
      <div className="card">
        <div className="section-title">
          Recent bookings
          <span className="see-all" onClick={() => setPage("book")}>New booking →</span>
        </div>
        <ErrorBanner message={bkError} onRetry={bkReload} />
        <div style={{ overflowX:"auto" }}>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Event</th><th>User</th><th>Qty</th><th>Total</th><th>Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bkLoading
                ? <tr><td colSpan={7} style={{padding:0}}><SkeletonRows count={4} /></td></tr>
                : bookings.slice(0, 5).map(b => (
                    <tr key={b.id}>
                      <td style={{fontFamily:"monospace",color:"var(--accent2)",fontSize:12}}>#{b.id}</td>
                      <td>{b.event?.title || "—"}</td>
                      <td>
                        <div style={{fontWeight:500}}>{b.user?.username || "—"}</div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>{b.user?.email || ""}</div>
                      </td>
                      <td>{b.quantity}</td>
                      <td style={{fontWeight:600}}>${b.total_price}</td>
                      <td style={{color:"var(--muted2)"}}>{b.booking_date?.split("T")[0] || "—"}</td>
                      <td><Badge status={b.status} /></td>
                    </tr>
                  ))
              }
              {!bkLoading && !bkError && bookings.length === 0 && (
                <tr><td colSpan={7} style={{textAlign:"center",color:"var(--muted2)",padding:"20px 0"}}>No bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── EVENT LIST ─────────────────────────────────────────────────────────────
function EventList({ setPage }) {
  const { data, loading, error, reload } = useFetch("/api/events");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const cats = ["All", ...CATEGORIES];

  const events = (data?.events || []).map(normaliseEvent).filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
                        e.venue.toLowerCase().includes(search.toLowerCase());
    const matchCat    = filter === "All" || (e.category || "") === filter;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div className="events-toolbar">
        <input className="search-input" placeholder="🔍  Search events..." value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-primary" onClick={() => setPage("create")}>＋ Create Event</button>
      </div>
      <div className="filter-row">
        {cats.map(c => (
          <button key={c} className={`filter-chip ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>
      <ErrorBanner message={error} onRetry={reload} />
      <div className="events-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th><th>Category</th><th>Date</th><th>Venue</th><th>Price</th><th>Capacity</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={8} style={{padding:0}}><SkeletonRows count={5} /></td></tr>
              : events.map(ev => {
                  const pct = ev.capacity > 0 ? Math.round((ev.sold / ev.capacity) * 100) : 0;
                  return (
                    <tr key={ev.id}>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{fontSize:22,width:36,textAlign:"center"}}>{eventEmoji(ev)}</div>
                          <div>
                            <div style={{fontWeight:600}}>{ev.title}</div>
                            <div style={{fontSize:11,color:"var(--muted2)"}}>{ev.displayTime}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-blue">{ev.category || "—"}</span></td>
                      <td style={{color:"var(--muted2)"}}>{ev.displayDate}</td>
                      <td style={{fontSize:12,color:"var(--muted2)"}}>{ev.venue}</td>
                      <td style={{fontWeight:600,color:"var(--accent2)"}}>${ev.price}</td>
                      <td>
                        <div style={{fontSize:13}}>{ev.sold} / {ev.capacity}</div>
                        <ProgressFill pct={pct} />
                        <div className="capacity-text">{pct}% filled</div>
                      </td>
                      <td><Badge status={ev.status} /></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPage("book")}>Book</button>
                      </td>
                    </tr>
                  );
                })
            }
            {!loading && !error && events.length === 0 && (
              <tr><td colSpan={8} style={{textAlign:"center",color:"var(--muted2)",padding:"24px 0"}}>No events found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CREATE EVENT ───────────────────────────────────────────────────────────
function CreateEvent({ setPage }) {
  const BLANK = { title:"", category:"Music", date:"", time:"", venue:"", price:"", capacity:"", description:"" };
  const [form,      setForm]      = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [apiError,  setApiError]  = useState(null);
  const [created,   setCreated]   = useState(null);   // holds the created event

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.venue || !form.price || !form.capacity) {
      setApiError("Please fill in all required fields (title, venue, date, price, capacity).");
      return;
    }
    setApiError(null);
    setSubmitting(true);

    // Combine date + time into ISO string for the backend
    const isoDate = form.time
      ? `${form.date}T${form.time}:00`
      : `${form.date}T00:00:00`;

    const payload = {
      title:       form.title,
      description: form.description,
      date:        isoDate,
      venue:       form.venue,
      price:       parseFloat(form.price),
      capacity:    parseInt(form.capacity, 10),
      category:    form.category,
    };

    const { data, error } = await apiFetch("/api/events", {
      method: "POST",
      body:   JSON.stringify(payload),
    });

    setSubmitting(false);
    if (error) { setApiError(error); return; }
    setCreated(data.event || data);
  };

  if (created) {
    return (
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <div className="success-card">
          <div className="success-icon">🎉</div>
          <div className="success-title">Event Created!</div>
          <div className="success-sub">"{created.title}" has been saved to the database and is now live.</div>
        </div>
        <div style={{display:"flex",gap:12,marginTop:20}}>
          <button className="btn btn-primary" style={{flex:1}} onClick={() => setPage("events")}>View Events</button>
          <button className="btn btn-ghost" style={{flex:1}} onClick={() => { setForm(BLANK); setCreated(null); setApiError(null); }}>Create Another</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <ErrorBanner message={apiError} />
      <div className="card">
        <div className="form-grid">
          <div className="form-group full">
            <label>Event Title *</label>
            <input placeholder="e.g. Summer Music Festival 2026" value={form.title} onChange={e => set("title", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Venue *</label>
            <input placeholder="e.g. Dubai Arena" value={form.venue} onChange={e => set("venue", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Date *</label>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Time</label>
            <input type="time" value={form.time} onChange={e => set("time", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Ticket Price (USD) *</label>
            <input type="number" placeholder="0.00" min="0" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Total Capacity *</label>
            <input type="number" placeholder="e.g. 500" min="1" value={form.capacity} onChange={e => set("capacity", e.target.value)} />
          </div>
          <div className="form-divider" />
          <div className="form-group full">
            <label>Description</label>
            <textarea placeholder="Describe the event, lineup, special guests, etc." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="form-group full" style={{flexDirection:"row",gap:12,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost" onClick={() => setPage("events")}>Cancel</button>
            <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Publishing…" : "✓ Publish Event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BOOK TICKET ────────────────────────────────────────────────────────────
function BookTicket() {
  const { data, loading: evLoading, error: evError, reload: evReload } = useFetch("/api/events");

  const [selected,   setSelected]   = useState(null);
  const [qty,        setQty]        = useState(1);
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiError,   setApiError]   = useState(null);
  const [receipt,    setReceipt]    = useState(null);

  const events = (data?.events || []).map(normaliseEvent).filter(e => e.status === "On Sale");
  const ev     = events.find(e => e.id === selected);
  const subtotal = ev ? ev.price * qty : 0;
  const fee      = Math.round(subtotal * 0.05);
  const total    = subtotal + fee;

  const handleBook = async () => {
    if (!ev || !name || !email) {
      setApiError("Please select an event and fill in your name and email.");
      return;
    }
    setApiError(null);
    setSubmitting(true);

    const { data: bk, error } = await apiFetch("/api/bookings", {
      method: "POST",
      body:   JSON.stringify({ event_id: ev.id, quantity: qty }),
    });

    setSubmitting(false);
    if (error) { setApiError(error); return; }
    setReceipt({ booking: bk.booking || bk, ev, qty, name, email, total, fee });
  };

  if (receipt) {
    const { booking, ev: revEv, qty: rQty, name: rName, email: rEmail, total: rTotal, fee: rFee } = receipt;
    return (
      <div style={{maxWidth:480,margin:"0 auto"}}>
        <div className="success-card">
          <div className="success-icon">🎟️</div>
          <div className="success-title">Booking Confirmed!</div>
          <div className="success-sub">
            {rQty} ticket{rQty > 1 ? "s" : ""} for <strong>{revEv.title}</strong> booked for {rName}.
            <br />Confirmation sent to {rEmail}.
          </div>
        </div>
        <div style={{marginTop:20}}>
          <div className="summary-box">
            <div style={{fontWeight:700,marginBottom:12}}>Booking Receipt #{booking?.id || ""}</div>
            {[
              ["Event",           revEv.title],
              ["Date",            `${revEv.displayDate} · ${revEv.displayTime}`],
              ["Venue",           revEv.venue],
              ["Tickets",         rQty],
              ["Price per ticket",`$${revEv.price}`],
              ["Service fee (5%)",`$${rFee}`],
            ].map(([k, v]) => (
              <div className="summary-row" key={k}><span style={{color:"var(--muted2)"}}>{k}</span><span>{v}</span></div>
            ))}
            <div className="summary-total"><span>Total Paid</span><span style={{color:"var(--accent2)"}}>${rTotal}</span></div>
          </div>
        </div>
        <button className="btn btn-primary" style={{width:"100%",marginTop:16,justifyContent:"center"}}
          onClick={() => { setReceipt(null); setSelected(null); setQty(1); setName(""); setEmail(""); setPhone(""); setApiError(null); }}>
          Book Another
        </button>
      </div>
    );
  }

  return (
    <div className="booking-wrap">
      <div>
        <div style={{marginBottom:20}}>
          <div className="section-title" style={{marginBottom:12}}>Select an event</div>
          <ErrorBanner message={evError} onRetry={evReload} />
          {evLoading ? <Spinner /> : (
            <div className="event-select-grid">
              {events.map(e => (
                <div key={e.id} className={`event-select-card ${selected === e.id ? "selected" : ""}`} onClick={() => setSelected(e.id)}>
                  <div style={{fontSize:22,marginBottom:6}}>{eventEmoji(e)}</div>
                  <div className="event-select-title">{e.title}</div>
                  <div className="event-select-meta">{e.displayDate} · {e.displayTime}</div>
                  <div className="event-select-meta">{e.venue}</div>
                  <div style={{marginTop:8,fontWeight:700,color:"var(--accent2)"}}>${e.price} / ticket</div>
                  <div style={{marginTop:4,fontSize:11,color:"var(--muted2)"}}>{e.tickets_available} left</div>
                </div>
              ))}
              {events.length === 0 && !evLoading && (
                <div style={{gridColumn:"1/-1",color:"var(--muted2)",fontSize:13,padding:"16px 0"}}>No events available for booking.</div>
              )}
            </div>
          )}
        </div>

        {selected && (
          <div className="card">
            <div className="section-title" style={{marginBottom:16}}>Attendee details</div>
            <ErrorBanner message={apiError} />
            <div className="form-grid">
              <div className="form-group full">
                <label>Full Name *</label>
                <input placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" placeholder="+971 50 000 0000" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Number of Tickets</label>
                <select value={qty} onChange={e => setQty(Number(e.target.value))}>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order summary sidebar */}
      <div>
        <div className="summary-box">
          <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Order Summary</div>
          {ev ? (
            <>
              <div className="event-ticket" style={{marginBottom:16}}>
                <div className="ticket-stub">{eventEmoji(ev)}</div>
                <div className="ticket-body">
                  <div className="ticket-title">{ev.title}</div>
                  <div className="ticket-meta">{ev.displayDate}</div>
                  <div className="ticket-meta">{ev.venue}</div>
                </div>
              </div>
              {[
                ["Tickets",         `${qty} × $${ev.price}`],
                ["Subtotal",        `$${subtotal}`],
                ["Service fee (5%)",`$${fee}`],
              ].map(([k, v]) => (
                <div className="summary-row" key={k}><span style={{color:"var(--muted2)"}}>{k}</span><span>{v}</span></div>
              ))}
              <div className="summary-total"><span>Total</span><span style={{color:"var(--accent2)"}}>${total}</span></div>
              <button className="btn btn-primary" disabled={submitting}
                style={{width:"100%",justifyContent:"center",marginTop:16}}
                onClick={handleBook}>
                {submitting ? "Processing…" : "🎟️ Confirm Booking"}
              </button>
            </>
          ) : (
            <div style={{color:"var(--muted2)",fontSize:13,textAlign:"center",padding:"20px 0"}}>
              Select an event to see your order summary
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LOGIN ──────────────────────────────────────────────────────────────────
// BUGS FIXED:
//  1. Stale closure — handleLogin() captured the initial useState values and
//     never saw updates typed by the user. Fixed by using refs that always
//     point to the current value, so the async handler reads fresh data
//     regardless of when it was created.
//  2. type="email" — some browsers swallow onChange for autofill on controlled
//     email inputs. Changed to type="text" + inputMode + autoComplete.
//  3. Validation guard now trims whitespace before checking, so a string of
//     spaces can't pass through as truthy.
function LoginPage({ onLogin }) {
  // ── State for rendering (controls the input values visually) ──────────
  const [email,   setEmail]   = useState("admin@ticketflow.io");
  const [pass,    setPass]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // ── Refs that always hold the current value ────────────────────────────
  // Because handleLogin is an async function that closes over its scope,
  // reading from refs guarantees we see the latest value at call time,
  // not the value that existed when the closure was first created.
  const emailRef = useRef(email);
  const passRef  = useRef(pass);

  // Keep refs in sync with state on every render
  emailRef.current = email;
  passRef.current  = pass;

  const handleLogin = async () => {
    // Read from refs — always current, never stale
    const currentEmail = emailRef.current.trim();
    const currentPass  = passRef.current.trim();

    if (!currentEmail || !currentPass) {
      setError("Email and password are required.");
      return;
    }

    setError(null);
    setLoading(true);

    const { data, error: err } = await apiFetch("/api/login", {
      method: "POST",
      body:   JSON.stringify({ email: currentEmail, password: currentPass }),
    });

    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    // Persist JWT so authenticated pages can attach it to requests
    if (data?.token) sessionStorage.setItem("tf_token", data.token);
    onLogin(data?.user || {});
  };

  const onKeyDown = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🎟</div>
          <h1>TicketFlow</h1>
          <p>Admin Dashboard · Sign in to continue</p>
        </div>

        <ErrorBanner message={error} />

        <div className="form-group" style={{marginBottom:14}}>
          <label>Email address</label>
          {/* type="text" + inputMode avoids browser autofill swallowing onChange */}
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        <div className="form-group" style={{marginBottom:20}}>
          <label>Password</label>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        <button
          className="btn btn-primary"
          disabled={loading}
          style={{width:"100%",justifyContent:"center",padding:"12px"}}
          onClick={handleLogin}
        >
          {loading ? "Signing in…" : "Sign in →"}
        </button>

        <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"var(--muted)"}}>
          Forgot your password? <span style={{color:"var(--accent2)",cursor:"pointer"}}>Reset it</span>
        </div>
      </div>
    </div>
  );
}

// ── NAV ────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "events",    icon: "🎫", label: "Events" },
  { id: "create",    icon: "✚",  label: "Create Event" },
  { id: "book",      icon: "🛒", label: "Book Ticket" },
];

const PAGE_TITLES = {
  dashboard: { title: "Dashboard",    sub: "Live data from your TicketFlow backend." },
  events:    { title: "Event List",   sub: "Manage and monitor all your events." },
  create:    { title: "Create Event", sub: "Set up a new event to publish on the platform." },
  book:      { title: "Book Ticket",  sub: "Reserve tickets for an attendee." },
};

// ── APP ROOT ───────────────────────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(null);
  const [page,    setPage]    = useState("dashboard");

  const handleLogin  = (u) => setUser(u || { username: "Admin" });
  const handleLogout = ()  => { sessionStorage.removeItem("tf_token"); setUser(null); setPage("dashboard"); };

  if (!user) {
    return (
      <>
        <style>{css}</style>
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  const { title, sub } = PAGE_TITLES[page];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-icon">🎟</div>
            <div className="logo-text">Ticket<span>Flow</span></div>
          </div>
          {NAV.map(n => (
            <button key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
              <span className="icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
          <div className="sidebar-footer">
            <div className="user-chip" onClick={handleLogout} title="Sign out">
              <div className="avatar">{(user.username || "AD").slice(0,2).toUpperCase()}</div>
              <div>
                <div className="user-name">{user.username || "Admin"}</div>
                <div className="user-role">Click to sign out</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="page-header" style={{margin:0}}>
              <div className="page-title">{title}</div>
              <div className="page-sub">{sub}</div>
            </div>
            <div className="topbar-right">
              <div className="notif-btn">🔔<div className="notif-dot"/></div>
              <div className="avatar" style={{width:36,height:36,cursor:"pointer"}}>{(user.username||"AD").slice(0,2).toUpperCase()}</div>
            </div>
          </div>

          {page === "dashboard" && <Dashboard setPage={setPage} />}
          {page === "events"    && <EventList setPage={setPage} />}
          {page === "create"    && <CreateEvent setPage={setPage} />}
          {page === "book"      && <BookTicket />}
        </main>
      </div>
    </>
  );
}
