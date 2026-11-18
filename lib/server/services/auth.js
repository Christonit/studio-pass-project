// PROTOTYPE AUTH — on purpose, this is a student project:
// - Sign-up only checks the email isn't taken, then the account works right away
//   (no verification email).
// - Passwords are stored and compared as plain text.
// - The session cookie just holds the user's email (their primary key).
import { getDb, userByEmail, save } from '../db/store.js';
import { clock, DEMO_PASSWORD, SIGNUP_ROLES } from '../config.js';
import { conflict, unauthorized } from '../errors.js';
import * as v from '../validate.js';
import { publicUser } from './present.js';

export async function listDemoUsers() {
  return getDb()
    .users.filter((u) => u.demo)
    .map((u) => ({ ...publicUser(u), demo_password: DEMO_PASSWORD }));
}

export async function login({ email, password }) {
  const user = userByEmail(v.email(email));
  if (!user || user.password !== password) throw unauthorized('Wrong email or password.');
  return publicUser(user);
}

export async function signup({ name, email, password, zip, role = 'member' }) {
  const data = {
    email: v.email(email),
    password: v.password(password),
    role: v.oneOf(role, 'Account type', SIGNUP_ROLES),
    name: v.str(name, 'Name', { min: 2, max: 80 }),
    zip: v.zip(zip),
  };
  if (userByEmail(data.email)) throw conflict('An account with that email already exists. Sign in instead.');
  const user = {
    ...data,
    credits: data.role === 'member' ? 0 : null,
    zip_tags: data.role === 'instructor' ? [data.zip] : [],
    bio: '',
    demo: false,
    created_at: clock.now().toISOString(),
  };
  getDb().users.push(user);
  save();
  return publicUser(user);
}
