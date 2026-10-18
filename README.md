# V3M HR Office – Văn phòng ảo 3D quản lý nhân sự

Hệ thống quản lý nhân sự theo phong cách "văn phòng ảo isometric" (mô phỏng theo video
`vid hệ thống.mp4` – KBT Agent Office): toàn bộ nhân viên, tổ, phòng ban hiện trên một
sơ đồ văn phòng 3D; số liệu chấm công, công việc, KPI được chiếu tự động như bản tin nội bộ.

## Chạy

Chỉ cần Python 3 (không cài thêm gì):

```bash
cd /home/zabu/V3M
python3 server.py          # cổng mặc định 8787
# python3 server.py 9000   # đổi cổng
```

Mở `http://localhost:8787`. Server in ra cả địa chỉ LAN (ví dụ `http://192.168.1.10:8787`)
để mở trên điện thoại cùng Wi-Fi, giống trong video.

Lần chạy đầu server tự sinh dữ liệu mẫu vào `data/db.json`. Mọi thay đổi trên giao diện được
lưu ngay vào file này. Mở thẳng `web/index.html` không qua server cũng chạy được (chế độ
ngoại tuyến, lưu trong trình duyệt).

## Các màn hình

| Màn | Nội dung |
|---|---|
| **Văn phòng 3D** | Sơ đồ isometric 7 khu: Phòng điều hành, Leader Hub, Nhân sự, Kinh doanh, Kỹ thuật, Marketing & Creative, Sảnh lễ tân & Café. Avatar nhân viên ngồi theo bàn, trợ lý AI, đường kết nối ra lệnh / báo cáo, bảng tên có chấm trạng thái (có mặt / muộn / từ xa / nghỉ), nhấp nháy đỏ / vàng theo quy tắc, ngày / đêm theo giờ thực, theme Tết / Noel. Kéo để di chuyển, cuộn hoặc chụm để phóng to. Bấm nhân vật để mở hồ sơ, bấm nhãn khu để xem thẻ khu vực. |
| **🎬 Tham quan** | Trình chiếu tự động ~36 slide: Mở màn → 7 khu vực → Lễ tân đón khách (chat) → Quy tắc nhấp nháy → Tổng quan / Vinh danh (bục top 3 + confetti) / Quán quân / Kém nhất cho Hôm nay, Hôm qua, Tuần này, Tháng này → Nhắc nhở các tổ bị cảnh báo → Hồ sơ nhân sự nổi bật. Phím ← → để chuyển, Esc để thoát, vuốt trên điện thoại. Tự bật đúng giờ đã đặt (mặc định 16:30). |
| **⚙ Cài đặt văn phòng** | Tìm nhân viên, thêm bàn, sắp xếp bàn, lưới, kết nối, bảng tên, ngày / đêm, đèn, theme, lịch chiếu, giây / slide, link chiếu, chú giải sơ đồ. |
| **Quản lý nhân sự** | Tổng quan · Nhân sự (thêm / sửa / xoá, tìm kiếm, xuất CSV) · Phòng ban & Tổ · Chấm công (theo ngày, check-in / out, OT, việc, KPI) · Nghỉ phép (tạo, duyệt, từ chối) · Công việc (kanban) · Tuyển dụng (pipeline, nhận việc → tạo hồ sơ) · Khách mời · Dữ liệu & quy tắc (ngưỡng cảnh báo, xuất / nhập JSON, sinh lại dữ liệu mẫu). |
| **Báo cáo** | Tổng quan theo kỳ, quán quân, bục vinh danh, kém nhất, biểu đồ có mặt 14 ngày, bảng xếp hạng tổ, top nhân sự 90 ngày, cảnh báo. |

## Quy tắc nhấp nháy (chỉnh trong *Dữ liệu & quy tắc*)

Trong cửa sổ 30 ngày, một tổ bị **cảnh báo** khi: đi muộn > 15 %, chuyên cần < 90 %,
hoàn thành việc < 80 %, hoặc KPI < 60.

- 🔴 **Nháy đỏ · xử lý ngay**: từ 2 cảnh báo trở lên.
- 🟡 **Nháy vàng · kém nhất kỳ**: tổ có KPI thấp nhất trong kỳ đang chiếu.
- ⚠ **Nhắc nhở**: 1 cảnh báo, theo dõi.

## Tham số URL hữu ích

| URL | Tác dụng |
|---|---|
| `/?tour=1` | Mở trình chiếu ngay (dán lên TV / màn hình sảnh) |
| `/?slide=11` | Mở trình chiếu từ slide số 11 |
| `/?view=manage&tab=attendance` | Vào thẳng tab chấm công (`employees`, `teams`, `leaves`, `tasks`, `candidates`, `visitors`, `data`) |
| `/?view=reports&period=week` | Báo cáo tuần (`today`, `yesterday`, `week`, `month`) |
| `/?emp=nv011` | Mở hồ sơ một nhân viên |
| `/?night=1` | Ép chế độ đêm để xem đèn |

## Cấu trúc

```
server.py        máy chủ HTTP + API (GET/PUT /api/data, POST /api/reset)
seed.py          sinh dữ liệu mẫu: data/seed.json và web/js/seed.js
data/db.json     cơ sở dữ liệu thực (tự tạo)
web/index.html   giao diện
web/css/style.css
web/js/store.js  tải / lưu dữ liệu, tính KPI, chuyên cần, xếp hạng, cảnh báo
web/js/office.js vẽ văn phòng isometric trên canvas, camera, tương tác
web/js/ui.js     thẻ thông tin, popup hồ sơ, bảng cài đặt, toast
web/js/tour.js   chế độ tham quan / trình chiếu
web/js/manage.js trang quản lý nhân sự (CRUD)
web/js/reports.js trang báo cáo
web/js/app.js    khởi động, tham số URL, tự chiếu theo giờ
```

## Dữ liệu

`data/db.json` là một tài liệu JSON duy nhất gồm: `company`, `settings`, `zones`, `teams`,
`employees`, `agents`, `attendance` (một bản ghi / người / ngày), `tasks`, `leaves`,
`candidates`, `visitors`, `rules`. Có thể xuất / nhập toàn bộ ở tab *Dữ liệu & quy tắc*.
Muốn bắt đầu với dữ liệu thật: xoá hết nhân viên mẫu hoặc nhập file JSON theo cùng cấu trúc.
