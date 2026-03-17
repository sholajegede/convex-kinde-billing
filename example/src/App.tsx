import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

const STATUS_COLOR: Record<string, string> = {
  active: "#10b981",
  cancelled: "#6b7280",
  past_due: "#f59e0b",
  unpaid: "#ef4444",
  unknown: "#9ca3af",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  cancelled: "Cancelled",
  past_due: "Past Due",
  unpaid: "Unpaid",
  unknown: "Unknown",
};

const EVENT_ICON: Record<string, string> = {
  "customer.plan_assigned": "📋",
  "customer.agreement_created": "✍️",
  "customer.plan_changed": "🔄",
  "customer.agreement_cancelled": "🚫",
  "customer.payment_succeeded": "✅",
  "customer.payment_failed": "❌",
  "customer.invoice_overdue": "⏰",
  "customer.meter_usage_updated": "📊",
};

function Badge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#9ca3af";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999,
      background: `${color}18`, border: `1px solid ${color}40`,
      color, fontSize: "0.7rem", fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0,
        animation: status === "active" ? "pulse 2s ease-in-out infinite" : "none",
      }} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: "#fff", border: "1.5px solid #e5e7eb",
      borderRadius: 12, padding: "1rem 1.25rem", flex: 1,
    }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.35rem", fontWeight: 800, color: color ?? "#111827", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.03em" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div>}
    </div>
  );
}

function SubscriptionPanel({ customerId }: { customerId: string }) {
  const subscription = useQuery(api.example.getSubscription, { customerId });
  const activePlan = useQuery(api.example.getActivePlan, { customerId });
  const loading = subscription === undefined;

  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const cancelledAt = subscription?.cancelledAt
    ? new Date(subscription.cancelledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 16, overflow: "hidden", marginBottom: "1rem" }}>
      <div style={{
        padding: "1rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#374151", display: "flex", alignItems: "center", gap: 7 }}>
          <span>💳</span> Subscription
        </div>
        {!loading && subscription && <Badge status={subscription.status} />}
        {!loading && !subscription && <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>no subscription</span>}
        {loading && <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>loading...</span>}
      </div>

      <div style={{ padding: "1.25rem" }}>
        {loading ? (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ flex: 1, height: 72, borderRadius: 10, background: "#f3f4f6", animation: "shimmer 1.5s ease infinite" }} />
            ))}
          </div>
        ) : subscription ? (
          <>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <StatCard label="Plan" value={activePlan?.planName ?? "—"} sub={activePlan?.planId} color="#6366f1" />
              <StatCard
                label="Customer Type"
                value={subscription.customerType === "org" ? "B2B Org" : "B2C User"}
                sub={subscription.customerId}
              />
              <StatCard
                label={subscription.status === "cancelled" ? "Cancelled" : "Renews"}
                value={subscription.status === "cancelled" ? (cancelledAt ?? "—") : (periodEnd ?? "—")}
                color={subscription.status === "cancelled" ? "#6b7280" : "#10b981"}
              />
            </div>

            {subscription.agreementId && (
              <div style={{
                padding: "0.65rem 0.85rem",
                background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb",
                display: "flex", alignItems: "center", gap: 8,
                fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace",
                flexWrap: "wrap",
              }}>
                <span style={{ color: "#9ca3af", flexShrink: 0 }}>agreement_id</span>
                <span style={{ color: "#6b7280" }}>·</span>
                <span style={{ color: "#374151", fontWeight: 600 }}>{subscription.agreementId}</span>
                <span style={{ color: "#9ca3af", marginLeft: "auto", fontSize: "0.68rem" }}>
                  required for recordMeterUsage()
                </span>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.82rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💸</div>
            No subscription found.
            <div style={{ fontSize: "0.72rem", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              Waiting for a Kinde billing webhook.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsagePanel({ customerId }: { customerId: string }) {
  const [meterId, setMeterId] = useState("api_calls");
  const usage = useQuery(api.example.getUsage, { customerId, meterId });
  const total = usage?.reduce((sum, r) => sum + r.quantity, 0) ?? 0;

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 16, overflow: "hidden", marginBottom: "1rem" }}>
      <div style={{
        padding: "1rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
      }}>
        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#374151", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <span>📊</span> Metered Usage
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.68rem", color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Meter</span>
          <input
            value={meterId}
            onChange={(e) => setMeterId(e.target.value)}
            placeholder="api_calls"
            style={{
              padding: "3px 8px", borderRadius: 6, border: "1px solid #e5e7eb",
              background: "#fff", color: "#374151", fontSize: "0.75rem",
              fontFamily: "'JetBrains Mono', monospace", outline: "none", width: 120,
            }}
          />
        </div>
      </div>

      <div style={{ padding: "1.25rem" }}>
        {usage === undefined ? (
          <div style={{ height: 60, borderRadius: 8, background: "#f3f4f6", animation: "shimmer 1.5s ease infinite" }} />
        ) : usage.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem", color: "#9ca3af", fontSize: "0.82rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>📉</div>
            No usage records for <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{meterId}</span>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
              <StatCard label="Total Units" value={total.toLocaleString()} sub={`across ${usage.length} records`} color="#6366f1" />
              <StatCard label="Latest" value={usage[0].quantity.toLocaleString()} sub={new Date(usage[0].recordedAt).toLocaleTimeString()} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {usage.slice(0, 8).map((record) => (
                <div key={record._id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.55rem 0.75rem", background: "#f9fafb",
                  borderRadius: 8, border: "1px solid #e5e7eb",
                }}>
                  <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>
                    {new Date(record.recordedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "0.82rem", color: "#374151" }}>
                      {record.quantity.toLocaleString()}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "#9ca3af" }}>units</span>
                  </div>
                </div>
              ))}
              {usage.length > 8 && (
                <div style={{ textAlign: "center", fontSize: "0.72rem", color: "#9ca3af", padding: "0.4rem", fontFamily: "'JetBrains Mono', monospace" }}>
                  +{usage.length - 8} more records
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EventsPanel({ customerId }: { customerId: string }) {
  const events = useQuery(api.example.listBillingEvents, { customerId });

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
      <div style={{
        padding: "1rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#374151", display: "flex", alignItems: "center", gap: 7 }}>
          <span>📜</span> Billing Event Log
        </div>
        <span style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>
          {events ? `${events.length} events` : "..."}
        </span>
      </div>

      <div style={{ padding: "1.25rem" }}>
        {events === undefined ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 52, borderRadius: 8, background: "#f3f4f6", animation: "shimmer 1.5s ease infinite" }} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "#9ca3af", fontSize: "0.82rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
            No billing events yet.
            <div style={{ fontSize: "0.72rem", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              Events appear here as Kinde webhooks arrive.
            </div>
          </div>
        ) : (
          <div style={{
            background: "#0f172a", borderRadius: 10, padding: "0.85rem 1rem",
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem",
            maxHeight: 320, overflowY: "auto", border: "1px solid #e2e8f0",
          }}>
            {events.map((event, i) => (
              <div key={event._id} style={{
                display: "flex", gap: "0.75rem", alignItems: "flex-start",
                marginBottom: i < events.length - 1 ? "0.45rem" : 0,
                paddingBottom: i < events.length - 1 ? "0.45rem" : 0,
                borderBottom: i < events.length - 1 ? "1px solid #1e293b" : "none",
              }}>
                <span style={{ color: "#475569", flexShrink: 0, minWidth: 72 }}>
                  {new Date(event.receivedAt).toLocaleTimeString("en-US", { hour12: false })}
                </span>
                <span style={{ flexShrink: 0, fontSize: "0.85rem" }}>
                  {EVENT_ICON[event.eventType] ?? "📌"}
                </span>
                <span style={{ color: "#7dd3fc", flex: 1 }}>{event.eventType}</span>
                <span style={{ color: "#475569", flexShrink: 0 }}>
                  {event.customerId.slice(0, 12)}…
                </span>
              </div>
            ))}
            <span style={{ color: "#334155", animation: "blink 1s step-end infinite" }}>█</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [customerId, setCustomerId] = useState("kp_user123");

  const DEMO_IDS = [
    { label: "B2C User", id: "kp_user123" },
    { label: "B2B Org", id: "org_abc456" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f1f5f9; color: #111827; font-family: 'Sora', sans-serif; min-height: 100vh; -webkit-font-smoothing: antialiased; }
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-track{background:#f1f5f9} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px}
        button:hover{opacity:0.85;}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>

          {/* Header */}
          <div style={{ marginBottom: "1.75rem", animation: "fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "0.85rem" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem", boxShadow: "0 8px 24px rgba(99,102,241,0.28)", flexShrink: 0,
              }}>💳</div>
              <div>
                <h1 style={{
                  fontSize: "1.3rem", fontWeight: 800, color: "#111827",
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.03em", textAlign: "left",
                }}>convex-kinde-billing</h1>
                <div style={{ fontSize: "0.72rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace", textAlign: "left" }}>
                  Real-time Kinde billing state — reactive, zero boilerplate
                </div>
              </div>
            </div>

            {/* Flow trace */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
              padding: "0.65rem 1rem", background: "#fff",
              border: "1px solid #e5e7eb", borderRadius: 10,
              fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem",
            }}>
              {[
                { t: "Kinde billing event", c: "#6366f1" },
                { t: "→", c: "#9ca3af" },
                { t: "POST /webhooks/kinde/billing", c: "#8b5cf6" },
                { t: "→", c: "#9ca3af" },
                { t: "createWebhookHandler()", c: "#0891b2" },
                { t: "→", c: "#9ca3af" },
                { t: "handleWebhookEvent()", c: "#059669" },
                { t: "→", c: "#9ca3af" },
                { t: "useQuery live ✓", c: "#059669" },
              ].map((item, i) => <span key={i} style={{ color: item.c }}>{item.t}</span>)}
            </div>
          </div>

          {/* Customer picker */}
          <div style={{
            background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 16,
            padding: "1.25rem", marginBottom: "1rem",
            animation: "fadeUp 0.4s ease 0.05s both",
          }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
                  Customer ID
                </label>
                <input
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="kp_... or org_..."
                  style={{
                    width: "100%", padding: "0.6rem 0.75rem",
                    borderRadius: 8, border: "1.5px solid #e5e7eb",
                    background: "#f9fafb", color: "#111827",
                    fontSize: "0.82rem", fontFamily: "'JetBrains Mono', monospace",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, paddingBottom: 1 }}>
                <span style={{ fontSize: "0.68rem", color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", paddingBottom: "0.6rem", alignSelf: "flex-end" }}>Try</span>
                {DEMO_IDS.map(({ label, id }) => (
                  <button key={id} onClick={() => setCustomerId(id)} style={{
                    padding: "0.55rem 0.85rem", borderRadius: 8,
                    border: "1.5px solid #e5e7eb",
                    background: customerId === id ? "#6366f1" : "#f9fafb",
                    color: customerId === id ? "#fff" : "#374151",
                    fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Sora', sans-serif", transition: "all 0.15s", whiteSpace: "nowrap",
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: "0.5rem", fontSize: "0.68rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>
              B2C: <span style={{ color: "#6b7280" }}>kp_abc123</span>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              B2B: <span style={{ color: "#6b7280" }}>org_abc123</span>
            </div>
          </div>

          <div style={{ animation: "fadeUp 0.4s ease 0.1s both" }}>
            <SubscriptionPanel customerId={customerId} />
          </div>

          <div style={{ animation: "fadeUp 0.4s ease 0.15s both" }}>
            <UsagePanel customerId={customerId} />
          </div>

          <div style={{ animation: "fadeUp 0.4s ease 0.2s both" }}>
            <EventsPanel customerId={customerId} />
          </div>

          {/* Footer */}
          <div style={{
            marginTop: "1.5rem", padding: "0.85rem 1rem",
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
            fontSize: "0.72rem", color: "#9ca3af",
            fontFamily: "'JetBrains Mono', monospace",
            display: "flex", alignItems: "center", gap: "0.5rem",
            animation: "fadeUp 0.4s ease 0.25s both",
          }}>
            <span style={{ color: "#6366f1" }}>ℹ</span>
            All panels update live via Convex subscriptions. Kinde webhooks typically arrive within a few seconds of a billing event.
          </div>

        </div>
      </div>
    </>
  );
}