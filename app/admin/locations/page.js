'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAttempt, useDialog } from '@/components/Providers';
import { Empty, Loading, PageHead } from '@/components/ui';
import { api } from '@/lib/client/api';
import { plural } from '@/lib/client/format';

function ZipChips({ zips }) {
  return zips.length ? (
    <div className="chips">
      {zips.map((z) => (
        <span className="chip" key={z}>
          {z}
        </span>
      ))}
    </div>
  ) : (
    <span className="muted small">No tags</span>
  );
}

function LocationFields({ l = {} }) {
  return (
    <div className="form-grid">
      <label className="field full">
        <span>Name</span>
        <input className="input" name="name" required minLength={2} maxLength={80} defaultValue={l.name ?? 'StudioPass '} />
      </label>
      <label className="field">
        <span>Neighborhood</span>
        <input className="input" name="neighborhood" maxLength={60} defaultValue={l.neighborhood ?? ''} />
      </label>
      <label className="field">
        <span>Main ZIP</span>
        <input className="input" name="zip" required pattern="\d{5}" inputMode="numeric" maxLength={5} defaultValue={l.zip ?? ''} />
      </label>
      <label className="field full">
        <span>Address</span>
        <input className="input" name="address" maxLength={120} defaultValue={l.address ?? ''} />
      </label>
      <label className="field full">
        <span>ZIP tags</span>
        <input className="input" name="zip_tags" defaultValue={(l.zip_tags ?? []).join(', ')} placeholder="11211, 11249" />
        <small>Nearby ZIP codes, separated by commas.</small>
      </label>
    </div>
  );
}

export default function AdminLocationsPage() {
  const ask = useDialog();
  const attempt = useAttempt();
  const [locations, setLocations] = useState(null);
  const [instructors, setInstructors] = useState(null);

  const load = useCallback(async () => {
    const [locs, inst] = await Promise.all([attempt(() => api('/admin/locations')), attempt(() => api('/admin/instructors'))]);
    if (locs) setLocations(locs);
    if (inst) setInstructors(inst);
  }, [attempt]);
  useEffect(() => {
    load();
  }, [load]);

  async function addLocation() {
    const form = await ask({ title: 'Add location', body: <LocationFields />, confirm: 'Add location' });
    if (form && (await attempt(() => api('/admin/locations', { method: 'POST', body: form }), 'Location added.'))) load();
  }

  async function editLocation(l) {
    const form = await ask({ title: `Edit ${l.name}`, body: <LocationFields l={l} />, confirm: 'Save' });
    if (form && (await attempt(() => api(`/admin/locations/${l.id}`, { method: 'PATCH', body: form }), 'Location saved.'))) load();
  }

  async function editInstructor(i) {
    const studioZips = [...new Set(locations.map((l) => l.zip))];
    const form = await ask({
      title: `ZIP tags for ${i.name}`,
      body: (
        <>
          <label className="field">
            <span>Home ZIP</span>
            <input className="input" name="zip" required pattern="\d{5}" inputMode="numeric" maxLength={5} defaultValue={i.zip} />
          </label>
          <label className="field">
            <span>Teaches in</span>
            <input className="input" name="zip_tags" defaultValue={i.zip_tags.join(', ')} />
            <small>Comma-separated. Studio ZIPs: {studioZips.join(', ')}</small>
          </label>
        </>
      ),
      confirm: 'Save tags',
    });
    if (!form) return;
    const res = await attempt(
      () => api(`/admin/instructors/${encodeURIComponent(i.email)}`, { method: 'PATCH', body: form }),
      'Instructor tags saved.',
    );
    if (res) load();
  }

  return (
    <>
      <PageHead
        eyebrow="Admin"
        title="Locations & ZIP tags"
        actions={
          <button className="btn btn-accent" onClick={addLocation}>
            Add location
          </button>
        }
      >
        Each studio has a main ZIP code plus nearby ZIP tags. A member searching any of those ZIPs will find that studio&apos;s
        classes. Instructors are tagged with the ZIPs they teach in.
      </PageHead>

      <h2 style={{ marginBottom: 12 }}>Studios</h2>
      {!locations ? (
        <Loading />
      ) : !locations.length ? (
        <Empty title="No locations yet" />
      ) : (
        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>
          {locations.map((l) => (
            <article className="card stack" style={{ gap: 10 }} key={l.id}>
              <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
                <div>
                  <h3>{l.neighborhood || l.name}</h3>
                  <p className="muted small">{l.address}</p>
                </div>
                <span className="badge teal">{l.zip}</span>
              </div>
              <div>
                <div className="muted small" style={{ marginBottom: 6 }}>
                  ZIP tags
                </div>
                <ZipChips zips={l.zip_tags} />
              </div>
              <div className="row">
                <span className="muted small">{plural(l.class_count, 'active class')}</span>
                <span className="spacer" />
                <button className="btn btn-ghost btn-sm" onClick={() => editLocation(l)}>
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <h2 style={{ margin: '36px 0 12px' }}>Instructors</h2>
      <div className="card flush">
        <div className="table-wrap">
          {!instructors ? (
            <p className="loading" style={{ padding: 20 }}>
              Loading…
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Instructor</th>
                  <th>Home ZIP</th>
                  <th>Teaches in (ZIP tags)</th>
                  <th>Classes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {instructors.map((i) => (
                  <tr key={i.email}>
                    <td>
                      <strong>{i.name}</strong>
                      <br />
                      <span className="muted small">{i.email}</span>
                    </td>
                    <td>{i.zip}</td>
                    <td>
                      <ZipChips zips={i.zip_tags} />
                    </td>
                    <td>{i.class_count}</td>
                    <td className="num">
                      <button className="btn btn-ghost btn-sm" onClick={() => editInstructor(i)}>
                        Edit tags
                      </button>
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
