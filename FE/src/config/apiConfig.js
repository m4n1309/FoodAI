export const resolveApiBaseUrl = () => {
  const configured = (import.meta.env.VITE_API_URL || '').trim();
  if (!configured) return '';

  try {
    const parsed = new URL(configured);
    const isDev = import.meta.env.DEV;
    const isLocalhostConfig = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    const currentHost = window.location.hostname;
    const isCurrentHostLocal = ['localhost', '127.0.0.1', '::1'].includes(currentHost);

    if (isDev && currentHost && parsed.hostname !== currentHost) {
      parsed.hostname = currentHost;
    } else if (isLocalhostConfig && currentHost && !isCurrentHostLocal) {
      parsed.hostname = currentHost;
    }

    return parsed.toString().replace(/\/$/, '');
  } catch {
    return configured.replace(/\/$/, '');
  }
};

export const API_BASE_URL = resolveApiBaseUrl();
