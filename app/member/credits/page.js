'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/components/AppShell';
import { useAttempt, useDialog } from '@/components/Providers';
import { Empty, Loading, PageHead } from '@/components/ui';
import { api } from '@/lib/client/api';
import { credits, fmtDateTime, fmtMoney } from '@/lib/client/format';

const TYPE = { purchase: 'Purchase', booking: 'Booking', refund: 'Refund', adjustment: 'Adjustment' };

export default function CreditsPage() {
  const { setBalance } = useSession();
  const ask = useDialog();
  const attempt = useAttempt();
  const [packages, setPackages] = useState(null);
  const [ledger, setLedger] = useState(null);

  const load = useCallback(async () => {
    const [pkgs, led] = await Promise.all([attempt(() => api('/credit-packages')), attempt(() => api('/me/credits'))]);
    if (pkgs) setPackages(pkgs);
    if (led) {
      setLedger(led);
      setBalance(led.balance);
    }
  }, [attempt, setBalance]);
  useEffect(() => {
    load();
  }, [load]);

  async function buy(p) {
    const ok = await ask({
      title: `Buy ${p.name}?`,
      body: (
        <>
          <p>
            <b>{credits(p.credits)}</b> for <b>{fmtMoney(p.price_usd)}</b>.
          </p>
          <div className="notice warn small">Simulated checkout: no payment is taken.</div>
        </>
      ),
      confirm: `Pay ${fmtMoney(p.price_usd)}`,
      kind: 'accent',
    });
    if (!ok) return;
    const res = await attempt(
      () => api('/me/credits/purchase', { method: 'POST', body: { package_id: p.id } }),
      `${credits(p.credits)} added.`,
    );
    if (res) load();
  }

  const best = packages ? Math.min(...packages.map((p) => p.price_per_credit)) : null;

  return (
    <>
      <PageHead eyebrow="Credits" title="Your credits">
        Classes cost 1–3 credits. Bigger packages cost less per credit.
      </PageHead>
      <div className="split">
        <div className="stack">
          <div className="card">
            <div className="muted small">Current balance</div>
            <div className="stat" style={{ margin: '8px 0 4px' }}>
              {ledger ? ledger.balance : '–'}
            </div>
            <div className="muted small">credits</div>
          </div>
          <div className="notice warn small">
            Payments are <b>simulated</b> in this prototype. No card is charged.
          </div>
        </div>
        <div className="stack">
          <h2>Buy a package</h2>
          {!packages ? (
            <Loading />
          ) : (
            <div className="grid-cards">
              {packages.map((p) => {
                const featured = p.price_per_credit === best;
                return (
                  <div key={p.id} className={`card package ${featured ? 'featured' : ''}`}>
                    <div className="row">
                      <h3>{p.name}</h3>
                      {featured && <span className="badge orange">Best value</span>}
                    </div>
                    <div>
                      <span className="stat">{p.credits}</span> <span className="muted">credits</span>
                    </div>
                    <div>
                      <b>{fmtMoney(p.price_usd)}</b> <span className="muted small">· {fmtMoney(p.price_per_credit)} per credit</span>
                    </div>
                    <button className={`btn ${featured ? 'btn-accent' : 'btn-primary'}`} onClick={() => buy(p)}>
                      Buy
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card flush" style={{ marginTop: 32 }}>
        <div className="card-head" style={{ padding: '18px 20px 0' }}>
          <h2>History</h2>
        </div>
        <div className="table-wrap">
          {!ledger ? (
            <p className="loading" style={{ padding: 20 }}>
              Loading…
            </p>
          ) : !ledger.transactions.length ? (
            <div style={{ padding: '0 20px 20px' }}>
              <Empty title="No transactions yet">Buy a package to get started.</Empty>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th className="num">Paid</th>
                  <th className="num">Credits</th>
                </tr>
              </thead>
              <tbody>
                {ledger.transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="nowrap">{fmtDateTime(t.created_at)}</td>
                    <td>{TYPE[t.type] ?? t.type}</td>
                    <td className="muted">{t.note}</td>
                    <td className="num">{fmtMoney(t.amount_usd)}</td>
                    <td className={`num ${t.delta > 0 ? 'pos' : 'neg'}`}>
                      {t.delta > 0 ? '+' : ''}
                      {t.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
