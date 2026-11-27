# Kiến trúc Hệ thống Quiz App V2.0

## 1. Tổng quan

Quiz App V2.0 chuyển từ mô hình lưu trữ cục bộ + đồng bộ theo mã phòng (`app_rooms` JSONB) sang mô hình **Database Tập trung (PostgreSQL)** kết hợp **Supabase Auth** và **Row Level Security (RLS)**.

## 2. Luồng dữ liệu

```text
Component -> Domain Hook (useQuizData / useAuth) -> Service Layer (src/services/*) -> Supabase Client -> PostgreSQL (RLS)
```

- **Shared Content**: `quiz_collections`, `quiz_sets`, `questions`, `question_options`, `vocab_collections`, `vocab_decks`, `flashcards`. Mọi người dùng `ACTIVE` có quyền đọc; chỉ `ADMIN` có quyền ghi/sửa/xóa.
- **Personal Learning Data**: `quiz_attempts`, `quiz_attempt_answers`, `question_learning_stats`, `vocab_learning_progress`, `daily_learning_activity`, `learning_rewards`, `user_preferences`. Gắn chặt với `user_id = auth.uid()`.
- **Server-side Edge Functions**:
  - `admin-users`: Tạo tài khoản, cập nhật role/status, đặt lại mật khẩu tạm thời bằng `SUPABASE_SERVICE_ROLE_KEY`.
  - `cloudinary-sign`: Ký chữ ký upload ảnh Cloudinary phía server cho người dùng đã xác thực.
