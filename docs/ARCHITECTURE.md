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
  - `media-upload`: Upload ảnh an toàn phía server (kiểm tra dung lượng thực tế `<= 5MB` + magic bytes), hỗ trợ Cloudinary & Supabase Storage local.
  - `admin-source`: Quản lý gói SRC (`source_packages`), upload `.zip` vào private bucket `source-packages` (`<= 20MB`), tạo/thu hồi/xoay mã truy cập (PBKDF2-SHA256 + HMAC lookup digest).
  - `redeem-source`: Xác thực mã nhận SRC, rate limit theo user trên DB, gọi `redeem_source_package_atomic`, cấp short-lived signed URL (60s) hoặc link HTTPS, và trả lịch sử nhận SRC cá nhân.
