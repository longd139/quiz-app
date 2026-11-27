/**
 * Password policy validation shared across Login / Change Password / Admin User Management.
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ số.';
  }
  return null;
}
