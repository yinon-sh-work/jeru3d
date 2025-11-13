# Jeru3D - Jerusalem 3D AR Viewer

A web-based AR application for viewing 3D terrain of Jerusalem using Three.js and real terrain data from MapTiler.

## Features

- 🗺️ 3D terrain visualization of Jerusalem
- 📱 AR capabilities for mobile devices
- 🎨 Satellite imagery overlay
- ⚡ Built with Next.js and Three.js

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yinon-sh-work/jeru3d.git
cd jeru3d
```

2. Install dependencies
```bash
npm install
```

3. Create `.env.local` and add your MapTiler API key
```bash
cp .env.example .env.local
# Edit .env.local and add your NEXT_PUBLIC_MAPTILER_KEY from https://maptiler.com
```

### Running Locally

```bash
npm run dev
```

Visit `http://localhost:3000` and navigate to `/ar` for the AR view.

### Building for Production

```bash
npm run build
npm start
```

## Deployment to Vercel

### Using Vercel CLI

1. Install Vercel CLI
```bash
npm install -g vercel
```

2. Deploy
```bash
vercel
```

### Using GitHub

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project" and select your GitHub repository
4. Add environment variable: `NEXT_PUBLIC_MAPTILER_KEY` (get from [MapTiler](https://maptiler.com))
5. Click "Deploy"

## Environment Variables

- `NEXT_PUBLIC_MAPTILER_KEY` - Your MapTiler API key (required for terrain and satellite imagery)

## Technologies

- **Framework**: Next.js 14
- **3D Graphics**: Three.js
- **Maps**: MapLibre GL
- **Language**: TypeScript

## License

MIT
