# Sunbot School Development Telemetry

Dữ liệu được ghi vào spreadsheet `SUNBOT School Development CRM & Survey Backend 2026` (`12sbbWo-u1zNAl7bfCBDIPHH6XKoIBF8Lm8K-MA0HRvo`).

## Mục tiêu
- Theo dõi page/section/model/CTA/survey progress ngay cả khi chưa submit.
- Tách **sale distribution** khỏi **customer engagement**: đã gửi tài liệu không đồng nghĩa khách đã xem.
- Không fingerprint người dùng. Chỉ dùng visitor_id/session_id ngẫu nhiên trong trình duyệt và attribution từ link do Sunbot tạo.
- Link attribution là tín hiệu, không phải xác nhận danh tính nếu link bị chuyển tiếp.

## Bảng telemetry
- `16_ENGAGEMENT_EVENTS`: sự kiện thô.
- `17_VISITOR_SESSIONS`: tổng hợp phiên.
- `18_INTEREST_SIGNALS`: tín hiệu quan tâm/lăn tăn.
- `19_SURVEY_DRAFTS`: phiếu đang điền dở.

## Bảng phân phối tài liệu
- `20_ASSET_LINKS`: một Link_ID cho một trường/cơ hội/tài sản/version/campaign. Link_ID là khóa attribution chính.
- `21_ASSET_SENDS`: một dòng cho mỗi lần sale thực sự gửi tài liệu; ghi người gửi, thời điểm, kênh, người nhận và follow-up.

## URL tracking
Khuyến nghị dùng URL dạng:

`/profile-v2/public/?lid=LNK-...&audience=public&asset=profile&ver=v1&campaign=2026-school-development&from=pdf_profile`

Các tham số `school`/`school_id` là tùy chọn. Khi endpoint hoạt động, backend có thể tự ánh xạ `lid` sang School_ID, Owner, Asset, Version và Campaign từ `20_ASSET_LINKS`.

Client tự giữ `lid`, audience, asset, version và campaign khi người xem đi từ Profile → Catalogue → Survey.

## PDF/PPTX/QR
PDF/PPTX là tài liệu phát hành, không phải nguồn analytics sâu. Mỗi PDF nên chứa QR/CTA về link có `lid`; từ điểm click/scan trở đi, hành vi được đo trên Digital Profile/Catalogue/Survey.

## Triển khai endpoint
Dùng `telemetry/apps-script/Code.gs` làm Google Apps Script Web App chạy dưới tài khoản quản trị. Sau khi Deploy > New deployment > Web app, Execute as Me, Who has access: Anyone, copy URL `/exec` vào `telemetry/config.js`.

Apps Script v1.1 hỗ trợ `event`, `session`, `draft`, `submit`, `signal`, đồng thời có sẵn `link` và `send` để sau này Link Builder/Sunbot Ops có thể tạo Link_ID và ghi nhận lần gửi tự động.
