export function gymFromAddress(gym: {
  name: string;
  emailDomain?: string;
  emailDomainStatus?: string;
}): string | undefined {
  if (gym.emailDomain && gym.emailDomainStatus === "verified") {
    return `${gym.name} <noreply@${gym.emailDomain}>`;
  }
  return undefined;
}

export function generateInviteCode(): string {
  // 8-char base32 code from 5 random bytes (~40 bits of CSPRNG entropy).
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit ambiguous I,O,0,1
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] & 0x1f];
    out += alphabet[(bytes[i] >> 5) & 0x07 | ((bytes[(i + 1) % bytes.length] & 0x03) << 3)];
  }
  return out.slice(0, 8);
}
