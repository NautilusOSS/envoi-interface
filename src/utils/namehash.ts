import crypto from 'crypto';

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

export async function namehash(name: string): Promise<Uint8Array> {
  if (!name) {
    return new Uint8Array(32); // Return 32 bytes of zeros for empty name
  }

  // Split the name into labels and reverse them
  const labels = name.split('.').reverse();

  // Start with empty hash (32 bytes of zeros)
  let node = new Uint8Array(32);

  // Hash each label
  for (const label of labels) {
    if (label) { // Skip empty labels
      // Hash the label
      const labelBytes = new TextEncoder().encode(label);
      const labelHash = await sha256(labelBytes);
      
      // Concatenate current node hash with label hash and hash again
      const combined = new Uint8Array(labelHash.length + node.length);
      combined.set(node);
      combined.set(labelHash, node.length);
      node = await sha256(combined);
    }
  }

  return node;
}

export function stringToUint8Array(str: string): Uint8Array {
  const bytes = new Uint8Array(256);
  const encoded = new TextEncoder().encode(str);
  bytes.set(encoded, 0);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function bytesToBase64(bytes: Uint8Array): string {
  return window.btoa(String.fromCharCode.apply(null, Array.from(bytes)));
} 