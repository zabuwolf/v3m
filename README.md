# V3M HR Office – Văn phòng ảo 3D & Quản lý nhân sự (React + TypeScript)

Hệ thống quản lý nhân sự theo phong cách **văn phòng ảo isometric 3D** hiện đại (phỏng theo KBT Agent Office): toàn bộ nhân viên, tổ nhóm, phòng ban hiển thị trên một mô hình văn phòng 3D tương tác sống động; số liệu chấm công, công việc, KPI được trình chiếu tự động như bản tin nội bộ.

Dự án đã được chuyển đổi hoàn toàn sang **React + TypeScript + Vite + Tailwind CSS** với đồ hoạ isometric trau chuốt, hỗ trợ render sub-pixel sắc nét trên màn hình Retina / High-DPI, đèn chiếu sáng ngày/đêm chân thực, các phụ kiện văn phòng và cây xanh đa dạng.

---

## Tính năng chính

### 1. 🏢 Văn phòng ảo 3D Isometric & Assets nâng cao
- **7 Phân khu chức năng**: Phòng điều hành, Leader Hub, Phòng Nhân sự, Phòng Kinh doanh, Phòng Kỹ thuật, Marketing & Creative, Sảnh Lễ tân & Café.
- **Nội thất & Assets trau chuốt**:
  - Bàn làm việc công thái học với màn hình cong đôi phát sáng theo màu nhận diện của tổ, bàn phím cơ, chuột, đèn bàn góc chiếu mềm.
  - Phòng điều hành với tủ sách gỗ sồi, tài liệu, cúp vinh danh, ghế sofa bọc da cao cấp.
  - Phòng kỹ thuật & Leader Hub với tủ Server rack chứa đèn LED nhấp nháy liên tục, bảng tương tác kỹ thuật số với biểu đồ sóng chuyển động thời gian thực.
  - Sảnh lễ tân hiện đại với quầy đá uốn cong "LỄ TÂN · RECEPTION", máy pha cà phê espresso bốc khói hơi nước bồng bềnh, bàn ghế lounge thư giãn.
  - Cây xanh Monstera & vạn niên thanh tỉa lá nhiều lớp sinh động.
- **Trang trí lễ hội**:
  - **Tết**: Lồng đèn đỏ phát sáng, cành đào hồng nở rộ.
  - **Noel**: Cây thông mini lung linh, nơ chuông giáng sinh.
  - **Tiêu chuẩn**: Phong cách kiến trúc tối giản hiện đại.
- **Nhân vật & Nhân viên 3D**:
  - Avatar pixel/isometric đa dạng kiểu tóc (ngắn, dài xoăn, búi cao, dựng phong cách), trang phục màu tổ công tác, phụ kiện mắt kính, vương miện cho Trưởng tổ / Leader.
  - Hiệu ứng thở nhẹ nhàng, bóng đổ mềm mại, đèn cảnh báo nhấp nháy phát xung tròn dưới sàn bàn làm việc.
  - Bong bóng hội thoại (Chatter) ngẫu nhiên giữa các nhân viên trong giờ làm việc.
  - Bảng tên nổi hiển thị tên và chấm trạng thái: 🟢 Có mặt, 🟡 Đi muộn, 🔵 Làm từ xa, ⚪ Vắng mặt.

### 2. 🎬 Chế độ Tham Quan & Trình Chiếu (Tour Presentation)
- Trình chiếu tự động các slide giới thiệu: Khởi động → 7 khu vực phòng ban → Sảnh lễ tân & Café đối thoại phục vụ khách → Quy tắc cảnh báo nhấp nháy → Báo cáo tổng quan → **Bục vinh danh Top 3 kèm pháo hoa Confetti rực rỡ và tiếng chuông reo** → Quán quân kỳ → Tổ cần hỗ trợ → Top gương mặt nhân sự 90 ngày.
- Thanh tiến trình, nút lùi / tạm dừng / tiến, bật/tắt âm thanh hiệu ứng Web Audio API.

### 3. 👥 Quản lý nhân sự toàn diện
- **Tổng quan**: Số liệu thống kê thời gian thực, bảng xếp hạng tổ, danh sách nhân viên chưa check-in kèm nút check-in nhanh.
- **Nhân sự**: Tìm kiếm tức thì, lọc theo phòng ban, thêm/sửa/xoá nhân viên, xem hồ sơ cá nhân và xuất file CSV.
- **Phòng ban & Tổ**: Quản lý các tổ chuyên môn, chỉnh sửa tên, màu nhận diện và thông tin phòng ban.
- **Chấm công**: Lịch chấm công theo ngày, ghi nhận giờ vào / giờ ra, tự động tính tăng ca (OT), số lượng việc hoàn thành và chấm điểm KPI. Nút "Tất cả có mặt" tiện lợi.
- **Nghỉ phép**: Tiếp nhận đơn xin nghỉ (phép năm, ốm, thai sản, việc riêng), phê duyệt hoặc từ chối, tự động đồng bộ sang lịch chấm công.
- **Công việc (Kanban)**: 3 cột Cần làm - Đang làm - Đã xong, chỉ báo việc quá hạn, ưu tiên gấp, kéo chuyển trạng thái mượt mà.
- **Tuyển dụng**: Pipeline ứng viên (Mới nộp → Sàng lọc → Phỏng vấn → Đề nghị → Đã nhận), nút "Nhận việc" tạo ngay hồ sơ nhân viên vào tổ.
- **Khách mời**: Sổ theo dõi khách mời ghé thăm văn phòng, hiển thị tại khu vực lễ tân.
- **Dữ liệu & Quy tắc**: Tuỳ chỉnh ngưỡng cảnh báo (đi muộn, chuyên cần, việc, KPI, số ngày đánh giá), sao lưu dữ liệu ra file JSON, nhập JSON và khôi phục dữ liệu ban đầu.

### 4. 📊 Báo cáo & Vinh danh
- Bộ lọc thời gian: Hôm nay, Hôm qua, Tuần này, Tháng này.
- Thẻ Quán quân kỳ với các thành viên tiêu biểu.
- Bục vinh danh Top 3 tổ chuyên môn.
- Biểu đồ cột thể hiện chuyên cần và tỷ lệ đi muộn trong 14 ngày gần nhất.
- Bảng xếp hạng chi tiết tất cả các tổ và Top gương mặt nhân sự 90 ngày.

---

## Khởi chạy dự án

```bash
# Cài đặt thư viện
npm install

# Chạy môi trường phát triển (Port 3000)
npm run dev

# Đóng gói sản phẩm
npm run build
```

Mở trình duyệt tại `http://localhost:3000`.
Thêm tham số `?tour=1` vào URL để tự động mở chế độ trình chiếu lên TV hoặc màn hình sảnh đón tiếp.
