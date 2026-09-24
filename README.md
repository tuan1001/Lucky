# HTIT Lucky Draw

Vòng quay may mắn cho sự kiện **HTIT Customer Conference 2026 – HAIPHONG PORT TIL (HTIT)**.
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
các lượt sau.

- Bảng bên phải chỉ hiện **giải đang quay**. Quay xong người cuối của một giải
  thì bảng vẫn giữ danh sách giải đó, bấm quay tiếp mới chuyển sang giải kế.
- Quay xong giải cuối và đóng popup → **bảng tổng kết** toàn màn hình tự hiện,
  liệt kê người trúng của mọi giải. `Esc` để đóng; mở lại bằng nút *Final
  Results* ở bảng bên phải hoặc bấm `Space`. Kết quả được lưu vào `localStorage`, nên lỡ tải lại trang giữa sự
kiện vẫn không mất.

## Bảng thiết lập ẩn (`Ctrl` + `Shift` + `K`)

Không có nút nào trên màn hình, chỉ mở bằng phím tắt. Gồm 3 tab:

### 1. Người tham gia

- Nạp từ file Excel bất kỳ trên máy (`.xlsx`, `.xls`, `.csv`).
- Hoặc dán danh sách: mỗi dòng một họ tên, hoặc `mã<dấu phẩy / tab / khoảng
  trắng>họ tên` nếu danh sách có mã.
- Nút *Dùng lại employees.xlsx* để quay về file gốc trong `public/`.
- *Số ô trên vòng quay* (mặc định 150): số người được bốc ngẫu nhiên để vẽ vòng
  quay cho đỡ rối khi danh sách dài. Người trúng luôn được đưa vào ô mà kim dừng.

Cột được nhận trong file Excel:

| Nội dung | Tên cột chấp nhận | Bắt buộc |
| --- | --- | --- |
| Họ tên | `Tên`, `Họ tên`, `name` | Có |
| Danh xưng | `Nam/ Nữ`, `Giới tính`, `Danh xưng` — giá trị `Mr.` / `Ms.` / `Mrs.` hoặc `Nam` / `Nữ` | Không |
| Chức danh | `Chức danh`, `Chức vụ`, `Position`, `Title` | Không |
| Mã nhân viên | `Mã nhân viên`, `Mã`, `MSNV`, `code`, `ID` | Không |

Tên cột không phân biệt hoa thường, dấu hay khoảng trắng (`Nam/ Nữ` = `nam/nữ`).
`Nam` tự đổi thành `Mr.`, `Nữ` thành `Ms.`.

Cách hiển thị:

- Trên vòng quay: `Mr. Benoit De Quillacq`
- Khi công bố người trúng (popup, bảng kết quả): `Mr. Benoit De Quillacq - Managing Director Vietnam`

File chỉ có cột họ tên vẫn chạy được: app tự sinh mã ẩn (`#1`, `#2`…) để phân
biệt hai người trùng tên, vòng quay và bảng kết quả khi đó chỉ hiển thị họ tên.

### 2. Cơ cấu giải

Sửa tên giải, số lượng, thứ tự quay (↑ ↓), thêm hoặc xoá giải, khôi phục mặc
định. Danh sách xếp theo **thứ tự quay từ trên xuống**. Tên giải viết dạng
`Tiếng Anh (Tiếng Việt)` — phần trong ngoặc hiển thị làm dòng phụ.

Mặc định: Ba 3 → Nhì 2 → Nhất 1 → Đặc biệt 1 (7 giải). Sửa trong app chỉ lưu ở
trình duyệt đang dùng; muốn áp dụng cho mọi máy / bản deploy thì sửa
`DEFAULT_PRIZES` trong `src/LuckyDrawResevert.js`.

### 3. Đặt sẵn người trúng

Mỗi dòng một **họ tên** (hoặc mã nhân viên nếu danh sách có mã). Tới giải nào
thì lấy lần lượt các dòng của giải đó, hết thì quay ngẫu nhiên. Dòng nhập vào
được tra cứu ngay: hiện tên người, báo đỏ nếu không tìm thấy hoặc người đó đã
trúng giải khác, gạch ngang nếu vượt số lượng giải.

Danh sách đặt sẵn **mặc định** nằm trong code (`DEFAULT_FIXED_B64` trong
`src/LuckyDrawResevert.js`, mã hoá base64 để không đọc thẳng được tên — chỉ là
che mắt, không phải bảo mật). Trình duyệt chưa từng lưu danh sách riêng sẽ dùng
danh sách này; nút *Khôi phục mặc định* ở tab này nạp lại nó.

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
  sound2.mp3
src/
  App.js             # render LuckyDrawResevert
  backdrop-2026.webp  # nền sự kiện (ảnh backdrop không chữ)
  LuckyDrawResevert.js  # toàn bộ màn hình quay thưởng
  LuckyDrawWheel.css    # giao diện + bộ nhận diện
  LuckyDraw.js          # bản cũ quay xuôi, hiện không dùng
```

Vòng quay dùng [`react-custom-roulette`](https://www.npmjs.com/package/react-custom-roulette).
Người trúng được chọn trước, sau đó kim được cho dừng đúng ô của người đó, nên
mã hiện trên vòng quay luôn khớp với popup.
