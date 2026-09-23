# HTIT Lucky Draw

Vòng quay may mắn cho sự kiện **Year End Voyage – HAIPHONG PORT TIL (HTIT)**.
Ứng dụng React (Create React App), chạy offline trên máy trình chiếu, giao diện
theo bộ nhận diện thương hiệu HTIT.

## Chạy

```bash
npm install
npm start
```

Mở http://localhost:3000. Build bản tĩnh: `npm run build`.

## Thao tác khi trình chiếu

| Phím / thao tác | Tác dụng |
| --- | --- |
| `Space` / `Enter` / click vòng quay | Quay giải hiện tại |
| `Esc` | Đóng popup người trúng hoặc bảng thiết lập |
| `Ctrl` + `Shift` + `K` | Mở/đóng bảng thiết lập ẩn |
| Nút ↻ góc bảng kết quả | Xoá toàn bộ kết quả đã quay và nạp lại danh sách |

Vòng quay chạy tuần tự từ giải thấp lên giải cao. Người đã trúng bị loại khỏi
các lượt sau. Kết quả được lưu vào `localStorage`, nên lỡ tải lại trang giữa sự
kiện vẫn không mất.

## Bảng thiết lập ẩn (`Ctrl` + `Shift` + `K`)

Không có nút nào trên màn hình, chỉ mở bằng phím tắt. Gồm 3 tab:

### 1. Người tham gia

- Nạp từ file Excel bất kỳ trên máy (`.xlsx`, `.xls`, `.csv`).
- Hoặc dán danh sách, mỗi dòng `mã<dấu phẩy hoặc tab hoặc khoảng trắng>họ tên`.
- Nút *Dùng lại employees.xlsx* để quay về file gốc trong `public/`.
- *Số ô trên vòng quay* (mặc định 150): số người được bốc ngẫu nhiên để vẽ vòng
  quay cho đỡ rối khi danh sách dài. Người trúng luôn được đưa vào ô mà kim dừng.

Cột được nhận trong file Excel:

| Nội dung | Tên cột chấp nhận |
| --- | --- |
| Mã nhân viên | `code`, `Code`, `Mã nhân viên`, `ID` |
| Họ tên | `name`, `Name`, `Họ tên` |

### 2. Cơ cấu giải

Sửa tên giải, số lượng, thứ tự quay (↑ ↓), thêm hoặc xoá giải, khôi phục mặc
định. Danh sách xếp theo **thứ tự quay từ trên xuống**. Tên giải viết dạng
`Tiếng Anh (Tiếng Việt)` — phần trong ngoặc hiển thị làm dòng phụ.

Mặc định: Khuyến khích 16 → Ba 8 → Nhì 4 → Nhất 2 → Đặc biệt 1.

### 3. Đặt sẵn người trúng

Nhập trước mã nhân viên cho từng giải. Tới giải nào thì lấy lần lượt các mã của
giải đó, hết mã thì quay ngẫu nhiên. Mã nhập vào được tra cứu ngay: hiện tên
người, báo đỏ nếu sai mã hoặc người đó đã trúng giải khác, gạch ngang nếu vượt
số lượng giải.

> Đổi danh sách người hoặc cơ cấu giải khi đã quay dở sẽ xoá kết quả đã quay
> (app hỏi xác nhận trước). Nên chốt hai tab này trước khi bắt đầu.

## Dữ liệu lưu trên máy

Tất cả nằm trong `localStorage` của trình duyệt trên máy trình chiếu — hãy thiết
lập trên đúng máy sẽ dùng.

| Khoá | Nội dung | Nút ↻ có xoá không |
| --- | --- | --- |
| `lucky-draw-state` | Kết quả đã quay, danh sách còn lại | Có |
| `lucky-draw-config` | Cơ cấu giải, số ô vòng quay | Không |
| `lucky-draw-fixed` | Danh sách trúng đặt sẵn | Không |

## Bộ nhận diện

Màu lấy mẫu trực tiếp từ logo HTIT, khai báo trong `src/LuckyDrawWheel.css`:

| Token | Mã màu |
| --- | --- |
| `--htit-blue` | `#406ab3` |
| `--htit-blue-dark` | `#1f457f` |
| `--htit-gold` | `#e6cb7a` |
| `--htit-gold-dark` | `#cf8b2c` |
| `--htit-ink` | `#231f20` |

Font **Barlow** (Google Fonts), trùng với wordmark "HAIPHONG PORT TIL". Nếu máy
trình chiếu không có mạng, app tự lùi về Segoe UI.

## Cấu trúc

```
public/
  employees.xlsx     # danh sách mặc định
  brand/             # logo HTIT (bản chữ trắng và bản chữ đen)
  back.png, sound2.mp3
src/
  App.js             # render LuckyDrawResevert
  LuckyDrawResevert.js  # toàn bộ màn hình quay thưởng
  LuckyDrawWheel.css    # giao diện + bộ nhận diện
  LuckyDraw.js          # bản cũ quay xuôi, hiện không dùng
```

Vòng quay dùng [`react-custom-roulette`](https://www.npmjs.com/package/react-custom-roulette).
Người trúng được chọn trước, sau đó kim được cho dừng đúng ô của người đó, nên
mã hiện trên vòng quay luôn khớp với popup.
