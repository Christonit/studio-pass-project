import { redirect } from 'next/navigation';
import AuthPanel from '@/components/AuthPanel';
import { getSessionUser, homeFor } from '@/lib/server/session';

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));

  return (
    <div className="landing">
      <section className="landing-hero">
        <span className="brand">
          <span className="brand-mark">SP</span>StudioPass
        </span>
        <div>
          <div className="eyebrow">Credit-based class booking</div>
          <h1>Full classes. Less paperwork.</h1>
          <p>
            One place for independent fitness and yoga studios: members book with credits, instructors propose classes, and
            admins run the schedule.
          </p>
        </div>
        <div className="hero-points">
          <div>
            <b>Members</b> · filter by discipline, level and ZIP, then book with credits
          </div>
          <div>
            <b>Instructors</b> · propose classes, see rosters, take attendance
          </div>
          <div>
            <b>Admins</b> · approve proposals, manage sessions, set ZIP tags and prices
          </div>
        </div>
      </section>
      <section className="landing-panel">
        <AuthPanel />
      </section>
    </div>
  );
}
