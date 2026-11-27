# Hướng dẫn Triển khai Quiz App V2.0

## 1. Cấu hình Supabase Production

1. **Tắt Public Signup** (Bắt buộc):
   - Vào **Supabase Dashboard → Authentication → Providers → Email**.
   - Tắt tùy chọn **Allow new users to sign up**.
2. **Áp dụng Migrations**:
   - Chạy `supabase/migrations/20261127000001_v2_centralized_schema.sql`.
   - Chạy `supabase/migrations/20261127000002_v2_legacy_migration.sql`.
3. **Triển khai Edge Functions**:
   ```bash
   supabase functions deploy admin-users
   supabase functions deploy cloudinary-sign
   ```
4. **Cấu hình Secrets cho Edge Functions**:
   ```bash
   supabase secrets set CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
   ```
   *(Lưu ý: Chủ dự án cần rotate/revoke `CLOUDINARY_API_SECRET` cũ đã từng xuất hiện trong lịch sử Git của v1.x).*
5. **Tạo tài khoản Admin đầu tiên**:
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
   BOOTSTRAP_ADMIN_EMAIL=admin@yourdomain.com \
   BOOTSTRAP_ADMIN_PASSWORD=StrongPassword123! \
   node scripts/bootstrap-admin.mjs
   ```

## 2. Cấu hình Frontend (Vercel)

Chỉ cấu hình các biến public sau trên Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Tuyệt đối không đưa `SUPABASE_SERVICE_ROLE_KEY` hoặc `CLOUDINARY_API_SECRET` vào biến môi trường `VITE_*`.
