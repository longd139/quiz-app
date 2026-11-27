# Quiz & Học Ngôn Ngữ (v2.0.0)

Ứng dụng luyện thi trắc nghiệm, flashcard từ vựng, streak học tập và quản trị tập trung sử dụng React 19, Vite, Tailwind CSS, Supabase Auth, PostgreSQL (RLS) và Cloudinary.

## Kiến trúc V2.0

- **Xác thực**: Supabase Auth (Email/Mật khẩu), tắt đăng ký công khai, hỗ trợ bắt buộc đổi mật khẩu lần đầu và khóa tài khoản tức thì qua RLS.
- **Database tập trung**: Nội dung học tập (`quiz_collections`, `quiz_sets`, `questions`, `question_options`, `vocab_collections`, `vocab_decks`, `flashcards`) dùng chung; dữ liệu cá nhân (`quiz_attempts`, `vocab_learning_progress`, `daily_learning_activity`, `learning_rewards`, `user_preferences`) tách biệt theo `user_id`.
- **Quản trị (`/admin`)**: Quản lý tài khoản, nội dung dùng chung, nhật ký Audit và sao lưu/khôi phục tập trung.
- **Bảo mật**: Ký upload Cloudinary phía server (`cloudinary-sign` Edge Function), quản lý tài khoản qua `admin-users` Edge Function, lọc HTML bằng DOMPurify.

## Cài đặt & Chạy local

```bash
npm ci
cp .env.example .env.local
# Điền VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY vào .env.local
npm run dev
```

## Kiểm thử & Build

```bash
npm run lint
npm test
npm run build
```

## Tài liệu liên quan

- [Kiến trúc hệ thống](docs/ARCHITECTURE.md)
- [Di trú dữ liệu Legacy](docs/DATABASE_MIGRATION.md)
- [Hướng dẫn triển khai](docs/DEPLOYMENT.md)
- [Báo cáo nghiệm thu V2.0](docs/V2_ACCEPTANCE_REPORT.md)
