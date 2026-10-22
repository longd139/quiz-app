export const APP_VERSION = 'v1.3.3';

export const CHANGELOG_DATA = [
  {
    version: 'v1.3.3',
    date: '23/10/2026',
    isLatest: true,
    title: 'Định dạng câu ví dụ & Kiểm tra từ trùng thông minh',
    tag: 'Bản cập nhật lớn',
    changes: [
      {
        type: 'feature',
        title: 'Kiểm tra từ vựng trùng lặp',
        description: 'Tự động kiểm tra theo thời gian thực khi gõ "Từ mới" để cảnh báo từ vựng đã tồn tại trong bộ từ hiện tại hoặc các bộ từ khác.'
      },
      {
        type: 'feature',
        title: 'Accordion danh sách từ trùng mượt mà',
        description: 'Thanh thông báo trượt xuống tự động kèm số lượng từ trùng và mũi tên thu gọn/mở rộng với hiệu ứng chuyển tiếp êm ái.'
      },
      {
        type: 'feature',
        title: 'Popup xem chi tiết từ vựng',
        description: 'Nút "Xem chi tiết" cho phép xem đầy đủ định nghĩa, loại từ, phát âm, ví dụ và hình ảnh của từ vựng đã có trước khi tạo mới.'
      },
      {
        type: 'feature',
        title: 'Định dạng câu ví dụ WYSIWYG trực quan',
        description: 'Soạn thảo ví dụ trực quan ngay trong khung: bôi đen chuột phải để in đậm, in nghiêng, gạch chân, đổi màu chữ và highlight màu sắc mà không hiện mã HTML thô.'
      },
      {
        type: 'improvement',
        title: 'Menu định dạng Linear/Notion',
        description: 'Bảng công cụ định dạng thiết kế thanh lịch dạng floating pill, tinh tế và dễ thao tác trên cả máy tính lẫn di động.'
      }
    ]
  },
  {
    version: 'v1.3.2',
    date: '20/10/2026',
    title: 'Đồng bộ dữ liệu thời gian thực & Sao lưu tự động',
    changes: [
      {
        type: 'feature',
        title: 'Đồng bộ cơ sở dữ liệu thời gian thực',
        description: 'Dữ liệu từ vựng và tiến độ học tập được đồng bộ hóa tức thì giữa các phiên làm việc.'
      },
      {
        type: 'feature',
        title: 'Sao lưu tự động định kỳ',
        description: 'Tự động tạo bản sao lưu dữ liệu flashcard hàng ngày với cơ chế lưu trữ 2 ngày an toàn.'
      },
      {
        type: 'fix',
        title: 'Sửa lỗi & Tối ưu hiệu năng',
        description: 'Khắc phục các lỗi nhỏ về giao diện hiển thị flashcard và tăng tốc độ xử lý câu hỏi.'
      }
    ]
  },
  {
    version: 'v1.3.1',
    date: '18/10/2026',
    title: 'Tìm kiếm, sắp xếp A-Z & Tối ưu mini game nối từ',
    changes: [
      {
        type: 'feature',
        title: 'Tìm kiếm & Sắp xếp theo A-Z',
        description: 'Thêm thanh tìm kiếm nhanh và nút sắp xếp thứ tự bảng chữ cái A-Z trong trang chỉnh sửa bộ từ.'
      },
      {
        type: 'improvement',
        title: 'Nâng cấp mini game nối từ',
        description: 'Chuyển sang cơ chế bấm chọn 2 thẻ trực quan, loại bỏ thao tác kéo thả phức tạp trên thiết bị cảm ứng.'
      },
      {
        type: 'improvement',
        title: 'Tối giản giao diện quản lý',
        description: 'Bỏ nút áp dụng thứ tự thủ công để giao diện bộ từ gọn gàng, tinh gọn và nhanh hơn.'
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
        title: 'Hệ thống tiến hóa ngọn lửa Streak',
        description: 'Ngọn lửa học tập tiến hóa qua 8 cấp độ màu sắc và kích thước động theo chuỗi ngày streak.'
      },
      {
        type: 'feature',
        title: 'Popup chi tiết lộ trình Streak',
        description: 'Nhấn vào biểu tượng ngọn lửa để xem thông tin chi tiết từng cấp bậc và số ngày cần đạt.'
      },
      {
        type: 'improvement',
        title: 'Cải tiến hệ thống điểm Moosk & Heatmap',
        description: 'Tối ưu hóa bảng đóng góp học tập Heatmap và thuật toán tích lũy điểm năng động Moosk.'
      }
    ]
  }
];
