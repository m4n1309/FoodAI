const KEY_ID = 'customer_session_id';
const KEY_CREATED = 'customer_session_created_at';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const generateFallbackUuid = () => {
  const bytes = new Uint8Array(16);

  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // RFC4122 v4 formatting bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const generateSessionId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return generateFallbackUuid();
};

export const getOrCreateCustomerSessionId = () => {
  const id = localStorage.getItem(KEY_ID);
  const createdAtStr = localStorage.getItem(KEY_CREATED);

  if (id && createdAtStr) {
    const createdAt = Number(createdAtStr);
    if (!Number.isNaN(createdAt) && Date.now() - createdAt < ONE_DAY_MS) {
      return id;
    }
  }

  const newId = generateSessionId();
  localStorage.setItem(KEY_ID, newId);
  localStorage.setItem(KEY_CREATED, String(Date.now()));
  return newId;
};

export const clearCustomerSession = () => {
  localStorage.removeItem(KEY_ID);
  localStorage.removeItem(KEY_CREATED);
};