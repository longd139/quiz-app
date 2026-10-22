export const APP_VERSION = 'v1.3.3';

export const CHANGELOG_DATA = [
  {
    version: 'v1.3.3',
    date: '23/10/2026',
    isLatest: true,
    title: 'Kiểm tra từ trùng & Soạn thảo câu ví dụ trực quan',
    tag: 'Bản cập nhật hiện tại',
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
