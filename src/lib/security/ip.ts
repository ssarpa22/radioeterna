import net from 'node:net';

/** True only for globally routable unicast IPs. Used by the stream verifier (SSRF defense). */
export function isPublicIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number) as [number, number];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;           // this-net, private, loopback, multicast/reserved
    if (a === 100 && b >= 64 && b <= 127) return false;                        // CGNAT
    if (a === 169 && b === 254) return false;                                  // link-local + cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || (b === 0 && ip.startsWith('192.0.0.')))) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    if (s === '::' || s === '::1') return false;
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]!);
    if (/^f[cd]/.test(s) || /^fe[89ab]/.test(s) || s.startsWith('ff')) return false; // ULA, link-local, multicast
    return true;
  }
  return false;
}
