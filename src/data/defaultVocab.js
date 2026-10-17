// Default vocabulary collections and decks for Language Learning mode

export function getDefaultVocabCollections() {
  const now = new Date().toISOString();
  return [
    {
      id: 'vocab-col-it',
      name: 'Chuyên ngành CNTT & Testing',
      createdAt: now
    },
    {
      id: 'vocab-col-communication',
      name: 'Tiếng Anh Giao Tiếp & Công Sở',
      createdAt: now
    }
  ];
}

export function getDefaultVocabDecks() {
  const now = new Date().toISOString();
  return [
    {
      id: 'deck-swt-it-terms',
      name: 'Thuật ngữ CNTT & Testing (SWT / ISTQB)',
      collectionId: 'vocab-col-it',
      description: 'Các từ vựng cốt lõi về kiểm thử phần mềm và công nghệ thông tin',
      targetLanguage: 'en-US',
      createdAt: now,
      updatedAt: now,
      cards: [
        {
          id: 'card-swt-1',
          term: 'Regression Testing',
          phonetic: '/rɪˈɡreʃ.ən ˈtes.tɪŋ/',
          partOfSpeech: 'noun',
          meaning: 'Kiểm thử hồi quy',
          example: 'Regression testing ensures that new changes do not break existing features.',
          exampleMeaning: 'Kiểm thử hồi quy đảm bảo những thay đổi mới không làm hỏng tính năng có sẵn.'
        },
        {
          id: 'card-swt-2',
          term: 'Verification',
          phonetic: '/ˌver.ɪ.fɪˈkeɪ.ʃən/',
          partOfSpeech: 'noun',
          meaning: 'Xác minh quy trình (Are we building the product right?)',
          example: 'Verification checks if the product is built according to design specifications.',
          exampleMeaning: 'Xác minh kiểm tra xem sản phẩm có được xây dựng đúng theo đặc tả thiết kế không.'
        },
        {
          id: 'card-swt-3',
          term: 'Validation',
          phonetic: '/ˌvæl.ɪˈdeɪ.ʃən/',
          partOfSpeech: 'noun',
          meaning: 'Xác nhận nhu cầu (Are we building the right product?)',
          example: 'Validation ensures that the software meets real user needs and requirements.',
          exampleMeaning: 'Xác nhận đảm bảo phần mềm đáp ứng đúng nhu cầu và mong đợi thực tế của người dùng.'
        },
        {
          id: 'card-swt-4',
          term: 'Boundary Value Analysis',
          phonetic: '/ˈbaʊn.dər.i ˈvæl.juː əˈnæl.ə.sɪs/',
          partOfSpeech: 'noun',
          meaning: 'Phân tích giá trị biên',
          example: 'Boundary value analysis tests values at the minimum, maximum, and boundary edges.',
          exampleMeaning: 'Phân tích giá trị biên kiểm thử các giá trị tại ngưỡng nhỏ nhất, lớn nhất và sát biên.'
        },
        {
          id: 'card-swt-5',
          term: 'Equivalence Partitioning',
          phonetic: '/ɪˈkwɪv.ə.ləns pɑːˈtɪʃ.ən.ɪŋ/',
          partOfSpeech: 'noun',
          meaning: 'Phân vùng tương đương',
          example: 'Equivalence partitioning divides input data into valid and invalid partitions.',
          exampleMeaning: 'Phân vùng tương đương chia dữ liệu đầu vào thành các nhóm hợp lệ và không hợp lệ.'
        },
        {
          id: 'card-swt-6',
          term: 'Defect Density',
          phonetic: '/ˈdiː.fekt ˈden.sə.ti/',
          partOfSpeech: 'noun',
          meaning: 'Mật độ lỗi (Số lỗi trên quy mô dòng code hoặc function point)',
          example: 'High defect density in a module indicates that further code review is required.',
          exampleMeaning: 'Mật độ lỗi cao trong một module cho thấy cần phải xem xét lại mã nguồn kỹ hơn.'
        },
        {
          id: 'card-swt-7',
          term: 'Traceability Matrix',
          phonetic: '/ˌtreɪ.səˈbɪl.ə.ti ˈmeɪ.trɪks/',
          partOfSpeech: 'noun',
          meaning: 'Ma trận truy vết yêu cầu (RTM)',
          example: 'The traceability matrix maps test cases directly to business requirements.',
          exampleMeaning: 'Ma trận truy vết ánh xạ các ca kiểm thử trực tiếp tới các yêu cầu nghiệp vụ.'
        },
        {
          id: 'card-swt-8',
          term: 'Exploratory Testing',
          phonetic: '/ekˈsplɒr.ə.tər.i ˈtes.tɪŋ/',
          partOfSpeech: 'noun',
          meaning: 'Kiểm thử khám phá / tự do',
          example: 'Testers use exploratory testing to discover unexpected bugs without predefined scripts.',
          exampleMeaning: 'Kiểm thử viên sử dụng kiểm thử khám phá để phát hiện lỗi bất ngờ mà không theo kịch bản sẵn.'
        },
        {
          id: 'card-swt-9',
          term: 'Scalability',
          phonetic: '/ˌskeɪ.ləˈbɪl.ə.ti/',
          partOfSpeech: 'noun',
          meaning: 'Khả năng mở rộng hệ thống',
          example: 'The database architecture has excellent horizontal scalability.',
          exampleMeaning: 'Kiến trúc cơ sở dữ liệu có khả năng mở rộng theo chiều ngang xuất sắc.'
        },
        {
          id: 'card-swt-10',
          term: 'Refactoring',
          phonetic: '/riːˈfæk.tər.ɪŋ/',
          partOfSpeech: 'noun',
          meaning: 'Tái cấu trúc mã nguồn (tối ưu cấu trúc mà không đổi hành vi bên ngoài)',
          example: 'Code refactoring makes the software easier to maintain and test.',
          exampleMeaning: 'Tái cấu trúc mã nguồn giúp phần mềm dễ bảo trì và kiểm thử hơn.'
        }
      ]
    },
    {
      id: 'deck-daily-communication',
      name: 'Từ vựng Tiếng Anh Giao Tiếp & Công Việc',
      collectionId: 'vocab-col-communication',
      description: 'Bộ từ vựng đắt giá giúp nâng tầm khả năng biểu đạt tiếng Anh',
      targetLanguage: 'en-US',
      createdAt: now,
      updatedAt: now,
      cards: [
        {
          id: 'card-comm-1',
          term: 'Persevere',
          phonetic: '/ˌpɜː.sɪˈvɪər/',
          partOfSpeech: 'verb',
          meaning: 'Kiên trì, bền chí theo đuổi mục tiêu',
          example: 'If you persevere through challenges, you will achieve great results.',
          exampleMeaning: 'Nếu bạn kiên trì vượt qua khó khăn, bạn sẽ đạt được kết quả tuyệt vời.'
        },
        {
          id: 'card-comm-2',
          term: 'Eloquent',
          phonetic: '/ˈel.ə.kwənt/',
          partOfSpeech: 'adjective',
          meaning: 'Lưu loát, có tài hùng biện, diễn đạt thuyết phục',
          example: 'She gave an eloquent presentation that inspired the entire team.',
          exampleMeaning: 'Cô ấy đã có một bài thuyết trình lưu loát truyền cảm hứng cho cả nhóm.'
        },
        {
          id: 'card-comm-3',
          term: 'Collaborate',
          phonetic: '/kəˈlæb.ə.reɪt/',
          partOfSpeech: 'verb',
          meaning: 'Cộng tác, hợp tác làm việc',
          example: 'Engineers collaborate with designers to create intuitive experiences.',
          exampleMeaning: 'Các kỹ sư hợp tác cùng nhà thiết kế để tạo ra trải nghiệm trực quan.'
        },
        {
          id: 'card-comm-4',
          term: 'Innovative',
          phonetic: '/ˈɪn.ə.və.tɪv/',
          partOfSpeech: 'adjective',
          meaning: 'Đổi mới, có tính sáng tạo đột phá',
          example: 'They proposed an innovative solution to solve latency issues.',
          exampleMeaning: 'Họ đã đề xuất một giải pháp đột phá để giải quyết vấn đề độ trễ.'
        },
        {
          id: 'card-comm-5',
          term: 'Resilient',
          phonetic: '/rɪˈzɪl.jənt/',
          partOfSpeech: 'adjective',
          meaning: 'Kiên cường, mau phục hồi sau sự cố',
          example: 'Building resilient cloud architecture minimizes downtime during traffic spikes.',
          exampleMeaning: 'Xây dựng kiến trúc đám mây kiên cường giúp giảm thiểu thời gian chết khi lưu lượng tăng đột biến.'
        },
        {
          id: 'card-comm-6',
          term: 'Pragmatic',
          phonetic: '/præɡˈmæt.ɪk/',
          partOfSpeech: 'adjective',
          meaning: 'Thực tế, thực dụng, trọng tính khả thi',
          example: 'We took a pragmatic approach and delivered the core features on schedule.',
          exampleMeaning: 'Chúng tôi tiếp cận theo hướng thực tế và bàn giao các tính năng cốt lõi đúng tiến độ.'
        },
        {
          id: 'card-comm-7',
          term: 'Comprehensive',
          phonetic: '/ˌkɒm.prɪˈhen.sɪv/',
          partOfSpeech: 'adjective',
          meaning: 'Toàn diện, bao quát mọi khía cạnh',
          example: 'The team wrote a comprehensive test suite covering all edge cases.',
          exampleMeaning: 'Đội ngũ đã viết một bộ kiểm thử toàn diện bao quát tất cả các trường hợp biên.'
        },
        {
          id: 'card-comm-8',
          term: 'Ambiguity',
          phonetic: '/ˌæm.bɪˈɡjuː.ə.ti/',
          partOfSpeech: 'noun',
          meaning: 'Sự mơ hồ, không rõ ràng',
          example: 'Clear requirement specifications eliminate ambiguity during development.',
          exampleMeaning: 'Đặc tả yêu cầu rõ ràng giúp loại bỏ sự mơ hồ trong quá trình phát triển.'
        }
      ]
    }
  ];
}
