'use client';

import { useState } from 'react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--glass-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: '15px',
          fontWeight: '700',
          textAlign: 'left',
          gap: '12px',
        }}
      >
        <span>{title}</span>
        <span
          style={{
            color: 'var(--accent-blue)',
            fontSize: '18px',
            lineHeight: 1,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          ›
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: '0 20px 20px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            lineHeight: '1.7',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--glass-border)',
        borderRadius: '12px',
        padding: '18px 20px',
        marginBottom: '12px',
        color: 'var(--text-secondary)',
        fontSize: '14px',
        lineHeight: '1.7',
      }}
    >
      {children}
    </div>
  );
}

function Bullet({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: '8px 0 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ color: 'var(--text-secondary)' }}>{item}</li>
      ))}
    </ul>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: 'monospace',
        fontSize: '12px',
        background: 'rgba(59,130,246,0.1)',
        color: 'var(--accent-blue)',
        padding: '2px 6px',
        borderRadius: '4px',
      }}
    >
      {children}
    </code>
  );
}

export default function HelpPage() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h2>❓ Help & Guide</h2>
            <p>Everything you need to know about your analytics dashboard</p>
          </div>
        </div>
      </div>

      <div className="page-body">

        {/* Getting Started */}
        <HelpSection title="🚀 Getting Started">
          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>What this dashboard does</strong>
            <p style={{ marginTop: '6px' }}>
              Brand Analytics is a unified e-commerce intelligence platform. It pulls together data from Shopify (revenue &amp; orders),
              Meta Ads (ROAS &amp; spend), Google Analytics (traffic &amp; sessions), and Google Ads (ad spend) — all in one place.
            </p>
          </InfoCard>

          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>How to connect your first platform</strong>
            <p style={{ marginTop: '6px' }}>
              Go to <strong>Connections</strong> in the sidebar (under Settings). Each platform has a dedicated section
              where you paste your API keys or access tokens. Shopify requires your store URL and an Admin API access token.
            </p>
          </InfoCard>

          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>What the &quot;Live&quot; badge means</strong>
            <p style={{ marginTop: '6px' }}>
              The green <strong>Live</strong> badge next to a nav item means that platform is connected and data is being
              fetched in real time from your store. If there is no badge, the platform is not yet connected.
            </p>
          </InfoCard>
        </HelpSection>

        {/* Overview Page */}
        <HelpSection title="📊 The Overview Page">
          <Accordion title="Revenue & Sales KPIs explained" defaultOpen>
            <Bullet items={[
              'Total Revenue — sum of all paid orders in the selected period',
              'Orders — count of confirmed orders',
              'AOV (Average Order Value) — Total Revenue ÷ Orders',
              'Unique Customers — count of distinct customer email addresses',
              'Repeat Rate — % of customers who have placed more than one order ever',
              'Avg Items/Order — average number of line items per order',
            ]} />
          </Accordion>

          <Accordion title="What &quot;vs previous 30 days&quot; means">
            <p>
              Each KPI card shows a percentage change compared to the equivalent prior period. If you are viewing the
              last 30 days, the comparison is the 30 days before that. A green arrow means the metric improved; red means it declined.
            </p>
          </Accordion>

          <Accordion title="CRO Insights section">
            <p>
              The CRO (Conversion Rate Optimization) section highlights quick wins based on your current data —
              things like high-traffic products with low conversion, or a growing cart abandonment rate. These are
              automatically generated from your Shopify data and refresh each time the page loads.
            </p>
          </Accordion>

          <Accordion title="MER — Marketing Efficiency Ratio">
            <p>
              <strong>MER = Total Shopify Revenue ÷ Total Ad Spend (across all connected ad platforms)</strong>
            </p>
            <p style={{ marginTop: '8px' }}>
              MER gives you a blended view of how efficiently your marketing budget is turning into revenue.
              Unlike platform-specific ROAS, MER accounts for all channels together.
              A MER of 4.0 means every $1 of ad spend generated $4 of revenue.
            </p>
          </Accordion>
        </HelpSection>

        {/* Shopify Analytics */}
        <HelpSection title="🛒 Shopify Analytics">
          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>Revenue Chart</strong>
            <p style={{ marginTop: '6px' }}>Shows daily or weekly sales trends over the selected time window. Hover over a bar to see the exact revenue for that day.</p>
          </InfoCard>

          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>Top Products</strong>
            <p style={{ marginTop: '6px' }}>Products ranked by net revenue in the selected period. Use this to identify your best-sellers and inform ad creative decisions.</p>
          </InfoCard>

          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>Customer Split — New vs Returning</strong>
            <p style={{ marginTop: '6px' }}>
              Orders are split by whether the customer had previously purchased. &quot;New&quot; means it is their first order ever.
              &quot;Returning&quot; means they have placed at least one order before.
            </p>
          </InfoCard>

          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>Fulfillment Status</strong>
            <p style={{ marginTop: '6px' }}>Tracks how orders are progressing through fulfillment — unfulfilled, in progress, fulfilled, and delivered. Useful for spotting fulfilment delays early.</p>
          </InfoCard>

          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>Funnel Tab</strong>
            <p style={{ marginTop: '6px' }}>Shows where potential customers are dropping off — from sessions to product views, add-to-cart, checkout started, and order placed. Helps identify the biggest conversion bottlenecks.</p>
          </InfoCard>
        </HelpSection>

        {/* AI Consultant */}
        <HelpSection title="🤖 AI Consultant">
          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>How it works</strong>
            <p style={{ marginTop: '6px' }}>
              The AI Consultant reads a live snapshot of your store data — revenue, top products, ad spend, customer metrics —
              and lets you ask natural language questions about it. It is powered by Claude (Anthropic).
            </p>
          </InfoCard>

          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>Suggested questions to ask</strong>
            <Bullet items={[
              '"What are my top 5 products by revenue this month?"',
              '"Why might my ROAS have dropped last week?"',
              '"Which products should I scale ads on?"',
              '"What is my blended MER and is it healthy?"',
              '"Give me 3 CRO ideas based on my current funnel."',
            ]} />
          </InfoCard>

          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>Why it says &quot;No data for X&quot;</strong>
            <p style={{ marginTop: '6px' }}>
              The AI only knows what is in the data snapshot taken when you opened the chat. If a platform is not connected,
              or data for a specific metric is not available, the AI will tell you it has no data for that topic.
              Connect the platform first, then start a new chat session.
            </p>
          </InfoCard>
        </HelpSection>

        {/* Custom Metrics */}
        <HelpSection title="📐 Custom Metrics (ShopifyQL)">
          <InfoCard>
            <strong style={{ color: 'var(--text-primary)' }}>What is ShopifyQL?</strong>
            <p style={{ marginTop: '6px' }}>
              ShopifyQL is Shopify&apos;s own analytics query language, similar to SQL but purpose-built for e-commerce data.
              It lets you write custom queries to pull exactly the data you need. Requires an Advanced or Shopify Plus plan.
            </p>
          </InfoCard>

          <Accordion title="Valid data sources (FROM)" defaultOpen>
            <p>Only these two sources are confirmed working for this store:</p>
            <Bullet items={[
              'FROM sales — order and revenue data',
              'FROM sessions — traffic, conversion rate, add-to-cart rate',
            ]} />
            <p style={{ marginTop: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Note: FROM orders, FROM products, FROM customers, FROM checkouts, and FROM fulfillments are not supported in the 2025-10 API.
            </p>
          </Accordion>

          <Accordion title="Basic query structure">
            <p>The general format is:</p>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginTop: '10px',
                color: 'var(--accent-blue)',
                lineHeight: '1.8',
              }}
            >
              FROM [source]<br />
              SHOW [metric1], [metric2]<br />
              SINCE startOfDay(-30d)<br />
              UNTIL today<br />
              ORDER BY [metric] ASC|DESC
            </div>
          </Accordion>

          <Accordion title="Common valid metrics">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
              {[
                ['net_sales', 'Revenue after returns'],
                ['gross_sales', 'Revenue before returns'],
                ['returns', 'Value of returned orders'],
                ['orders', 'Number of orders'],
                ['average_order_value', 'Revenue ÷ Orders'],
                ['sessions', 'Unique store visits'],
                ['conversion_rate', '% of sessions → order'],
                ['added_to_cart_rate', '% of sessions → cart add'],
              ].map(([metric, desc]) => (
                <div key={metric} style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '8px 12px' }}>
                  <Code>{metric}</Code>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{desc}</div>
                </div>
              ))}
            </div>
          </Accordion>

          <Accordion title="GROUP BY, TIMESERIES, and filters">
            <p><strong style={{ color: 'var(--text-primary)' }}>GROUP BY</strong> — valid columns:</p>
            <Bullet items={['product_title', 'shipping_country']} />

            <p style={{ marginTop: '12px' }}><strong style={{ color: 'var(--text-primary)' }}>TIMESERIES</strong> — valid intervals:</p>
            <Bullet items={['TIMESERIES day', 'TIMESERIES week', 'TIMESERIES month']} />

            <p style={{ marginTop: '12px' }}><strong style={{ color: 'var(--text-primary)' }}>Why queries fail:</strong></p>
            <Bullet items={[
              'Using an invalid FROM source (e.g. FROM orders)',
              'Referencing a column that does not exist in that source',
              'Using GROUPED BY instead of GROUP BY (ShopifyQL uses GROUP BY)',
              'Mixing TIMESERIES with GROUP BY in some contexts',
            ]} />
          </Accordion>
        </HelpSection>

        {/* FAQ */}
        <HelpSection title="💬 Frequently Asked Questions">
          <Accordion title="Why does my Unique Customers count show fewer than expected?">
            <p>
              We count unique customer email addresses across all orders in the period.
              Guest checkout orders that were placed without an email address will not be counted.
              Orders placed by the same customer multiple times in the period still count as one unique customer.
            </p>
          </Accordion>

          <Accordion title="Why does New Customer Revenue not add up to total revenue?">
            <p>
              Orders from customers who have more than one lifetime order are categorised as &quot;returning&quot;.
              The split may not always add up to exactly 100% if some orders have no associated customer record
              (e.g. guest checkouts without an email).
            </p>
          </Accordion>

          <Accordion title="Can I export data?">
            <p>
              Not yet — data export is on the roadmap and coming soon. For now, you can use the Custom Metrics
              page to write queries and view results in a table format which you can manually copy.
            </p>
          </Accordion>

          <Accordion title="How often does data refresh?">
            <p>
              Shopify data is cached for 2 hours to keep things fast and avoid hitting API rate limits.
              To force a fresh fetch, click the <strong>Refresh</strong> button at the top of the page.
              Ad platform data (Meta, Google) refreshes on each page load.
            </p>
          </Accordion>

          <Accordion title="My AI Consultant says it&apos;s disabled. What do I do?">
            <p>
              The AI Consultant requires an Anthropic API key to be configured on the server.
              If you see a &quot;disabled&quot; message, the key has not been set up yet.
              Please contact your admin to enable it.
            </p>
          </Accordion>

          <Accordion title="What is the difference between MER and ROAS?">
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>ROAS (Return on Ad Spend)</strong> is platform-specific.
              For example, Meta ROAS = Meta-attributed Revenue ÷ Meta Ad Spend.
              It only counts conversions that Meta&apos;s pixel attributes to Meta ads.
            </p>
            <p style={{ marginTop: '10px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>MER (Marketing Efficiency Ratio)</strong> is blended.
              MER = Total Shopify Revenue ÷ Total Ad Spend across all platforms.
              It gives a more accurate picture of overall marketing efficiency because it is not subject to
              attribution window differences or platform-level over-counting.
            </p>
          </Accordion>
        </HelpSection>

      </div>
    </>
  );
}
