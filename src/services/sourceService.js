import { supabase } from '../lib/supabase';

function getFunctionsBaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  return `${url.replace(/\/$/, '')}/functions/v1`;
}

async function getAccessToken() {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Vui lòng đăng nhập lại.');
  return session.access_token;
}

async function callFunction(fnName, body) {
  const token = await getAccessToken();
  const res = await fetch(`${getFunctionsBaseUrl()}/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(payload?.error || `Lỗi máy chủ (${res.status})`);
    err.status = res.status;
    err.retryAfterSeconds = payload?.retryAfterSeconds || null;
    throw err;
  }
  return payload;
}

// ---------------------------------------------------------------------------
// User Workflows (redeem-source)
// ---------------------------------------------------------------------------
export async function redeemSourceByCode({ accessCode, operationId }) {
  return callFunction('redeem-source', {
    action: 'redeem',
    accessCode,
    operationId,
  });
}

export async function listMySourceRedemptions() {
  return callFunction('redeem-source', {
    action: 'list_my_redemptions',
  });
}

export async function getSourceDownloadUrl(redemptionId) {
  return callFunction('redeem-source', {
    action: 'get_download_url',
    redemptionId,
  });
}

// ---------------------------------------------------------------------------
// Admin Workflows (admin-source)
// ---------------------------------------------------------------------------
export async function fetchAdminSourceOverview() {
  return callFunction('admin-source', { action: 'overview_and_list' });
}

export async function createSourcePackage(payload) {
  return callFunction('admin-source', { action: 'create_package', ...payload });
}

export async function updateSourcePackage(payload) {
  return callFunction('admin-source', { action: 'update_package', ...payload });
}

export async function createSourceAccessCode(payload) {
  return callFunction('admin-source', { action: 'create_code', ...payload });
}

export async function rotateSourceAccessCode(payload) {
  return callFunction('admin-source', { action: 'rotate_code', ...payload });
}

export async function revokeSourceAccessCode(codeId) {
  return callFunction('admin-source', { action: 'revoke_code', code_id: codeId });
}

export function uploadSourcePackageZip({ packageId, file, onProgress }) {
  let xhr = null;

  const promise = (async () => {
    const token = await getAccessToken();
    const formData = new FormData();
    formData.append('packageId', packageId);
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      xhr = new XMLHttpRequest();
      xhr.open('POST', `${getFunctionsBaseUrl()}/admin-source`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && typeof onProgress === 'function') {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };

      xhr.onload = () => {
        let parsed;
        try {
          parsed = JSON.parse(xhr.responseText || '{}');
        } catch {
          parsed = {};
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed);
        } else {
          reject(new Error(parsed?.error || `Upload thất bại (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Lỗi kết nối khi tải tệp lên.'));
      xhr.onabort = () => reject(new Error('Đã hủy tải tệp lên.'));
      xhr.send(formData);
    });
  })();

  return {
    promise,
    abort: () => {
      if (xhr) xhr.abort();
    },
  };
}
