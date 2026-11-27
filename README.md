# Quiz & Học Ngôn Ngữ (v2.0.0)

Ứng dụng luyện thi trắc nghiệm, flashcard từ vựng, streak học tập và quản trị tập trung sử dụng React 19, Vite, Tailwind CSS, TanStack Query, Supabase Auth, PostgreSQL (RLS), Edge Functions và Cloudinary.

## Prerequisites

- **Node.js** `>= 20.0.0` và **npm** `>= 10`
- **Docker Desktop** (đang chạy daemon)
- **Supabase CLI** (đã pin trong `devDependencies`, dùng qua `npx supabase` hoặc npm scripts)

## Khởi tạo & Chạy Local Development (Tách biệt hoàn toàn khỏi Production)

```bash
npm ci
npm run setup:local
npm run dev:local
```

Lệnh `npm run setup:local` sẽ:
1. Kiểm tra Docker daemon.
2. Khởi động stack Supabase local (`project_id = quiz-app-local`).
3. Áp dụng toàn bộ migrations và seed 6 tài khoản test + dữ liệu mẫu.
4. Tự động tạo `.env.development.local`, `.env.test.local`, `supabase/functions/.env.local`.

### Local Service URLs

| Service | URL |
|---|---|
| Frontend (Vite) | `http://127.0.0.1:5173` |
| Supabase API / Auth / REST | `http://127.0.0.1:54321` |
| PostgreSQL Local | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Supabase Studio | `http://127.0.0.1:54323` |
| Mail Testing (Inbucket) | `http://127.0.0.1:54324` |

### Các lệnh thường dùng

```bash
npm run dev:local           # Chạy Frontend local (trỏ 127.0.0.1:54321)
npm run functions:serve:local # Chạy local Edge Functions
npm run db:status           # Xem trạng thái Supabase local
npm run db:stop             # Dừng Supabase local
npm run db:seed:local       # Seed lại tài khoản & dữ liệu mẫu
npm run db:reset:local -- --confirm-local-reset  # Reset DB local (có guard bảo vệ)
```

## Quy trình Kiểm thử

```bash
npm run lint                # ESLint (0 errors, 0 warnings)
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests (Supabase Auth, RLS, Transactions, Isolation)
npm run test:e2e            # Playwright E2E (Desktop + Mobile)
npm run build               # Production build + PWA
```

## Quy tắc Bảo vệ Production

- Tuyệt đối không dùng `VITE_SUPABASE_URL` production trong `.env.development.local` hoặc `.env.test.local`.
- Mọi script (`setup-local.mjs`, `seed-local.mjs`, `reset-local.mjs`) đều đi qua `scripts/lib/environment-guard.mjs` và tự động từ chối nếu phát hiện remote host hoặc `APP_ENV=production`.
- Không `supabase link` tới production khi phát triển tính năng thông thường.

## Tài liệu liên quan

- [AGENTS.md](AGENTS.md)
- [Kiến trúc hệ thống](docs/ARCHITECTURE.md)
- [Di trú dữ liệu Legacy](docs/DATABASE_MIGRATION.md)
- [Hướng dẫn triển khai](docs/DEPLOYMENT.md)
- [Báo cáo nghiệm thu V2.0](docs/V2_ACCEPTANCE_REPORT.md)
