// npm run reset — rebuilds data/db.json from the placeholder seed.
// Stop `npm run dev` first, or the running server will write its old copy back.
import { resetDb, DATA_PATH } from '../lib/server/db/store.js';

const db = resetDb();
console.log(
  `Reset placeholder data at ${DATA_PATH}: ${db.users.length} users, ${db.classes.length} classes, ` +
    `${db.sessions.length} sessions, ${db.bookings.length} bookings.`,
);
