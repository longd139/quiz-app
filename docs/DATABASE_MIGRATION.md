# Hướng dẫn Di trú Dữ liệu Legacy (V1 -> V2.0)

## 1. Nguyên tắc an toàn

- Không xóa bảng `app_rooms` trước khi di trú và đối chiếu hoàn tất.
- Thực hiện dry-run trước khi chạy di trú chính thức.
- Không tự ý gán lịch sử học tập legacy cho người dùng khi chưa xác định rõ chủ sở hữu (`p_owner_user_id`).

## 2. Các bước thực hiện

1. Áp dụng migration schema mới:
   - `supabase/migrations/20261127000001_v2_centralized_schema.sql`
   - `supabase/migrations/20261127000002_v2_legacy_migration.sql`
2. Phân tích dữ liệu cũ (chỉ đọc, không ghi):
   ```sql
   select * from public.analyze_legacy_rooms();
   ```
3. Chạy thử (Dry-run) cho từng `room_id`:
   ```sql
   select public.migrate_legacy_room('<room_id>'::uuid, null, true);
   ```
4. Chạy di trú chính thức (truyền `p_owner_user_id` nếu muốn giữ lịch sử cho 1 tài khoản cụ thể, hoặc `null` để chỉ di trú nội dung học tập chung):
   ```sql
   select public.migrate_legacy_room('<room_id>'::uuid, '<owner_uuid>'::uuid, false);
   ```
5. Cutover (vô hiệu hóa RPC cũ để client cũ không ghi vào `app_rooms`):
   ```sql
   select public.cutover_disable_legacy_rooms();
   ```

## 3. Rollback

- Toàn bộ dữ liệu cũ vẫn nằm nguyên trong `public.app_rooms`.
- Có thể đối chiếu mapping qua `public.legacy_id_mapping`.
