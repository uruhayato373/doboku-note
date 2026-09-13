import { generateKeyPairSync, createPublicKey, createPrivateKey, diffieHellman, hkdfSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

// Public CI receives only a temporary public key, never its local private key.
export function createEnvelopeKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('x25519');
  return { publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64') };
}
function parsePublic(value) {
  const key = createPublicKey({ key: Buffer.from(value, 'base64'), type: 'spki', format: 'der' });
  if (key.asymmetricKeyType !== 'x25519') throw new Error('x25519 public key required');
  return key;
}
export function sealReport(value, recipient) {
  const { publicKey, privateKey } = generateKeyPairSync('x25519');
  const salt = randomBytes(32), iv = randomBytes(12);
  const key = hkdfSync('sha256', diffieHellman({ privateKey, publicKey: parsePublic(recipient) }), salt, 'youtube-thumbnail-rollout-v1', 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { version: 1, ephemeral: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}
export function openReport(envelope, recipient) {
  if (envelope.version !== 1) throw new Error('Unsupported encrypted report');
  const privateKey = createPrivateKey({ key: Buffer.from(recipient, 'base64'), type: 'pkcs8', format: 'der' });
  const key = hkdfSync('sha256', diffieHellman({ privateKey, publicKey: parsePublic(envelope.ephemeral) }),
    Buffer.from(envelope.salt, 'base64'), 'youtube-thumbnail-rollout-v1', 32);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8'));
}
