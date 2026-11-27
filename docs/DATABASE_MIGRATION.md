# Hướng dẫn Di trú Dữ liệu Legacy (V1.3.5 -> V2.0)

## 1. Fresh Installation vs Legacy Upgrade

- **Fresh Installation**: Chạy lần lượt các migration trong `supabase/migrations/`:
  1. `20261127000001_v2_centralized_schema.sql`
  2. `20261127000002_v2_legacy_migration.sql`
  3. `20261127000003_v2_review02_remediation.sql`
  4. `20261127000004_v2_legacy_migration_v2.sql`
  *(An toàn trên DB mới hoàn toàn vì `analyze_legacy_rooms()` và `migrate_legacy_room()` kiểm tra `to_regclass('public.app_rooms')`).*
- **Legacy Upgrade**: Áp dụng 4 migration trên lên DB đang có `public.app_rooms`. Không xóa `app_rooms`.

## 2. Quy trình Di trú An toàn

1. Phân tích dữ liệu cũ (chỉ đọc):
   ```sql
   select * from public.analyze_legacy_rooms();
   ```
2. Chạy thử (Dry-run):
   ```sql
   select public.migrate_legacy_room('<room_id>'::uuid, null, true);
   ```
3. Chạy di trú chính thức (truyền `p_owner_user_id` nếu xác định được chủ sở hữu lịch sử, hoặc `null` để chỉ di trú nội dung chung):
   ```sql
   select public.migrate_legacy_room('<room_id>'::uuid, '<owner_uuid>'::uuid, false);
   ```
   *(Bảo toàn: `collections`, `tests`, `questions`, `options`, `vocabCollections`, `vocabDecks`, `flashcards`, `questionStats`, `vocabStats`, `history` kèm `testNames` và `answers`, `activityLog`, `mooskCount`, `settings` -> `user_preferences`).*
4. Cutover (thu hồi quyền `PUBLIC`, `anon`, `authenticated` trên các RPC cũ):
   ```sql
   select public.cutover_disable_legacy_rooms();
   ```

## 3. Rollback

- Toàn bộ dữ liệu gốc vẫn nằm nguyên trong `public.app_rooms`.
- Bảng `public.legacy_id_mapping` lưu ánh xạ `legacy_id -> new_id` theo từng `room_id`.
