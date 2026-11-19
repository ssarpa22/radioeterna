import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { detectAudio, getCertificateErrorCode, verifyStream } from '@/lib/security/verify-stream';

let server: http.Server; let base = '';
const mp3 = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x00]), Buffer.alloc(9000)]);
beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/mp3') { res.writeHead(200, { 'content-type': 'audio/mpeg' }); res.write(mp3); return; /* never ends, like a live stream */ }
    if (req.url === '/redir') { res.writeHead(302, { location: '/mp3' }); return res.end(); }
    if (req.url === '/loop') { res.writeHead(302, { location: '/loop' }); return res.end(); }
    if (req.url === '/html') { res.writeHead(200, { 'content-type': 'audio/mpeg' }); return res.end('<!DOCTYPE html><html></html>'); }
    if (req.url === '/hls') { res.writeHead(200, { 'content-type': 'application/vnd.apple.mpegurl' }); return res.end('#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:10,\nseg.ts\n'); }
    if (req.url === '/forbidden') { res.writeHead(403); return res.end(); }
    if (req.url === '/hang') { res.writeHead(200, { 'content-type': 'audio/mpeg' }); return; }
    res.writeHead(404); res.end();
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => { server.closeAllConnections?.(); server.close(); });
const any = { isAllowedIp: () => true };   // test-only override: the local server is on loopback

describe('SSRF defaults (no override)', () => {
  it.each(['http://127.0.0.1/x', 'http://localhost/x', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/x', 'http://10.0.0.5/x', 'http://192.168.1.1/x', 'http://user:pw@example.com/x', 'ftp://example.com/x', 'file:///etc/passwd', 'not a url'])('blocks %s', async (u) => {
    const r = await verifyStream(u); expect(r.reachable).toBe(false); expect(r.error).toBeTruthy();
  });
});
describe('verification logic', () => {
  it('detects mp3 from bytes on a never-ending stream', async () => { const r = await verifyStream(`${base}/mp3`, any); expect(r.audio_detected).toBe(true); expect(r.detected_format).toBe('mp3'); });
  it('follows redirects', async () => { const r = await verifyStream(`${base}/redir`, any); expect(r.redirects).toBe(1); expect(r.audio_detected).toBe(true); });
  it('stops redirect loops', async () => { const r = await verifyStream(`${base}/loop`, any); expect(r.error).toMatch(/redirecciones/); });
  it('does not trust the Content-Type header alone', async () => { const r = await verifyStream(`${base}/html`, any); expect(r.reachable).toBe(true); expect(r.audio_detected).toBe(false); });
  it('detects HLS playlists', async () => { expect((await verifyStream(`${base}/hls`, any)).detected_format).toBe('hls'); });
  it('reports HTTP errors', async () => { const r = await verifyStream(`${base}/forbidden`, any); expect(r.reachable).toBe(false); expect(r.http_status).toBe(403); });
  it('times out a silent server', async () => { const r = await verifyStream(`${base}/hang`, { ...any, timeoutMs: 800 }); expect(r.audio_detected).toBe(false); expect(r.duration_ms).toBeLessThan(5000); });
  it('re-validates redirect targets (public → private is blocked)', async () => {
    const r = await verifyStream(`${base}/redir`, { isAllowedIp: (ip) => ip !== '127.0.0.1' }); expect(r.reachable).toBe(false);
  });
});
describe('certificate diagnostics', () => {
  it.each([
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'ERR_TLS_CERT_ALTNAME_INVALID'],
    ['CERT_HAS_EXPIRED', 'CERT_HAS_EXPIRED'],
    ['DEPTH_ZERO_SELF_SIGNED_CERT', 'DEPTH_ZERO_SELF_SIGNED_CERT'],
  ])('preserves the safe error code %s', (code, expected) => {
    expect(getCertificateErrorCode(Object.assign(new Error('TLS details are not logged'), { code }))).toBe(expected);
  });
  it('does not classify ordinary network errors as certificate failures', () => {
    expect(getCertificateErrorCode(Object.assign(new Error('connection reset'), { code: 'ECONNRESET' }))).toBeNull();
  });
});
describe('detectAudio', () => {
  it('ADTS AAC vs MP3 frame sync', () => { expect(detectAudio(Buffer.from([0xff, 0xf1, 0, 0]), null).format).toBe('aac'); expect(detectAudio(Buffer.from([0xff, 0xfb, 0, 0]), null).format).toBe('mp3'); });
  it('Ogg and ID3', () => { expect(detectAudio(Buffer.from('OggS....'), null).format).toBe('ogg'); expect(detectAudio(Buffer.from('ID3\x04'), null).format).toBe('mp3'); });
  it('plain .m3u is not a stream', () => { expect(detectAudio(Buffer.from('#EXTM3U\nhttp://x/y'), null).format).toBeNull(); });
});
