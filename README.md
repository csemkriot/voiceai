<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Hotel MKR - AI Voice Receptionist

An AI-powered voice receptionist for Hotel MKR in Puri, Odisha. Built with React, TypeScript, and Google's Gemini Live API with native audio support.

## Features

- 🎙️ Real-time voice conversation with AI receptionist "Anjali"
- 🌍 Multi-language support (Odia, Hindi, Bangla, English)
- 🏨 Hotel information, room booking assistance, and local tourism guidance
- 🎨 Beautiful UI with Tailwind CSS
- 🔊 Gapless audio playback for natural conversations

## Run Locally

**Prerequisites:** Node.js (v18 or higher)

1. Clone the repository:
   ```bash
   git clone https://github.com/csemkriot/voiceai.git
   cd voiceai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` file and add your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   Get your API key from: https://aistudio.google.com/apikey

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## Deploy to Production

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Visit [vercel.com](https://vercel.com) and sign in
3. Click "New Project" and import your GitHub repository
4. Add environment variable: `GEMINI_API_KEY`
5. Deploy!

### Option 2: Netlify

1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy the `dist` folder to [netlify.com](https://netlify.com)
3. Add environment variable: `GEMINI_API_KEY`

### Option 3: GitHub Pages

Note: GitHub Pages doesn't support environment variables securely. Use Vercel or Netlify instead.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Google Gemini Live API
- Web Audio API

## License

MIT
