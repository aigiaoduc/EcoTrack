# EcoTrack Học Sinh

Ứng dụng web tính toán Carbon Footprint dành cho học sinh, được xây dựng bằng React, Vite, Firebase và Google GenAI.

## Yêu cầu

- Node.js (phiên bản 18 trở lên)
- NPM hoặc Yarn

## Cài đặt và Chạy thử (Local)

1. Tải code về máy.
2. Cài đặt các thư viện:
   ```bash
   npm install
   ```
3. Chạy server phát triển:
   ```bash
   npm run dev
   ```
4. Mở trình duyệt tại `http://localhost:3000`.

## Deploy lên Vercel

1. Đẩy code lên GitHub/GitLab/Bitbucket.
2. Vào [Vercel](https://vercel.com), chọn **Add New Project**.
3. Chọn repository chứa dự án này.
4. Framework Preset: Chọn **Vite**.
5. Nhấn **Deploy**.

## Lưu ý

- Dự án hiện đang sử dụng TailwindCSS qua CDN (trong `index.html`) để giữ nguyên cấu trúc cũ.
- Firebase Config hiện đang nằm trong `firebaseConfig.ts`. Hãy đảm bảo domain của Vercel (ví dụ: `your-app.vercel.app`) đã được thêm vào mục **Authorized Domains** trong Authentication của Firebase Console.
