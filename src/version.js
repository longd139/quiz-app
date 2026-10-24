export const APP_VERSION = 'v1.3.5';

export const CHANGELOG_DATA = [
  {
    version: 'v1.3.5',
    date: '25/10/2026',
    isLatest: true,
    title: 'Hệ thống Audit Trail & Hợp nhất Quản lý Dữ liệu vào Cài đặt',
    tag: 'Bản cập nhật hiện tại',
    changes: [
      {
        type: 'feature',
        title: 'Hợp nhất Dữ liệu & Đồng bộ vào Cài đặt hệ thống',
        description: 'Đưa toàn bộ tính năng đồng bộ Supabase Cloud, mã phòng, xuất/nhập file JSON và bản sao lưu hàng ngày vào modal Cài đặt, cho phép truy cập nhanh từ mọi trang.'
      },
      {
        type: 'feature',
        title: 'Nhật ký kiểm toán chi tiết (Audit Trail) bảo vệ mật khẩu',
        description: 'Khu vực Audit được bảo vệ bằng mật khẩu (VITE_AUDIT_PASSWORD), lưu vết chi tiết từng từ vựng được tạo ra/chỉnh sửa (từ, nghĩa, phát âm, từ loại, ví dụ, bộ từ) và mọi request gửi lên Supabase Cloud.'
      },
      {
        type: 'improvement',
        title: 'Bộ lọc & Tìm kiếm lịch sử thao tác thông minh',
        description: 'Hỗ trợ lọc theo danh mục (Từ vựng, Cloud Request, Bài test, Sao lưu) và tìm kiếm từ vựng hoặc hành động ngay trong Audit Trail.'
      },
      {
        type: 'feature',
        title: 'Xuất báo cáo Audit Trail (.json)',
        description: 'Cho phép xuất toàn bộ lịch sử thao tác và request thành file JSON để kiểm tra đối chiếu khi cần.'
      },
      {
        type: 'improvement',
        title: 'Tinh giản thanh điều hướng',
        description: 'Lược bỏ tab Dữ liệu khỏi thanh menu Học câu hỏi để giao diện tập trung và nhất quán giữa các chế độ học.'
      }
    ]
  },
  {
    version: 'v1.3.4',
    date: '24/10/2026',
    title: 'Luyện gõ chữ đa chiều & Giao diện thẻ Flashcard mới',
    changes: [
      {
        type: 'feature',
        title: 'Luyện gõ chữ đa chiều (Anh ⇄ Việt, Xáo trộn)',
        description: 'Tùy chọn chiều câu hỏi linh hoạt: Hiện từ tiếng Anh gõ nghĩa tiếng Việt, hiện nghĩa tiếng Việt gõ từ tiếng Anh, hoặc xáo trộn cả hai chiều ngẫu nhiên.'
      },
      {
        type: 'improvement',
        title: 'Bộ kiểm tra đáp án thông minh',
        description: 'Chấp nhận tiếng Việt không dấu, linh hoạt đảo từ hợp lý, tự động bỏ qua mạo từ to/a/an/the và hỗ trợ nhiều từ đồng nghĩa ngăn cách bởi dấu phẩy.'
      },
      {
        type: 'feature',
        title: 'Giao diện thẻ Flashcard mới chuẩn tối giản',
        description: 'Trình bày định nghĩa rõ ràng, câu ví dụ dạng danh sách gạch đầu dòng có phát âm và hiển thị ghi chú cá nhân của người dùng.'
      },
      {
        type: 'improvement',
        title: 'Đồng bộ biểu tượng lật thẻ & Tinh giản giao diện',
        description: 'Bổ sung biểu tượng lật thẻ 2 chiều ở góc dưới và lược bỏ nút gõ chữ trùng lặp tại trang danh sách bộ từ.'
      }
    ]
  },
  {
    version: 'v1.3.3',
    date: '23/10/2026',
    title: 'Kiểm tra từ trùng & Soạn thảo câu ví dụ trực quan',
    changes: [
      {
        type: 'feature',
        title: 'Phát hiện từ vựng trùng lặp khi gõ',
        description: 'Tự động tra cứu ngay khi nhập "Từ mới" để thông báo nếu từ đã có trong bộ thẻ này hoặc bộ thẻ khác, tránh tạo trùng lặp.'
      },
      {
        type: 'feature',
        title: 'Thanh thông báo Accordion trượt êm ái',
        description: 'Bảng từ trùng trượt ra nhẹ nhàng kèm số lượng và mũi tên xoay để mở rộng hoặc thu gọn danh sách mượt mà.'
      },
      {
        type: 'feature',
        title: 'Popup xem trước chi tiết thẻ',
        description: 'Nút "Xem chi tiết" mở nhanh cửa sổ tra cứu phát âm, từ loại, định nghĩa, ví dụ và hình ảnh minh họa của thẻ đã có.'
      },
      {
        type: 'feature',
        title: 'Soạn thảo câu ví dụ WYSIWYG trực quan',
        description: 'Bôi đen chữ và nhấp chuột phải để in đậm, in nghiêng, gạch chân, đổi màu chữ và highlight màu sắc trực quan ngay trong ô nhập.'
      },
      {
        type: 'improvement',
        title: 'Thanh công cụ định dạng nổi tối giản',
        description: 'Bảng chọn định dạng nổi dạng pill tinh tế (Linear style), chuyển động mượt và thao tác thuận tiện trên mọi thiết bị.'
      }
    ]
  },
  {
    version: 'v1.3.2',
    date: '20/10/2026',
    title: 'Đồng bộ đám mây thời gian thực & Sao lưu tự động',
    changes: [
      {
        type: 'feature',
        title: 'Đồng bộ cơ sở dữ liệu thời gian thực',
        description: 'Dữ liệu từ vựng và tiến độ luyện tập được cập nhật tức thì giữa các thiết bị.'
      },
      {
        type: 'feature',
        title: 'Sao lưu tự động định kỳ',
        description: 'Tự động sao lưu dữ liệu flashcard hàng ngày với cơ chế lưu trữ 2 ngày an toàn.'
      },
      {
        type: 'fix',
        title: 'Sửa lỗi giao diện & Tối ưu hiệu năng',
        description: 'Tối ưu tốc độ tải thẻ flashcard và sửa các lỗi nhỏ trong hiển thị.'
      }
    ]
  },
  {
    version: 'v1.3.1',
    date: '18/10/2026',
    title: 'Tìm kiếm, sắp xếp A-Z & Cải tiến mini game nối từ',
    changes: [
      {
        type: 'feature',
        title: 'Tìm kiếm & Sắp xếp A-Z',
        description: 'Thanh tìm kiếm nhanh và nút sắp xếp theo thứ tự bảng chữ cái trong trang quản lý bộ từ.'
      },
      {
        type: 'improvement',
        title: 'Cải tiến mini game nối từ',
        description: 'Chuyển sang thao tác chạm/click chọn 2 thẻ trực quan, loại bỏ thao tác kéo thả phức tạp.'
      },
      {
        type: 'improvement',
        title: 'Giao diện tinh giản',
        description: 'Bỏ nút áp dụng thứ tự thủ công để màn hình quản lý gọn gàng và phản hồi nhanh hơn.'
      }
    ]
  },
  {
    version: 'v1.3.0',
    date: '15/10/2026',
    title: 'Hệ thống ngọn lửa Streak 8 cấp độ & Điểm Moosk',
    changes: [
      {
        type: 'feature',
        title: 'Ngọn lửa Streak tiến hóa 8 cấp độ',
        description: 'Biểu tượng chuỗi học tập thay đổi màu sắc và kích thước động theo số ngày duy trì liên tục.'
      },
      {
        type: 'feature',
        title: 'Bảng lộ trình tiến hóa chuỗi ngày',
        description: 'Nhấn vào ngọn lửa để theo dõi các mốc cấp độ tiếp theo cần đạt.'
      },
      {
        type: 'improvement',
        title: 'Hệ thống điểm Moosk & Heatmap',
        description: 'Nâng cấp thuật toán tích lũy điểm năng động và bảng đóng góp học tập Heatmap.'
      }
    ]
  }
];
