/**
 * SCRIPT V4 - DÀNH RIÊNG CHO MÀN HÌNH "STILL LEARNING" / HỌC PHẦN QUIZLET
 * Hỗ trợ cả 2 cơ chế: Gọi WebAPI nội bộ và Bóc tách trực tiếp giao diện 2 cột
 */

(async () => {
  console.log('%c🚀 Đang quét từ vựng trên Quizlet...', 'color: #3b82f6; font-size: 15px; font-weight: bold;');
  let cards = [];

  // Lọc bỏ các từ rác / placeholder hệ thống
  const isJunk = (str) => {
    if (!str) return true;
    const s = str.trim().toLowerCase();
    const junks = [
      'term', 'definition', 'thuật ngữ', 'định nghĩa',
      'still learning', 'mastered', 'not studied',
      'select these', 'chọn những thuật ngữ này',
      'options', 'tùy chọn', 'your stats', 'thống kê của bạn'
    ];
    return junks.includes(s) || s.startsWith('still learning (') || s.startsWith('mastered (');
  };

  // =========================================================================
  // PHƯƠNG PHÁP 1: GỌI WEBAPI NỘI BỘ (Chính xác 100%, không phụ thuộc giao diện)
  // =========================================================================
  const setIdMatch = window.location.pathname.match(/\/(\d+)\//) || window.location.pathname.match(/\/(\d+)$/);
  const setId = setIdMatch ? setIdMatch[1] : '1223207172';

  if (setId) {
    try {
      console.log(`Đang thử tải dữ liệu qua Quizlet WebAPI (Set ID: ${setId})...`);
      // Thử endpoint studiable-item-documents
      const res = await fetch(`/webapi/3.4/studiable-item-documents?filters[studiableContainerId]=${setId}&filters[studiableContainerType]=1`, {
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        const items = json?.responses?.[0]?.models?.studiableItem || json?.models?.studiableItem || [];
        if (items.length > 0) {
          items.forEach(item => {
            const sides = item.cardSides || [];
            let term = '';
            let meaning = '';
            sides.forEach(side => {
              const text = side.media?.[0]?.plainText || '';
              if (side.label === 'word' || side.sideId === 1) term = text.trim();
              else if (side.label === 'definition' || side.sideId === 2) meaning = text.trim();
            });
            if (term && meaning && !isJunk(term)) {
              cards.push({ term, meaning });
            }
          });
        }
      }
    } catch (e) {
      console.warn('WebAPI 3.4 không khả dụng, thử phương pháp tiếp theo...');
    }

    if (cards.length === 0) {
      try {
        const res2 = await fetch(`/webapi/3.9/sets/${setId}`, { credentials: 'include' });
        if (res2.ok) {
          const json2 = await res2.json();
          const terms = json2?.set?.terms || json2?.terms || [];
          terms.forEach(t => {
            const w = (t.word || '').trim();
            const d = (t.definition || '').trim();
            if (w && d && !isJunk(w)) {
              cards.push({ term: w, meaning: d });
            }
          });
        }
      } catch (e) { }
    }
  }

  // =========================================================================
  // PHƯƠNG PHÁP 2: BÓC TÁCH TRỰC TIẾP TỪ GIAO DIỆN (Màn hình Still learning như ảnh)
  // =========================================================================
  if (cards.length === 0) {
    console.log('Đang quét trực tiếp từ giao diện thẻ học...');

    // Tìm tất cả các button sao hoặc loa để định vị chính xác vị trí của từng card
    const allButtons = Array.from(document.querySelectorAll('button'));
    const cardContainers = [];

    allButtons.forEach(btn => {
      const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
      // Nút audio hoặc nút star
      if (aria.includes('audio') || aria.includes('sound') || aria.includes('phát âm') || aria.includes('star') || aria.includes('sao')) {
        let parent = btn.parentElement;
        while (parent && parent !== document.body) {
          const rect = parent.getBoundingClientRect();
          // Một thẻ card chuẩn có chiều cao từ 50px đến 600px và chiều rộng > 250px
          if (rect.height >= 50 && rect.height <= 600 && rect.width >= 250) {
            if (!cardContainers.includes(parent)) {
              cardContainers.push(parent);
            }
            break;
          }
          parent = parent.parentElement;
        }
      }
    });

    // Bóc tách text 2 cột từ mỗi cardContainer
    cardContainers.forEach(container => {
      // Lấy tất cả các khối con trực tiếp hiển thị nội dung
      const textNodes = Array.from(container.querySelectorAll('*'))
        .filter(el => {
          // Chỉ lấy các thẻ có chứa text trực tiếp (không tính nút bấm và icon)
          if (el.tagName === 'BUTTON' || el.tagName === 'SVG' || el.closest('button')) return false;
          const text = el.innerText?.trim();
          if (!text || isJunk(text)) return false;
          // Loại bỏ các thẻ cha chứa toàn bộ text
          return el.children.length === 0 || (el.children.length === 1 && el.children[0].tagName === 'SPAN');
        })
        .map(el => el.innerText.trim());

      // Lọc các chuỗi trùng lặp
      const uniqueTexts = [];
      textNodes.forEach(t => {
        if (!uniqueTexts.some(u => u.includes(t) || t.includes(u))) {
          uniqueTexts.push(t);
        }
      });

      if (uniqueTexts.length >= 2) {
        const term = uniqueTexts[0];
        const meaning = uniqueTexts.slice(1).join('\n');
        if (term && meaning && !cards.some(c => c.term === term)) {
          cards.push({ term, meaning });
        }
      }
    });
  }

  // =========================================================================
  // PHƯƠNG PHÁP 3: QUÉT THEO ĐƯỜNG PHÂN CÁCH (Divider giữa Từ và Nghĩa)
  // =========================================================================
  if (cards.length === 0) {
    // Tìm các thẻ có đường viền ngăn cách (divider) như trong ảnh
    const dividers = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.borderLeftWidth !== '0px' || style.borderRightWidth !== '0px';
    });

    dividers.forEach(div => {
      const parent = div.parentElement;
      if (!parent) return;
      const termEl = div.previousElementSibling || parent.children[0];
      const defEl = div;
      if (termEl && defEl) {
        const t = termEl.innerText?.trim();
        const m = defEl.innerText?.trim();
        if (t && m && !isJunk(t) && !cards.some(c => c.term === t)) {
          cards.push({ term: t, meaning: m });
        }
      }
    });
  }

  // =========================================================================
  // KẾT QUẢ VÀ TỰ ĐỘNG COPY
  // =========================================================================
  // Lọc lại lần cuối để đảm bảo không dính từ rác
  cards = cards.filter(c => !isJunk(c.term) && c.term !== 'Term');

  if (cards.length === 0) {
    console.error('❌ Vẫn chưa lấy được dữ liệu.');
    alert('Không tìm thấy từ vựng. Bạn hãy bấm về trang chủ của bộ thẻ: https://quizlet.com/vn/1223207172/test-1-ets-2026-rc-flash-cards rồi bấm dấu 3 chấm "..." -> chọn "Xuất" nhé!');
    return;
  }

  const jsonResult = JSON.stringify(cards, null, 2);

  // Copy Clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(jsonResult);
    } else if (typeof copy === 'function') {
      copy(jsonResult);
    }
  } catch (e) { }

  // Tải file .json
  try {
    const blob = new Blob([jsonResult], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quizlet_set_${setId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) { }

  alert(`🎉 TUYỆT VỜI! Đã lấy thành công ${cards.length} từ vựng thật!\n\n✔ Đã tự động Copy vào Clipboard.\n✔ Đã tải file 'quizlet_set_${setId}.json' về máy.\n\n👉 Bạn qua Quiz-App bấm "Nhập hàng loạt" rồi nhấn Ctrl + V nhé!`);
  console.log(`%c✔ THÀNH CÔNG: Đã trích xuất ${cards.length} từ vựng!`, 'color: #10b981; font-weight: bold; font-size: 16px;');
  console.table(cards.slice(0, 5));
  return cards;
})();
