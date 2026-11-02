// A count and its word, for anything a player reads: "1 day", "3 days". `plural`
// is for a word that doesn't just take an s; `shown` is for a figure written
// another way, such as through formatAmount.
export function counted(n: number, word: string, plural = `${word}s`, shown = String(n)): string {
  return `${shown} ${n === 1 ? word : plural}`;
}
