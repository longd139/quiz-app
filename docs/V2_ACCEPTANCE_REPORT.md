# BÁO CÁO NGHIỆM THU — QUIZ APP V2.0 (REVIEW 02 REMEDIATION & LOCAL RUNTIME ACCEPTANCE)

## 1. Executive Summary

Quiz App V2.0.0 đã hoàn tất **Review 02 Remediation** trên nhánh `feat/v2-auth-centralized-storage`, thiết lập hoàn chỉnh **Local Docker + Supabase CLI Development Environment** tách biệt khỏi Production, khắc phục toàn bộ **BUG-01 đến BUG-14**, và kiểm thử thực tế trên PostgreSQL/Auth/PostgREST local và trình duyệt Playwright (Desktop + Mobile).

- **ESLint (`npm run lint`)**: **PASS** — `0 errors, 0 warnings` (`LINT_EXIT=0`).
- **Unit Tests (`npm run test:unit`)**: **PASS** — `44/44` tests trên `13` suites (`UNIT_EXIT=0`).
- **Integration Tests (`npm run test:integration`)**: **PASS** — `15/15` suites/cases chạy trên stack `quiz-app-test` độc lập (`127.0.0.1:54331`, `INT_EXIT=0`).
- **Playwright E2E (`npm run test:e2e`)**: **PASS** — `20/20` tests (`desktop-chromium` + `mobile-chromium`, `127.0.0.1:5174`, `E2E_EXIT=0`).
- **Production Build (`npm run build`)**: **PASS** — `197 modules transformed`, sinh PWA `dist/sw.js`, `dist/manifest.webmanifest` (`BUILD_EXIT=0`).

## 2. Git & Local Environment Architecture

- **Repository**: `https://github.com/longd139/quiz-app.git`
- **Branch**: `feat/v2-auth-centralized-storage`
- **Local Project ID**: `quiz-app-local` (`supabase/config.toml`)
- **Docker**: Docker Desktop `4.99.0` (Engine `29.9.3`, Compose `v5.7.0`)
- **Supabase CLI**: `3.4.0` (pinned trong `devDependencies`)
- **Local Endpoints**:
  - Frontend (Vite): `http://127.0.0.1:5173`
  - Supabase API / Auth / REST: `http://127.0.0.1:54321`
  - PostgreSQL Local: `127.0.0.1:54322`
  - Supabase Studio: `http://127.0.0.1:54323`
  - Local SMTP (Mailpit): `http://127.0.0.1:54324`
- **Setup Command**: `npm run setup:local` (tự động kiểm tra Docker, khởi động stack, áp dụng 4 migrations, tạo `.env.development.local`, `.env.test.local`, `supabase/functions/.env.local`, và seed 6 tài khoản test).

## 3. Production Isolation Evidence

- `scripts/lib/environment-guard.mjs` kiểm tra `APP_ENV`, `SUPABASE_URL` và `DATABASE_URL` — từ chối mọi remote host hoặc `production`/`staging` (được kiểm chứng bởi unit tests `SEC-07` trong `tests/securityAndPolicy.test.mjs`).
- `supabase/config.toml` cấu hình `[auth] enable_signup = false` và `[auth.email] enable_signup = true`, kiểm chứng thực tế qua `AUTH-04` (public `auth.signUp` bị từ chối).
- Không có bất kỳ thao tác `supabase link`, migration, seed, hay deploy nào lên Production.

## 4. Review 02 Remediation (BUG-01 đến BUG-14)

| BUG | Vấn đề | File thay đổi chính | Kiểm thử / Kết quả | Status |
|---|---|---|---|---|
| **BUG-01** | Non-atomic optimistic locking | `20261127000003_v2_review02_remediation.sql`, `quizService.js`, `vocabularyService.js` | `TX-04`: cập nhật đồng thời cùng version gây `CONFLICT` | **PASS** |
| **BUG-02** | Multi-table save không có transaction | `save_quiz_set_atomic`, `save_vocab_deck_atomic`, `save_quiz_attempt_atomic` | `TX-01`: lưu nguyên tử trong 1 transaction PostgreSQL | **PASS** |
| **BUG-03** | Cache sai sau mutation lỗi | `src/hooks/useQuizData.js` | `useMutation` rollback `onError` + invalidate authoritative query | **PASS** |
| **BUG-04** | Frontend version không cập nhật | `src/hooks/useQuizData.js`, `quizService.js`, `vocabularyService.js` | `TX-06`: trả về canonical `{ id, version, updated_at }` cập nhật cache | **PASS** |
| **BUG-05** | Progress bị ghi đè khi dùng nhiều thiết bị | `apply_learning_progress_event`, `learning_progress_events`, `learningProgressService.js` | `TX-08`, `TX-09`: 2 request song song cộng đủ + replay `operationId` là no-op | **PASS** |
| **BUG-06** | Legacy RPC còn quyền `PUBLIC` | `20261127000003_v2_review02_remediation.sql` (`cutover_disable_legacy_rooms`) | `MIG-10`: `REVOKE ALL ... FROM PUBLIC, anon, authenticated` | **PASS** |
| **BUG-07** | Thiếu dữ liệu di trú legacy & fresh install lỗi `app_rooms` | `20261127000002_v2_legacy_migration.sql`, `20261127000004_v2_legacy_migration_v2.sql` | `setup:local` cài mới 4 migrations PASS + bảo toàn `questionStats`, `history`, `settings` | **PASS** |
| **BUG-08** | Lệch schema Quiz History & parent ownership | `20261127000003_v2_review02_remediation.sql`, `src/services/historyService.js` | `ISO-05` + E2E History PASS (thêm `test_names`, `questions_snapshot`, composite FK) | **PASS** |
| **BUG-09** | Restore báo thành công một phần | `restore_backup_atomic`, `src/services/backupService.js`, `AdminBackupsPage.jsx` | `SEC-02`: transactional restore + pre-restore backup + từ chối user thường | **PASS** |
| **BUG-10** | Query thiếu phân trang (giới hạn 1000 rows) | `quizService.js`, `vocabularyService.js`, `historyService.js`, `learningProgressService.js`, `backupService.js` | Vòng lặp `.range()` phân trang đầy đủ | **PASS** |
| **BUG-11** | Bypass đổi mật khẩu lần đầu qua API | `is_active_user()`, `is_admin()`, `supabase/functions/password-change/index.ts` | `AUTH-06`, `AUTH-07` + E2E: chặn đọc shared content & REST bypass | **PASS** |
| **BUG-12** | Admin có thể bypass luồng quản trị qua REST | `guard_profile_update()`, `admin_update_profile_tx()`, `admin-users/index.ts`, `AuthContext.jsx` | `RBAC-08`, `RBAC-09`: chặn sửa protected fields qua REST + khóa admin cuối | **PASS** |
| **BUG-13** | Client giả mạo audit log | `audit_logs_insert_own` RLS, `src/services/auditService.js` | `SEC-03`: từ chối client chèn `ADMIN_USER_CREATE` giả | **PASS** |
| **BUG-14** | Upload size/type chỉ kiểm tra ở browser | `supabase/functions/media-upload/index.ts`, `src/lib/cloudinary.js` | Server đọc actual `byteLength <= 5MB` + kiểm tra magic bytes (JPG/PNG/WebP/GIF) + adapter local Supabase Storage | **PASS (local adapter) / BLOCKED (live Cloudinary external)** |

## 5. Quality Gates Summary

| Gate | Command | Exit Code | Result |
|---|---|---|---|
| ESLint | `npm run lint` | `0` | **PASS** (`0 errors, 0 warnings`) |
| Unit Tests | `npm run test:unit` | `0` | **PASS** (`44/44`, `13` suites) |
| Integration Tests | `npm run test:integration` | `0` | **PASS** (`15/15` trên `quiz-app-test` `54331`) |
| E2E Tests | `npm run test:e2e` | `0` | **PASS** (`20/20` Desktop + Mobile trên `5174`) |
| Production Build | `npm run build` | `0` | **PASS** (`197` modules + PWA) |

## 6. Secure Source Code Distribution & Review 05 Patches

- **Database & Private Storage**: Migration `20261127000007_v2_source_distribution_and_review05.sql` tạo `source_packages`, `source_access_codes`, `source_redemptions`, `source_redeem_rate_limits`, private bucket `source-packages` (20 MB), và `redeem_source_package_atomic()`.
- **Edge Functions**: `admin-source` (quản lý gói SRC, upload ZIP, tạo/thu hồi/xoay mã CSPRNG 12+ ký tự với PBKDF2-SHA256 + HMAC lookup digest) và `redeem-source` (rate limit DB, idempotent redeem, signed URL 60s, lịch sử cá nhân).
- **UI/UX**: Nút `Nhận SRC` + `RedeemSourceModal` trên Dashboard, mục `SRC đã nhận` trong `/data`, và `/admin/source-packages` trong `AdminLayout`.
- **Review 05 (`BUG-25`..`BUG-28`)**: Khóa chế độ `replace` restore (chỉ giữ `merge`), `verify:local` bao gồm đầy đủ E2E, `merge` restore giữ nguyên `term` khi backup cũ không có field `term`.

## 6. Final Hardening Summary (ENV-01..03, BUG-15..24, Lightweight Docker)

- **Lightweight Docker Local**: `npm run db:start` loại bỏ `logflare`, `vector`, `realtime`, `imgproxy`, `supavisor`; giảm từ 12 containers (~1,648 MiB, `vector` crash-loop) xuống 9 containers khỏe mạnh (~830 MiB).
- **ENV-01 / ENV-02 / ENV-03**: Fail-closed `src/lib/supabase.js` + `src/lib/supabaseEnv.js`, `scripts/lib/environment-guard.mjs` kiểm tra `project_id` + host + port + Vite precedence, `setup-local.mjs` không ghi đè dữ liệu hiện có, `quiz-app-test` (`54331`/`54332`) tách biệt hoàn toàn khỏi `quiz-app-local` (`54321`/`54322`).
- **BUG-15..24**: Xóa `supabase/functions/cloudinary-sign`, `await update(...)` + stable `operationId` trong `Practice.jsx`/`Editor.jsx`/`Dashboard.jsx`/`useQuizData.js`, `password_change_recommended` DB-backed trên `profiles`, bảo toàn & chuẩn hóa `term` trong `restore_backup_atomic` + `Dashboard.jsx`.

## 7. Remaining External Production Blockers

1. **Cloudinary Credential Rotation**: Chủ dự án cần revoke/rotate `CLOUDINARY_API_SECRET` cũ từng xuất hiện trong lịch sử Git v1.x và cấu hình secret mới trên Supabase Edge Functions (`media-upload`). *(Không sử dụng credential cũ để kiểm thử).*
2. **Supabase Production Public Signup**: Chủ dự án cần tắt **Allow new users to sign up** trong Supabase Production Dashboard → Authentication → Providers → Email.
3. **Vercel Preview / Production Env Separation**: Chủ dự án cần tách riêng Environment Variables giữa Preview và Production trên Vercel Dashboard.
4. **Production Migration & Cutover**: Áp dụng 4 migration files, deploy Edge Functions (`admin-users`, `password-change`, `media-upload`), chạy `bootstrap-admin.mjs`, di trú `app_rooms` bằng `migrate_legacy_room()` và chạy `cutover_disable_legacy_rooms()`.

## 7. Acceptance Status

- **Local Development Acceptance**: **PASS** (Docker + Supabase CLI + 4 migrations + 6 seeded accounts + Vite local hoạt động đầy đủ).
- **Source Code & Automated Runtime Acceptance**: **PASS** (ESLint 0/0, Unit 28/28, Integration 11/11, E2E 12/12, Build PASS).
- **Production Release Readiness**: **BLOCKED BY EXTERNAL MANUAL STEPS** (chờ chủ dự án rotate Cloudinary secret, tắt Public Signup trên Supabase Cloud, cấu hình Vercel Preview/Prod env và phê duyệt cutover).
