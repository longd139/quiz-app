// Cloudinary image upload utility using signed upload with SHA-1
async function generateSha1(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getCloudinaryConfig() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || localStorage.getItem('cloudinary_cloud_name') || 'pv0t9rx7';
  const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY || localStorage.getItem('cloudinary_api_key') || '899679261911623';
  const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET || localStorage.getItem('cloudinary_api_secret') || 'b1z1XZAwQKe58az9as900ORnnL8';

  return { cloudName, apiKey, apiSecret };
}

export function setCloudinaryCloudName(name) {
  if (name) {
    localStorage.setItem('cloudinary_cloud_name', name.trim());
  } else {
    localStorage.removeItem('cloudinary_cloud_name');
  }
}

/**
 * Upload image to Cloudinary using signed upload
 * @param {File|Blob} file 
 * @returns {Promise<string>} secure_url of uploaded image
 */
export async function uploadToCloudinary(file) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  if (!cloudName) {
    throw new Error('Chưa cấu hình Cloud Name của Cloudinary. Vui lòng cung cấp Cloud Name để upload ảnh lên Cloud.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'vocab_flashcards';

  // Cloudinary requires alphabetically sorted parameters for signing
  const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = await generateSha1(stringToSign);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error?.message || `Lỗi tải ảnh lên Cloudinary (${res.status})`);
  }

  return data.secure_url || data.url;
}
