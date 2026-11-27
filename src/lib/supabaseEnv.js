const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

const LOCAL_DEMO_KEYS = new Set([
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
]);

export function validateSupabaseClientConfig({
  mode = 'development',
  dev = false,
  prod = false,
  appEnv = '',
  supabaseUrl = '',
  publishableKey = '',
}) {
  const normalizedMode = String(mode || '').trim().toLowerCase();
  const normalizedAppEnv = String(appEnv || '').trim().toLowerCase();
  const trimmedUrl = String(supabaseUrl || '').trim();
  const trimmedKey = String(publishableKey || '').trim();

  if (!trimmedUrl || !trimmedKey) {
    return {
      ok: false,
      error: 'Thiếu cấu hình Supabase (VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY).',
    };
  }

  let parsed;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    return {
      ok: false,
      error: `VITE_SUPABASE_URL không hợp lệ: "${trimmedUrl}".`,
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      error: `VITE_SUPABASE_URL phải dùng giao thức http hoặc https (nhận "${parsed.protocol}").`,
    };
  }

  const isLocal = LOCAL_HOSTS.has(parsed.hostname.toLowerCase());
  const isTestMode = normalizedMode === 'test' || normalizedAppEnv === 'test';
  const isProdMode = normalizedMode === 'production' && prod === true && !isTestMode;
  const isDevMode = !isProdMode && !isTestMode && (normalizedMode === 'development' || dev === true);

  if (isDevMode) {
    if (normalizedAppEnv === 'production' || normalizedAppEnv === 'staging') {
      return {
        ok: false,
        error: `Từ chối chạy development với VITE_APP_ENV="${appEnv}".`,
      };
    }
    if (!isLocal) {
      return {
        ok: false,
        error: `Fail-closed: Development mode chỉ cho phép Supabase local (127.0.0.1/localhost), không cho phép "${parsed.hostname}".`,
      };
    }
    if (parsed.port === '54331') {
      return {
        ok: false,
        error: 'Fail-closed: Development mode không được kết nối vào cổng test DB (54331).',
      };
    }
  } else if (isTestMode) {
    if (normalizedAppEnv === 'production' || normalizedAppEnv === 'staging') {
      return {
        ok: false,
        error: `Từ chối chạy test với VITE_APP_ENV="${appEnv}".`,
      };
    }
    if (!isLocal) {
      return {
        ok: false,
        error: `Fail-closed: Test mode chỉ cho phép Supabase local, không cho phép "${parsed.hostname}".`,
      };
    }
    if (parsed.port === '54321') {
      return {
        ok: false,
        error: 'Fail-closed: Test mode không được kết nối vào development DB (cổng 54321).',
      };
    }
  } else if (isProdMode) {
    if (normalizedAppEnv === 'development' || normalizedAppEnv === 'test' || normalizedAppEnv === 'local') {
      return {
        ok: false,
        error: `Production build không được cấu hình VITE_APP_ENV="${appEnv}".`,
      };
    }
    if (isLocal) {
      return {
        ok: false,
        error: 'Fail-closed: Production build không được fallback về localhost/127.0.0.1.',
      };
    }
    if (LOCAL_DEMO_KEYS.has(trimmedKey)) {
      return {
        ok: false,
        error: 'Fail-closed: Production build không được sử dụng local demo publishable/anon key.',
      };
    }
  }

  return { ok: true, error: null, url: trimmedUrl, isLocal };
}
