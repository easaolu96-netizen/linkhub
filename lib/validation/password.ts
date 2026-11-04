// Passwords of 8+ characters that top public breach-frequency lists. Attackers
// try these first (password spraying / credential stuffing), so they're refused
// even though they meet the length rule. Supabase's own leaked-password check
// (HaveIBeenPwned) needs a paid plan; this covers the worst offenders for free.
const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "12345678910", "123123123", "11111111", "00000000",
  "87654321", "11223344", "12341234", "123321123", "147258369", "987654321", "123456123",
  "password", "password1", "password12", "password123", "password!", "passw0rd", "p@ssword",
  "p@ssw0rd", "pa$$word", "qwertyui", "qwertyuiop", "qwerty123", "qwerty12", "1q2w3e4r",
  "1qaz2wsx", "zaq12wsx", "q1w2e3r4", "asdfghjk", "asdfghjkl", "zxcvbnm1", "abcd1234",
  "abc12345", "abcdefgh", "a1b2c3d4", "iloveyou", "iloveyou1", "sunshine", "princess",
  "football", "baseball", "superman", "starwars", "whatever", "trustno1", "welcome1",
  "welcome123", "letmein1", "liverpool", "chelsea1", "arsenal1", "jesus123", "blessing",
  "godisgood", "computer", "internet", "michael1", "jennifer", "corvette", "mercedes",
  "football1", "monkey123", "dragon123", "shadow12", "master123", "changeme", "default1",
  "linkhub1", "linkhub123", "admin123", "administrator", "test1234", "testtest",
]);

/** Why a new password is too easy to guess, or null if it's acceptable. */
export function weakPasswordReason(password: string, email?: string): string | null {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return "That password is too common. Choose something less guessable.";
  if (/^(.)\1+$/.test(password)) return "Don't use a single repeated character.";
  const name = email?.split("@")[0]?.toLowerCase() ?? "";
  if (name.length >= 4 && lower.includes(name)) return "Don't use your email address in your password.";
  return null;
}
