# AGENTS.md — Quy tắc bắt buộc cho AI Coding Agents

Mọi AI coding agent làm việc trên repository `quiz-app` **bắt buộc** phải tuân thủ quy trình sau:

1. **Đọc tài liệu trước khi sửa code**: Đọc `README.md` và `AGENTS.md`.
2. **Kiểm tra Git branch**: Không bao giờ code hoặc push trực tiếp lên `main`. Luôn tạo hoặc làm việc trên nhánh `feat/*` hoặc `fix/*`.
3. **Mặc định dùng Docker + Supabase Local**: Chạy `npm run setup:local` để khởi tạo môi trường local (`127.0.0.1:54321`).
4. **Không truy cập Production Database để phát triển**: Tuyệt đối không chạy migration, seed, reset, hoặc test lên Supabase Production.
5. **Mọi thay đổi schema phải có migration**: Đặt file SQL trong `supabase/migrations/` và kiểm thử local trước.
6. **Kiểm thử migration trên local**: Kiểm tra cả cài đặt mới (`db reset --local`) và tính idempotent.
7. **Không sửa dữ liệu Production**: Không tạo tài khoản test hoặc dữ liệu mẫu trên production.
8. **Không dùng Production Secrets**: Không đưa `SUPABASE_SERVICE_ROLE_KEY` hoặc `CLOUDINARY_API_SECRET` vào frontend (`VITE_*`) hoặc Git.
9. **Chạy đầy đủ Quality Gates**:
   - `npm run lint` (0 errors, 0 warnings)
   - `npm run test:unit`
   - `npm run test:integration` (khi local Supabase đang chạy)
   - `npm run test:e2e` (Playwright)
   - `npm run build`
10. **Kiểm tra không có regression** trên các module Quiz, Vocabulary, Streak, History, Admin và PWA.
11. **Commit trên feature/fix branch** và push để review.
12. **Không tự merge** vào `main` và **không tự deploy production**.
13. **Báo cáo blockers trung thực**: Không đánh dấu `PASS` cho hạng mục chưa kiểm thử thực tế.
14. **Không tạo tài liệu rác**: Chỉ duy trì `README.md`, `AGENTS.md`, `.env*.example`, và các file trong `docs/` (`ARCHITECTURE.md`, `DATABASE_MIGRATION.md`, `DEPLOYMENT.md`, `V2_ACCEPTANCE_REPORT.md`).
