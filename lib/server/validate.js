import { badRequest } from './errors.js';
import { clock } from './config.js';

export function str(value, field, { min = 1, max = 200, optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return '';
    throw badRequest(`${field} is required.`);
  }
  if (typeof value !== 'string') throw badRequest(`${field} must be text.`);
  const v = value.trim();
  if (v.length < min) throw badRequest(`${field} must be at least ${min} characters.`);
  if (v.length > max) throw badRequest(`${field} must be at most ${max} characters.`);
  return v;
}

export function int(value, field, { min = -Infinity, max = Infinity } = {}) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(n)) throw badRequest(`${field} must be a whole number.`);
  if (n < min || n > max) throw badRequest(`${field} must be between ${min} and ${max}.`);
  return n;
}

export function oneOf(value, field, options) {
  if (!options.includes(value)) throw badRequest(`${field} must be one of: ${options.join(', ')}.`);
  return value;
}

export const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

export function email(value) {
  const v = normalizeEmail(str(value, 'Email', { max: 120 }));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw badRequest('Email looks invalid.');
  return v;
}

// Prototype only: passwords are stored as plain text on purpose (student project).
export function password(value) {
  if (typeof value !== 'string' || value.length < 4) throw badRequest('Password must be at least 4 characters.');
  if (value.length > 100) throw badRequest('Password is too long.');
  return value;
}

export function zip(value, field = 'ZIP code') {
  const v = str(String(value ?? ''), field, { max: 5 });
  if (!/^\d{5}$/.test(v)) throw badRequest(`${field} must be 5 digits.`);
  return v;
}

export function zipList(value, field = 'ZIP tags') {
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  const zips = list.map((z) => String(z).trim()).filter(Boolean);
  for (const z of zips) if (!/^\d{5}$/.test(z)) throw badRequest(`${field}: "${z}" is not a 5-digit ZIP.`);
  return [...new Set(zips)];
}

export function futureDate(value, field) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) throw badRequest(`${field} must be a valid date and time.`);
  if (d <= clock.now()) throw badRequest(`${field} must be in the future.`);
  return d.toISOString();
}
