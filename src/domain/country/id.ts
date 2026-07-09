// Generates unique-enough string ids for events, projects, and reports so
// React can key list items. This is bookkeeping, not simulation logic, so a
// simple incrementing counter is intentionally used instead of a UUID library.
let counter = 0;

export function generateId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
