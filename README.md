# Viva-LDA Web

Mobile-responsive web interface for Viva-LDA revision.

## Features
- **Mobile Optimized**: Designed for study on the go.
- **Persistent Stats**: Progress is saved locally on your device.
- **Premium UI**: Dark mode, bento-style dashboard, and interactive quiz sessions.

## Setup & Development
1. **Sync Data**:
   From the project root, run:
   ```bash
   python3 export_for_web.py
   ```
2. **Launch Locally**:
   ```bash
   cd web-app
   npm install
   npm run dev
   ```
3. **Deployment**:
   Connect this folder to Netlify for automatic CI/CD.

## Tech Stack
- **Frontend**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Data**: Static JSON (Exported from SQLite)
- **Deployment**: Netlify
