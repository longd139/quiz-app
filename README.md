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
1. Kiểm tra `.env*` hiện có (chặn ngay nếu phát hiện remote/production).
2. Khởi động stack Supabase local nhẹ (`project_id = quiz-app-local`, loại bỏ `logflare, vector, realtime, imgproxy, supavisor`).
3. Áp dụng migrations pending (không reset hay ghi đè dữ liệu hiện có) và seed tài khoản mẫu theo chế độ bảo toàn (`--preserve-existing`).
4. Tự động tạo `.env.development.local`, `.env.test.local`, `supabase/functions/.env.local` nếu chưa tồn tại.

### Local Service URLs

| Service | URL |
|---|---|
| Frontend Dev (Vite) | `http://127.0.0.1:5173` |
| Frontend E2E (Test mode) | `http://127.0.0.1:5174` |
| Supabase Local Dev API | `http://127.0.0.1:54321` |
| PostgreSQL Local Dev | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Supabase Studio | `http://127.0.0.1:54323` |
| Mail Testing (Local SMTP) | `http://127.0.0.1:54324` |
| Supabase Isolated Test API (`quiz-app-test`) | `http://127.0.0.1:54331` (tự bật/tắt khi chạy test) |

### Các lệnh thường dùng

```bash
npm run dev:local           # Chạy Frontend local (trỏ 127.0.0.1:54321, có env guard)
npm run db:start            # Khởi động stack Supabase nhẹ (khuyến nghị hàng ngày)
npm run db:start:full       # Khởi động đầy đủ container Supabase (khi cần analytics/realtime)
npm run db:stats            # Theo dõi CPU / RAM Docker containers
npm run functions:serve:local # Chạy local Edge Functions
npm run db:status           # Xem trạng thái Supabase local
npm run db:stop             # Dừng Supabase local
npm run db:seed:local       # Seed tài khoản thiếu (không ghi đè mật khẩu hiện có)
npm run db:reset:local -- --confirm-local-reset  # Reset DB local (có guard bảo vệ)
```

## Quy trình Kiểm thử

```bash
npm run lint                # ESLint (0 errors, 0 warnings)
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests trên stack quiz-app-test (54331) độc lập
npm run test:e2e            # Playwright E2E trên stack quiz-app-test (54331) + cổng 5174
npm run verify:quick        # Nhanh: lint + test:unit + build
npm run verify:local        # Đầy đủ: lint + test:unit + test:integration + build
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
