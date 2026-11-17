import net from 'node:net';

function isPublicIpv4(ip: string): boolean {
  if (net.isIP(ip) !== 4) return false;
  const [a, b, c] = ip.split('.').map(Number) as [number, number, number, number];

  // Non-public, special-purpose, documentation, benchmarking and reserved ranges.
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // shared address space (100.64.0.0/10)
  if (a === 169 && b === 254) return false; // link-local and cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2) || (b === 88 && c === 99))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a === 240) return false; // reserved for future use, including limited broadcast
  return true;
}

/** Parse every valid IPv6 spelling (including embedded dotted IPv4) to a 128-bit integer. */
function ipv6ToBigInt(input: string): bigint | null {
  let ip = input.toLowerCase();

  // Expand an IPv4 tail into the final two hexadecimal groups.
  if (ip.includes('.')) {
    const colon = ip.lastIndexOf(':');
    if (colon < 0) return null;
    const tail = ip.slice(colon + 1);
    if (net.isIP(tail) !== 4) return null;
    const octets = tail.split('.').map(Number);
    const high = ((octets[0]! << 8) | octets[1]!).toString(16);
    const low = ((octets[2]! << 8) | octets[3]!).toString(16);
    ip = `${ip.slice(0, colon)}:${high}:${low}`;
  }

  const halves = ip.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0]!.split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1]!.split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;

  const groups = [...left, ...Array(missing).fill('0'), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

/** True only for globally routable unicast IPs. Used by the stream verifier (SSRF defense). */
export function isPublicIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPublicIpv4(ip);
  if (version !== 6) return false;

  const value = ipv6ToBigInt(ip);
  if (value === null || value === 0n || value === 1n) return false;

  // IPv4-mapped IPv6 can be written in dotted or hexadecimal form. Apply the IPv4 rules
  // to the embedded address instead of treating the IPv6 spelling as globally routable.
  if ((value >> 32n) === 0xffffn) {
    const embedded = Number(value & 0xffffffffn);
    return isPublicIpv4([
      (embedded >>> 24) & 255,
      (embedded >>> 16) & 255,
      (embedded >>> 8) & 255,
      embedded & 255,
    ].join('.'));
  }

  // Reject IPv4-compatible addresses and all IPv6 outside global-unicast 2000::/3.
  if ((value >> 32n) === 0n || (value >> 125n) !== 1n) return false;

  const first32 = Number(value >> 96n);
  // IETF protocol assignments (2001::/23), documentation (2001:db8::/32),
  // 6to4 (2002::/16), and the newer documentation prefix (3fff::/20).
  if (first32 >= 0x20010000 && first32 <= 0x200101ff) return false;
  if (first32 === 0x20010db8) return false;
  if (Math.floor(first32 / 0x10000) === 0x2002) return false;
  if ((first32 & 0xfffff000) === 0x3fff0000) return false;

  return true;
}
