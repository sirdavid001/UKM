export const PROFANITY = ["hate", "stupid", "idiot", "die", "ugly", "bitch"];

export function containsProfanity(content: string) {
  const normalized = content.toLowerCase();
  return PROFANITY.some((word) => normalized.includes(word));
}
