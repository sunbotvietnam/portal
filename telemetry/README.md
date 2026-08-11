# Sunbot School Development Telemetry

Dữ liệu được ghi vào spreadsheet `SUNBOT School Development CRM & Survey Backend 2026` (`12sbbWo-u1zNAl7bfCBDIPHH6XKoIBF8Lm8K-MA0HRvo`).

## Mục tiêu
- Theo dõi page/section/model/CTA/survey progress ngay cả khi chưa submit.
- Không fingerprint người dùng. Chỉ dùng visitor_id/session_id ngẫu nhiên trong trình duyệt và attribution từ link do Sunbot gửi (`school`, `source`, `audience`).
- Link attribution là tín hiệu, không phải xác nhận danh tính nếu link bị chuyển tiếp.

## Bảng
- `16_ENGAGEMENT_EVENTS`: sự kiện thô.
- `17_VISITOR_SESSIONS`: tổng hợp phiên.
- `18_INTEREST_SIGNALS`: tín hiệu quan tâm/lăn tăn.
- `19_SURVEY_DRAFTS`: phiếu đang điền dở.

## Triển khai endpoint
Dùng `telemetry/apps-script/Code.gs` làm Google Apps Script Web App chạy dưới tài khoản tuongvan1906@gmail.com. Sau khi Deploy > New deployment > Web app, Execute as Me, Who has access: Anyone, copy URL `/exec` vào `telemetry/config.js`.
