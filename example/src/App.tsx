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
      borderRadius: 12, padding: "1rem 1.25rem", flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: color ?? "#111827", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.03em" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: 3, fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all" }}>{sub}</div>}
    </div>
  );
}

function SubscriptionPanel({ customerId }: { customerId: string }) {
  const subscription = useQuery(api.example.getSubscription, { customerId });
  const hasActive = useQuery(api.example.hasActivePlan, { customerId });
  const activePlan = useQuery(api.example.getActivePlan, { customerId });
  const hasFeature = useQuery(api.example.hasFeature, { customerId, featureKey: "pro" });
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
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#111827" }}>Subscription State</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.68rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>
            hasActivePlan() → <span style={{ color: hasActive ? "#10b981" : "#ef4444", fontWeight: 700 }}>
              {loading ? "..." : String(hasActive)}
            </span>
          </span>
          {!loading && subscription && <Badge status={subscription.status} />}
        </div>
      </div>
      <div style={{ padding: "1.25rem" }}>
        {loading ? (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ flex: 1, height: 72, borderRadius: 10, background: "#f3f4f6", animation: "shimmer 1.5s ease infinite" }} />
            ))}
          </div>
        ) : !subscription ? (
          <div style={{ padding: "1.5rem", color: "#9ca3af", fontSize: "0.82rem", textAlign: "center" }}>
            No subscription found. Make sure your Kinde billing webhook is pointed at this deployment.
          </div>
        ) : (
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {[
                { label: "getSubscription()", value: `status: "${subscription.status}"` },
                { label: "getActivePlan()", value: activePlan ? `planName: "${activePlan.planName}"` : "null" },
                { label: 'hasFeature("pro")', value: String(hasFeature) },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: "0.6rem 0.85rem", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem" }}>
                  <span style={{ color: "#9ca3af" }}>{label}</span>
                  <span style={{ color: "#374151", marginLeft: 6, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
            {subscription.agreementId && (
              <div style={{
                padding: "0.65rem 0.85rem", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb",
                display: "flex", alignItems: "center", gap: 8,
                fontSize: "0.68rem", fontFamily: "'JetBrains Mono', monospace", flexWrap: "wrap",
              }}>
                <span style={{ color: "#9ca3af" }}>agreementId</span>
                <span style={{ color: "#6b7280" }}>·</span>
                <span style={{ color: "#374151", fontWeight: 600 }}>{subscription.agreementId}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UsagePanel({ customerId }: { customerId: string }) {
  const usage = useQuery(api.example.getUsage, { customerId, meterId: "api_calls" });
  const total = usage?.reduce((sum, r) => sum + r.quantity, 0) ?? 0;

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 16, overflow: "hidden", marginBottom: "1rem" }}>
      <div style={{
        padding: "1rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#111827" }}>Metered Usage</div>
        <span style={{ fontSize: "0.68rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>
          getUsage() · meter: api_calls
        </span>
      </div>
      <div style={{ padding: "1.25rem" }}>
        {usage === undefined ? (
          <div style={{ height: 60, borderRadius: 8, background: "#f3f4f6", animation: "shimmer 1.5s ease infinite" }} />
        ) : usage.length === 0 ? (
          <div style={{ padding: "1.5rem", color: "#9ca3af", fontSize: "0.82rem", textAlign: "center" }}>
            No usage records yet. Kinde will send a customer.meter_usage_updated webhook when usage is recorded.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
              <StatCard label="Total Units" value={total.toLocaleString()} sub={`across ${usage.length} records`} color="#6366f1" />
              <StatCard label="Latest Record" value={usage[0].quantity.toLocaleString()} sub={new Date(usage[0].recordedAt).toLocaleTimeString()} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {usage.slice(0, 6).map((record) => (
                <div key={record._id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.5rem 0.75rem", background: "#f9fafb",
                  borderRadius: 8, border: "1px solid #e5e7eb",
                }}>
                  <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>
                    {new Date(record.recordedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "0.8rem", color: "#374151" }}>
                    {record.quantity.toLocaleString()} <span style={{ fontWeight: 400, color: "#9ca3af" }}>units</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EventLogPanel({ customerId }: { customerId: string }) {
  const events = useQuery(api.example.listBillingEvents, { customerId });

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
      <div style={{
        padding: "1rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#111827" }}>Billing Event Log</div>
        <span style={{ fontSize: "0.68rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>
          listBillingEvents() · {events ? events.length : "..."} events
        </span>
      </div>
      <div style={{ padding: "1.25rem" }}>
        {events === undefined ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 44, borderRadius: 8, background: "#f3f4f6", animation: "shimmer 1.5s ease infinite" }} />)}
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: "1.5rem", color: "#9ca3af", fontSize: "0.82rem", textAlign: "center" }}>
            No events yet. Billing events appear here instantly when Kinde fires webhooks.
          </div>
        ) : (
          <div style={{
            background: "#0f172a", borderRadius: 10, padding: "0.85rem 1rem",
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem",
            maxHeight: 300, overflowY: "auto",
          }}>
            {events.map((event, i) => (
              <div key={event._id} style={{
                display: "flex", gap: "0.75rem", alignItems: "center",
                marginBottom: i < events.length - 1 ? "0.4rem" : 0,
                paddingBottom: i < events.length - 1 ? "0.4rem" : 0,
                borderBottom: i < events.length - 1 ? "1px solid #1e293b" : "none",
              }}>
                <span style={{ color: "#475569", flexShrink: 0, minWidth: 72 }}>
                  {new Date(event.receivedAt).toLocaleTimeString("en-US", { hour12: false })}
                </span>
                <span style={{ color: "#7dd3fc", flex: 1 }}>{event.eventType}</span>
                <span style={{ color: "#475569" }}>{event.customerId}</span>
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
  const [customerId, setCustomerId] = useState("customer_019865139a9b96b5bb666f8441f2d73c");
  const [customerType, setCustomerType] = useState<"user" | "org">("user");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { min-height: 100%; background: #f1f5f9; }
        body { color: #111827; font-family: 'Sora', sans-serif; min-height: 100vh; -webkit-font-smoothing: antialiased; }
        #root { width: 100%; min-height: 100vh; background: #f1f5f9; display: flex; justify-content: center; }
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px}
        button:hover:not(:disabled){ opacity:0.85; }
        a:hover { opacity: 0.85; }
      `}</style>

      <div style={{ width: "100%", minHeight: "100vh", background: "#f1f5f9", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 820, padding: "2.5rem 1.5rem 5rem" }}>

          <div style={{ marginBottom: "1.75rem", animation: "fadeUp 0.4s ease" }}>
            <h1 style={{
              fontSize: "1.25rem", fontWeight: 800, color: "#111827",
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.03em",
              marginBottom: 4,
            }}>
              convex-kinde-billing
            </h1>
            <p style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "1rem" }}>
              Add Kinde billing to your Convex app. Reactive subscriptions, checkout, portal, and feature gating.
            </p>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
              padding: "0.6rem 1rem", background: "#fff",
              border: "1px solid #e5e7eb", borderRadius: 10,
              fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem",
            }}>
              {[
                { t: "Kinde fires webhook", c: "#6366f1" },
                { t: "→", c: "#9ca3af" },
                { t: "webhookHandler", c: "#0891b2" },
                { t: "→", c: "#9ca3af" },
                { t: "Convex DB updated", c: "#059669" },
                { t: "→", c: "#9ca3af" },
                { t: "useQuery reflects change", c: "#059669" },
              ].map((item, i) => <span key={i} style={{ color: item.c }}>{item.t}</span>)}
            </div>
          </div>

          <div style={{
            background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 16,
            padding: "1.25rem", marginBottom: "1rem",
            animation: "fadeUp 0.4s ease 0.05s both",
          }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              Customer
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ display: "block", fontSize: "0.68rem", color: "#9ca3af", marginBottom: 4 }}>Customer ID</label>
                <input
                  title="customerId"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  style={{
                    width: "100%", padding: "0.55rem 0.75rem",
                    borderRadius: 8, border: "1.5px solid #e5e7eb",
                    background: "#f9fafb", color: "#111827",
                    fontSize: "0.8rem", fontFamily: "'JetBrains Mono', monospace", outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.68rem", color: "#9ca3af", marginBottom: 4 }}>Type</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["user", "org"] as const).map((t) => (
                    <button key={t} onClick={() => setCustomerType(t)} style={{
                      padding: "0.5rem 1rem", borderRadius: 8,
                      border: "1.5px solid #e5e7eb",
                      background: customerType === t ? "#6366f1" : "#f9fafb",
                      color: customerType === t ? "#fff" : "#374151",
                      fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                      fontFamily: "'Sora', sans-serif", transition: "all 0.15s",
                    }}>
                      {t === "user" ? "B2C User" : "B2B Org"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ animation: "fadeUp 0.4s ease 0.1s both" }}>
            <SubscriptionPanel customerId={customerId} />
          </div>
          <div style={{ animation: "fadeUp 0.4s ease 0.2s both" }}>
            <UsagePanel customerId={customerId} />
          </div>

          <div style={{ animation: "fadeUp 0.4s ease 0.25s both" }}>
            <EventLogPanel customerId={customerId} />
          </div>

          <div style={{
            marginTop: "1.5rem", padding: "0.75rem 1rem",
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
            fontSize: "0.68rem", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace",
            animation: "fadeUp 0.4s ease 0.3s both",
          }}>
            All state is stored in Convex and updates reactively via useQuery. No polling.
            In production, Kinde fires the webhooks automatically.
          </div>

        </div>
      </div>
    </>
  );
}
