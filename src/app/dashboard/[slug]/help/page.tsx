import React from 'react';

// Server component — no 'use client'

function QuickStartStep({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div style={{
      display: 'flex', gap: '16px', alignItems: 'flex-start',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-color)',
      borderLeft: '4px solid var(--accent-blue)',
      borderRadius: '10px',
      padding: '16px 18px',
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        background: 'var(--accent-blue)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '15px', fontWeight: '800', flexShrink: 0,
      }}>
        {number}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{desc}</div>
      </div>
    </div>
  );
}

function SectionHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <span style={{ fontSize: '28px', lineHeight: 1 }}>{emoji}</span>
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
      </div>
      {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '40px', marginTop: 0 }}>{subtitle}</p>}
    </div>
  );
}

function PageCard({ emoji, title, desc, color }: { emoji: string; title: string; desc: string; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-color)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '18px' }}>{emoji}</span>
        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{desc}</p>
    </div>
  );
}

function QueryBlock({ children }: { children: string }) {
  return (
    <pre style={{
      fontFamily: 'monospace', fontSize: '12px',
      background: '#0f172a', color: '#7dd3fc',
      border: '1px solid rgba(125,211,252,0.15)',
      borderRadius: '8px', padding: '12px 16px',
      overflowX: 'auto', lineHeight: '1.7', margin: '8px 0',
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {children}
    </pre>
  );
}

function Callout({ color, icon, title, children }: { color: string; icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: `${color}12`,
      border: `1px solid ${color}40`,
      borderLeft: `4px solid ${color}`,
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '10px',
    }}>
      <div style={{ fontWeight: '700', color, fontSize: '13px', marginBottom: '4px' }}>{icon} {title}</div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{children}</div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>{q}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{a}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border-color)', margin: '36px 0' }} />;
}

export default function HelpPage() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>Help &amp; Guide</h2>
            <p>Everything you need to get the most out of your analytics dashboard</p>
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* ── 1. Quick Start ── */}
        <SectionHeader emoji="🚀" title="Quick Start" subtitle="Up and running in 3 steps" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
          <QuickStartStep
            number={1}
            title="Connect Shopify"
            desc="Go to Settings → Connections in the sidebar. Paste your Shopify store URL and Admin API access token. Data starts loading immediately."
          />
          <QuickStartStep
            number={2}
            title="View your Overview"
            desc="Click Overview in the sidebar to see your revenue, orders, AOV, and customer metrics all in one place. Use the date picker at the top to change the time window."
          />
          <QuickStartStep
            number={3}
            title="Ask the AI Consultant"
            desc="Click AI Consultant in the sidebar and type a question like 'Which products should I scale ads on?' — it reads your live store data and gives you a real answer."
          />
        </div>

        <Divider />

        {/* ── 2. What each page does ── */}
        <SectionHeader emoji="📊" title="What each page does" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', marginBottom: '8px' }}>
          <PageCard
            emoji="🏠" title="Overview"
            desc="Your main dashboard. Shows revenue KPIs, MER (blended marketing efficiency), top products, customer split, and ad spend side by side."
            color="#3b82f6"
          />
          <PageCard
            emoji="🛍️" title="Shopify"
            desc="Deep-dive into Shopify data — daily revenue charts, top products, new vs returning customers, fulfillment status, and the conversion funnel."
            color="#22c55e"
          />
          <PageCard
            emoji="🤖" title="AI Consultant"
            desc="Chat with an AI that reads your live store data. Ask anything — from 'what is my ROAS?' to 'give me 3 CRO ideas based on my funnel'."
            color="#a855f7"
          />
          <PageCard
            emoji="📐" title="Custom Metrics"
            desc="Write ShopifyQL queries to pull any data slice you want. Save queries as named metrics. The AI can generate queries for you automatically."
            color="#f59e0b"
          />
          <PageCard
            emoji="📈" title="Growth Intelligence"
            desc="AI-generated insights ranked by revenue impact. Set up alert rules that fire on this page when a metric crosses your threshold."
            color="#ef4444"
          />
          <PageCard
            emoji="📋" title="My Dashboard"
            desc="Your personal pinboard. Save any metric or chart from Custom Metrics and it appears here for quick access."
            color="#06b6d4"
          />
        </div>

        <Divider />

        {/* ── 3. AI Consultant tips ── */}
        <SectionHeader emoji="🧠" title="AI Consultant — how to ask good questions" />
        <Callout color="#a855f7" icon="💡" title="Be specific about the time window">
          Instead of &quot;how are sales?&quot;, ask &quot;how did revenue trend over the last 30 days and what drove the change?&quot; The AI knows your current data window.
        </Callout>
        <Callout color="#3b82f6" icon="📌" title="Reference your actual metrics">
          The AI sees your real numbers. Ask things like &quot;my repeat rate is 18% — what should I do?&quot; or &quot;AOV dropped last period, what could explain it?&quot;
        </Callout>
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
          borderRadius: '10px', padding: '16px', marginBottom: '10px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Example questions that work well
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              '"What are my top 5 products by revenue this month?"',
              '"Why might my ROAS have dropped last week?"',
              '"Which products should I scale ads on?"',
              '"What is my blended MER and is it healthy?"',
              '"Give me 3 CRO ideas based on my current funnel."',
              '"My repeat rate is low — what should I do?"',
            ].map(q => (
              <div key={q} style={{
                fontFamily: 'monospace', fontSize: '12px',
                color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.12)', borderRadius: '6px',
                padding: '6px 10px',
              }}>
                {q}
              </div>
            ))}
          </div>
        </div>
        <Callout color="#f59e0b" icon="⚠️" title="If it says No data for X">
          The AI only knows about connected platforms. If a platform is not connected, it will say so. Connect it in Settings → Connections, then start a fresh chat.
        </Callout>

        <Divider />

        {/* ── 4. Custom Metrics / ShopifyQL ── */}
        <SectionHeader emoji="📐" title="Custom Metrics &amp; ShopifyQL" subtitle="Write queries to pull any data you need" />
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
          borderRadius: '10px', padding: '16px', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>What is ShopifyQL?</div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
            ShopifyQL is Shopify&apos;s own analytics query language, similar to SQL but purpose-built for your store data.
            You can use it to pull revenue trends, top products, sessions, conversion rate, and more.
            Requires an Advanced or Shopify Plus plan.
          </p>
        </div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Basic query structure</div>
        <QueryBlock>{`FROM sales
SHOW net_sales, orders
SINCE startOfDay(-30d) UNTIL today
ORDER BY net_sales DESC`}</QueryBlock>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '14px', marginBottom: '6px' }}>Example queries</div>
        <QueryBlock>{`-- Revenue by day (trend chart)
FROM sales SHOW net_sales TIMESERIES day SINCE startOfDay(-30d) UNTIL today ORDER BY day ASC

-- Top products by revenue
FROM sales SHOW net_sales, orders GROUP BY product_title ORDER BY net_sales DESC LIMIT 20 SINCE startOfDay(-30d) UNTIL today

-- Conversion funnel summary
FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout SINCE startOfDay(-30d) UNTIL today

-- Bounce rate and pageviews
FROM sessions SHOW sessions, bounce_rate, pageviews, pageviews_per_session SINCE startOfDay(-30d) UNTIL today`}</QueryBlock>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '14px', marginBottom: '6px' }}>Common errors and fixes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { err: 'FROM orders / FROM products / FROM customers', fix: 'Not supported. Use FROM sales or FROM sessions.' },
            { err: 'GROUP BY on FROM sessions', fix: 'Sessions does not support GROUP BY. Remove it.' },
            { err: 'TIMESERIES on FROM sessions', fix: 'Sessions does not support TIMESERIES. Remove it.' },
            { err: 'GROUP BY + TIMESERIES together', fix: 'These two cannot be used in the same query. Pick one.' },
            { err: 'Inventing column names', fix: 'Only use columns listed in the Quick Reference on the Custom Metrics page.' },
          ].map(({ err, fix }) => (
            <div key={err} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px',
            }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Error</div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#ef4444' }}>{err}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Fix</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fix}</div>
              </div>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── 5. Alert Rules ── */}
        <SectionHeader emoji="🔔" title="Alert Rules" subtitle="Get notified when a metric crosses a threshold" />
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
          borderRadius: '10px', padding: '16px', marginBottom: '12px',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
            Alert Rules live on the <strong style={{ color: 'var(--text-primary)' }}>Growth Intelligence</strong> page.
            Each rule watches one metric and fires a red banner on that page whenever the condition is true.
            Alerts are evaluated live every time the page loads.
          </p>
        </div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>How to set one up</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {[
            '1. Go to Growth Intelligence in the sidebar.',
            '2. Scroll to the Alert Rules section.',
            '3. Click + Add Alert Rule.',
            '4. Pick a metric (e.g. Avg Order Value), a condition (drops below / rises above / drops by % / spikes by %), and a threshold value.',
            '5. Give it a name and save. Done.',
          ].map(step => (
            <div key={step} style={{
              fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
              borderRadius: '8px', padding: '10px 14px',
            }}>{step}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
          {[
            { label: 'AOV drops below ₹900', color: '#ef4444' },
            { label: 'Repeat rate drops below 15%', color: '#ef4444' },
            { label: 'Refund rate rises above 5%', color: '#f59e0b' },
            { label: 'Orders drop by >20% vs prev period', color: '#f59e0b' },
          ].map(({ label, color }) => (
            <div key={label} style={{
              fontSize: '12px', color: 'var(--text-secondary)',
              background: 'var(--bg-elevated)', border: `1px solid ${color}40`,
              borderLeft: `3px solid ${color}`, borderRadius: '6px', padding: '8px 12px',
            }}>
              {label}
            </div>
          ))}
        </div>

        <Divider />

        {/* ── 6. FAQ ── */}
        <SectionHeader emoji="❓" title="Frequently Asked Questions" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          <FAQItem
            q="Why is Unique Customers lower than expected?"
            a="We count unique email addresses. Guest checkout orders with no email are not counted. Multiple orders from the same customer in the period still count as one."
          />
          <FAQItem
            q="Why does New + Returning revenue not add up to 100%?"
            a="Some guest checkout orders have no customer record and fall into neither bucket. This is a Shopify data limitation."
          />
          <FAQItem
            q="Can I export data?"
            a="Not yet — export is on the roadmap. For now, the Custom Metrics page shows results in a table you can manually copy."
          />
          <FAQItem
            q="How often does data refresh?"
            a="Shopify data is cached for 2 hours to avoid API rate limits. Click the Refresh button on any page to force a fresh fetch. Ad platform data refreshes on each page load."
          />
          <FAQItem
            q="AI Consultant says it is disabled. What do I do?"
            a="The AI Consultant needs an Anthropic API key configured on the server. Contact your admin to enable it."
          />
          <FAQItem
            q="What is the difference between MER and ROAS?"
            a="ROAS is platform-specific (e.g. Meta ROAS = Meta-attributed revenue ÷ Meta spend). MER is blended: Total Shopify Revenue ÷ all ad spend. MER is a more accurate picture of overall marketing efficiency."
          />
          <FAQItem
            q="What does the Live badge mean?"
            a="A green Live badge next to a nav item means that platform is connected and data is being pulled in real time. No badge means it is not connected yet."
          />
          <FAQItem
            q="Does ShopifyQL work on all Shopify plans?"
            a="ShopifyQL analytics queries require an Advanced or Shopify Plus plan. On lower plans the Custom Metrics page will return an error."
          />
        </div>

      </div>
    </>
  );
}
