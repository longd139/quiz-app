# BÁO CÁO NGHIỆM THU — QUIZ APP V2.0

## 1. Executive Summary

Phiên bản **Quiz App V2.0.0** đã hoàn thành việc tái cấu trúc từ mô hình lưu trữ cục bộ + đồng bộ theo mã phòng (`app_rooms` JSONB) sang mô hình **Cơ sở dữ liệu PostgreSQL tập trung**, **Xác thực Supabase Auth (Private)**, **Phân quyền Quản trị viên (`/admin`)**, **Bảo mật Cloudinary phía server**, và **Lọc XSS bằng DOMPurify**.

- Các hạng mục mã nguồn, schema SQL, RLS policies, Edge Functions, CI workflow, unit tests và production build đã hoàn thành và kiểm chứng trực tiếp.
- Các hạng mục yêu cầu kết nối tới Supabase Production/Staging thực tế (áp dụng migration lên DB live, tắt Public Signup trên Supabase Dashboard, kiểm thử integration live trên Supabase) được đánh dấu **BLOCKED / NOT TESTED** do môi trường thực thi không có thông tin đăng nhập Supabase Production.

## 2. Git Branch & Commit

- **Branch**: `feat/v2-auth-centralized-storage` (tách từ `main` tại commit `8ad7c6c`).
- **Commit**: Sẽ được ghi nhận ngay sau khi hoàn tất commit trên nhánh `feat/v2-auth-centralized-storage` (không push trực tiếp vào `main`, không tự merge).

## 3. Danh sách File đã xóa & Lý do

| File | Lý do xóa |
|---|---|
| `FER_quiz.md`, `FER_quiz_part1.md`, `FER_quiz_part2.md`, `FER_quiz_part3.md`, `istqb-50-questions.md` | File markdown câu hỏi cũ không được import bởi runtime (lịch sử vẫn lưu trên nhánh `main`). |
| `extract-quizlet.js` | Script trích xuất thủ công cũ không phục vụ runtime (gây lỗi lint `copy is not defined`). |
| `manifest.json`, `public/manifest.json`, `icon-192.png`, `icon-512.png`, `sw.js` | Trùng lặp với cấu hình chính thức của `vite-plugin-pwa` trong `vite.config.js` (giữ `public/icon-192.png` và `public/icon-512.png`). |
| `src/data/supabaseSync.js` | Logic đồng bộ theo mã phòng (`app_rooms`, `room_secret`, polling 5s) đã bị gỡ bỏ. |
| `supabase/functions/room-token/index.ts` | Edge Function cấp JWT theo mã phòng cũ đã bị gỡ bỏ. |

## 4. Danh sách File tạo mới

- **Database & Scripts**:
  - `supabase/migrations/20261127000001_v2_centralized_schema.sql`
  - `supabase/migrations/20261127000002_v2_legacy_migration.sql`
  - `scripts/bootstrap-admin.mjs`
- **Edge Functions**:
  - `supabase/functions/admin-users/index.ts`
  - `supabase/functions/cloudinary-sign/index.ts`
- **Auth, Security & Domain**:
  - `src/contexts/AuthContext.jsx`
  - `src/components/ProtectedRoute.jsx`
  - `src/lib/passwordPolicy.js`
  - `src/domain/vocabAnswerMatcher.js`
- **Services**:
  - `src/services/authService.js`, `src/services/userService.js`, `src/services/quizService.js`, `src/services/vocabularyService.js`, `src/services/learningProgressService.js`, `src/services/historyService.js`, `src/services/settingsService.js`, `src/services/auditService.js`, `src/services/backupService.js`
- **Pages**:
  - `src/pages/LoginPage.jsx`, `src/pages/ChangePasswordPage.jsx`
  - `src/pages/admin/AdminLayout.jsx`, `src/pages/admin/AdminDashboard.jsx`, `src/pages/admin/AdminUsersPage.jsx`, `src/pages/admin/AdminContentPage.jsx`, `src/pages/admin/AdminAuditLogsPage.jsx`, `src/pages/admin/AdminBackupsPage.jsx`, `src/pages/admin/AdminSettingsPage.jsx`
- **Tests, CI & Docs**:
  - `tests/securityAndPolicy.test.mjs`, `.github/workflows/ci.yml`, `.env.example`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_MIGRATION.md`, `docs/DEPLOYMENT.md`, `docs/V2_ACCEPTANCE_REPORT.md`

## 5. Danh sách File đã chỉnh sửa

- `package.json`, `package-lock.json`, `src/version.js` (nâng lên `2.0.0`)
- `src/App.jsx`, `src/components/Header.jsx`, `src/components/SettingsModal.jsx`, `src/components/TabNav.jsx`, `src/components/CreateFlashcardModal.jsx`
- `src/hooks/useQuizData.js`, `src/lib/supabase.js`, `src/lib/cloudinary.js`, `src/data/storage.js`
- `src/pages/DataManagement.jsx`, `src/pages/VocabQuiz.jsx`, `supabase/schema.sql`, `tests/vocabWritten.test.mjs`

## 6. Kiến trúc Trước và Sau

- **Trước (v1.3.5)**: `Component -> QuizContext -> localStorage -> Room JSONB Push/Pull (app_rooms, polling 5s)`.
- **Sau (v2.0.0)**: `Component -> Domain Hook (useQuizData / useAuth) -> Service Layer (src/services/*) -> Supabase Authenticated Client -> PostgreSQL (RLS)`.

## 7. Database Schema & RLS Policies

- **Bảng hệ thống & Auth**: `profiles` (role `ADMIN`/`USER`, status `ACTIVE`/`DISABLED`, `must_change_password`), `system_settings`, `audit_logs`, `backup_metadata`, `legacy_id_mapping`.
- **Nội dung dùng chung**: `quiz_collections`, `quiz_sets`, `questions`, `question_options`, `vocab_collections`, `vocab_decks`, `flashcards`.
- **Dữ liệu cá nhân (`user_id = auth.uid()`)**: `quiz_attempts`, `quiz_attempt_answers`, `question_learning_stats`, `vocab_learning_progress`, `daily_learning_activity`, `learning_rewards`, `user_preferences`.
- **RLS**:
  - `anon`: bị `REVOKE ALL` trên toàn bộ bảng `public`.
  - `DISABLED` user: bị chặn bởi `public.is_active_user()` trên mọi bảng học tập.
  - `USER` (`ACTIVE`): đọc nội dung dùng chung, chỉ đọc/ghi dữ liệu cá nhân của chính mình, bị trigger `guard_profile_update()` chặn tự sửa `role`/`status`/`email`.
  - `ADMIN` (`ACTIVE`): quản lý nội dung dùng chung, xem `audit_logs`, quản lý `backup_metadata`, quản lý tài khoản qua `admin-users` Edge Function.

## 8. Authentication Flow & Admin Functionality

- Route `/login` chỉ có đăng nhập Email/Mật khẩu (không có UI đăng ký công khai).
- Hỗ trợ `must_change_password` (bắt buộc đổi mật khẩu lần đầu tại `/change-password`, chặn truy cập các route học tập cho đến khi đổi thành công).
- Khu vực `/admin` gồm: Tổng quan thống kê thực tế, Quản lý tài khoản (tạo mới, sửa, khóa/mở khóa, đặt lại mật khẩu tạm thời, chặn tự khóa chính mình hoặc khóa Admin cuối cùng), Quản lý nội dung chung, Nhật ký Audit, Sao lưu/Khôi phục (tạo pre-restore backup trước khi khôi phục), và Cài đặt hệ thống.

## 9. Legacy Room Removal & Security Fixes

- Đã xóa `src/data/supabaseSync.js`, `supabase/functions/room-token/index.ts`, và toàn bộ UI/biến môi trường liên quan đến `room_secret`, `DEFAULT_ROOM_SECRET`, `doCreateRoom`, `doJoinRoom`, `startPolling`.
- **Cloudinary**: Gỡ bỏ toàn bộ `apiSecret` hardcode và SHA-1 signing ở `src/lib/cloudinary.js`; chuyển sang Edge Function `cloudinary-sign` (yêu cầu JWT + kiểm tra `ACTIVE` + kiểm tra role `ADMIN` cho `vocab_flashcards` + validate MIME/size + rate limit).
- **XSS**: Tích hợp `DOMPurify` trong `src/data/storage.js` (`renderMd`) và `src/components/CreateFlashcardModal.jsx`.
- **Cảnh báo bảo mật quan trọng**: Chủ dự án **bắt buộc** phải rotate/revoke `CLOUDINARY_API_SECRET` cũ từng xuất hiện trong lịch sử Git của các commit trước.

## 10. Kết quả Kiểm thử, Lint & Build (Thực tế)

| Hạng mục | Kết quả | Chi tiết quan sát |
|---|---|---|
| `npm run lint` | **PASS (không lỗi mới)** | Baseline: 62 vấn đề (15 errors, 47 warnings). Sau V2.0: 39 vấn đề (8 errors, 31 warnings — đều là lỗi `no-empty`/unused cũ ở các file chưa đụng tới; **0 lỗi** ở toàn bộ file mới/chỉnh sửa V2.0). |
| `npm test` | **PASS** | `18/18` tests pass across `6` suites (`tests/vocabWritten.test.mjs` import trực tiếp từ `src/domain/vocabAnswerMatcher.js`, `tests/securityAndPolicy.test.mjs`). |
| `npm run build` | **PASS** | `vite build` thành công (`192 modules transformed`), sinh `dist/sw.js` và `dist/manifest.webmanifest`. |
| Integration Tests (Live Supabase) | **BLOCKED** | Không có Supabase instance/credentials thực tế trong workspace để chạy test Auth/RLS/Migration end-to-end. |
| Manual E2E trên trình duyệt | **NOT TESTED** | Chưa chạy kiểm thử tương tác trình duyệt với backend Supabase thực tế. |

## 11. Deployment Instructions & Blockers

Xem chi tiết tại [docs/DEPLOYMENT.md](DEPLOYMENT.md) và [docs/DATABASE_MIGRATION.md](DATABASE_MIGRATION.md).

- **Blockers cần Admin thực hiện trước khi go-live**:
  1. Tắt **Allow new users to sign up** trong Supabase Dashboard → Authentication → Providers → Email.
  2. Rotate/revoke `CLOUDINARY_API_SECRET` cũ và cấu hình secrets mới trên Supabase Edge Functions.
  3. Áp dụng 2 file migration SQL, triển khai `admin-users` & `cloudinary-sign`, chạy `scripts/bootstrap-admin.mjs` để tạo tài khoản Admin đầu tiên.
  4. Thực hiện dry-run và di trú dữ liệu từ `app_rooms` bằng `analyze_legacy_rooms()` và `migrate_legacy_room()`, sau đó chạy `cutover_disable_legacy_rooms()`.

## 12. Acceptance Checklist

- [x] **PASS** — Repository cleanup (xóa file rác, file PWA trùng lặp, `supabaseSync.js`, `room-token`).
- [x] **PASS** — Authentication UI & Session management (`/login`, `/change-password`, `AuthContext`, `ProtectedRoute`).
- [ ] **BLOCKED** — Tắt Public Signup trên Supabase Auth Production (yêu cầu quyền Supabase Dashboard).
- [x] **PASS** — Admin Dashboard & User Management UI + `admin-users` Edge Function.
- [x] **PASS** — Centralized Database Schema, RLS Policies, & Idempotent Legacy Migration SQL.
- [x] **PASS** — Security Hardening (gỡ hardcoded Cloudinary secret, server-side signing, DOMPurify XSS, `.env.example`).
- [x] **PASS** — Automated Unit Tests (`18/18` pass) & Production Build (`vite build` pass).
- [ ] **NOT TESTED** — Live Supabase Auth/RLS/Migration Integration & Browser E2E.
