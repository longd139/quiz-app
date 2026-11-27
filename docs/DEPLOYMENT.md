# Hướng dẫn Triển khai Quiz App V2.0

## 1. Phân tách Môi trường

- **Local Development**: Dùng Docker + Supabase CLI (`http://127.0.0.1:54321`, `VITE_UPLOAD_ADAPTER=local-supabase`).
- **Vercel Preview**: Cấu hình tách biệt **Preview** và **Production** Environment Variables trên Vercel Dashboard. Không gắn `VITE_SUPABASE_URL` của Production vào nhánh Preview nếu chưa có Staging project riêng (Preview sẽ fail closed với thông báo chưa cấu hình).
- **Production**: Chỉ triển khai sau khi có phê duyệt thủ công.

## 2. Cấu hình Supabase Production (Thủ công)

1. **Tắt Public Signup**: **Supabase Dashboard → Authentication → Providers → Email** → tắt **Allow new users to sign up**.
2. **Rotate Cloudinary Secret**: Revoke/rotate `CLOUDINARY_API_SECRET` cũ từng xuất hiện trong Git history v1.x.
3. **Áp dụng Migrations** theo thứ tự trong `supabase/migrations/`.
4. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy admin-users
   supabase functions deploy password-change
   supabase functions deploy media-upload
   ```
5. **Cấu hình Edge Function Secrets**:
   ```bash
   supabase secrets set CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
   ```
6. **Bootstrap Admin đầu tiên**:
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
   BOOTSTRAP_ADMIN_EMAIL=admin@yourdomain.com \
   BOOTSTRAP_ADMIN_PASSWORD=StrongPassword123! \
   node scripts/bootstrap-admin.mjs
   ```

## 3. Cấu hình Vercel Production

Chỉ cấu hình các biến public:
- `VITE_APP_ENV=production`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_UPLOAD_ADAPTER=cloudinary`
