import JSZip from 'jszip';
import saveAs from 'file-saver';
import { SiteData, BlockData, BlockType, SocialPlatform } from '../types';

// --- HELPERS ---

function base64ToBlob(base64: string): Blob | null {
  try {
    const arr = base64.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    return null;
  }
}

const escapeHtml = (value: string | undefined | null): string => {
  if (!value) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

// --- REACT PROJECT GENERATORS ---

const generatePackageJson = (name: string): string => {
  const safeName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return JSON.stringify(
    {
      name: safeName || 'my-bento',
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'lucide-react': '^0.460.0',
        'react-icons': '^5.3.0',
      },
      devDependencies: {
        '@types/react': '^18.3.12',
        '@types/react-dom': '^18.3.1',
        '@vitejs/plugin-react': '^4.3.3',
        autoprefixer: '^10.4.20',
        postcss: '^8.4.49',
        tailwindcss: '^3.4.15',
        typescript: '^5.6.3',
        vite: '^5.4.11',
      },
    },
    null,
    2
  );
};

const generateViteConfig = (): string => `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
})
`;

const generateTailwindConfig = (): string => `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
`;

const generatePostCSSConfig = (): string => `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;

const generateTSConfig = (): string =>
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
    },
    null,
    2
  );

const generateIndexHtml = (title: string): string => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const generateMainTsx = (): string => `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;

const generateIndexCSS = (): string => `@tailwind base;
@tailwind components;
@tailwind utilities;

.full-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.75rem;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
}

.media-title {
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.media-subtext {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.8);
  margin-top: 0.25rem;
}

.bento-item {
  transform-style: preserve-3d;
  will-change: transform;
}

/* Hide scrollbar */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

const generateAppTsx = (data: SiteData, imageMap: Record<string, string>): string => {
  const { profile, blocks } = data;
  const avatarSrc = imageMap['profile_avatar'] || profile.avatarUrl;

  const avatarStyle = profile.avatarStyle || {
    shape: 'rounded',
    shadow: true,
    border: true,
    borderColor: '#ffffff',
    borderWidth: 4,
  };
  const avatarRadius =
    avatarStyle.shape === 'circle' ? '9999px' : avatarStyle.shape === 'square' ? '0' : '1.5rem';
  const avatarShadow = avatarStyle.shadow !== false ? '0 25px 50px -12px rgba(0,0,0,0.15)' : 'none';
  const avatarBorder =
    avatarStyle.border !== false
      ? `${avatarStyle.borderWidth || 4}px solid ${avatarStyle.borderColor || '#ffffff'}`
      : 'none';

  const bgStyle = profile.backgroundImage
    ? `{ backgroundImage: "url('${profile.backgroundImage}')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }`
    : `{ backgroundColor: '${profile.backgroundColor || '#f8fafc'}' }`;

  // Generate block imports mapping
  const blocksJson = JSON.stringify(
    blocks.map((b) => ({
      ...b,
      imageUrl: b.imageUrl && imageMap[`block_${b.id}`] ? imageMap[`block_${b.id}`] : b.imageUrl,
    }))
  );

  const profileJson = JSON.stringify({
    ...profile,
    avatarUrl: avatarSrc,
  });

  return `import { useState, useEffect, useRef, useCallback } from 'react'
import { Youtube, Play, Loader2 } from 'lucide-react'
import {
  SiX, SiInstagram, SiTiktok, SiYoutube, SiGithub, SiGitlab, SiLinkedin,
  SiFacebook, SiTwitch, SiDribbble, SiMedium, SiDevdotto, SiReddit,
  SiPinterest, SiThreads, SiBluesky, SiMastodon, SiSubstack, SiPatreon,
  SiKofi, SiBuymeacoffee, SiSnapchat, SiDiscord, SiTelegram, SiWhatsapp,
} from 'react-icons/si'
import { Globe, Link as LinkIcon } from 'lucide-react'
import type { IconType } from 'react-icons'
import type { LucideIcon } from 'lucide-react'

// Types
enum BlockType {
  LINK = 'LINK',
  TEXT = 'TEXT',
  MEDIA = 'MEDIA',
  SOCIAL = 'SOCIAL',
  SOCIAL_ICON = 'SOCIAL_ICON',
  MAP = 'MAP',
  SPACER = 'SPACER'
}

type SocialPlatform = 'x' | 'instagram' | 'tiktok' | 'youtube' | 'github' | 'gitlab' | 'linkedin' | 'facebook' | 'twitch' | 'dribbble' | 'medium' | 'devto' | 'reddit' | 'pinterest' | 'threads' | 'bluesky' | 'mastodon' | 'substack' | 'patreon' | 'kofi' | 'buymeacoffee' | 'website' | 'snapchat' | 'discord' | 'telegram' | 'whatsapp' | 'custom'

interface BlockData {
  id: string
  type: BlockType
  title?: string
  content?: string
  subtext?: string
  imageUrl?: string
  mediaPosition?: { x: number; y: number }
  colSpan: number
  rowSpan: number
  color?: string
  customBackground?: string
  textColor?: string
  gridColumn?: number
  gridRow?: number
  channelId?: string
  youtubeVideoId?: string
  channelTitle?: string
  youtubeMode?: 'single' | 'grid' | 'list'
  youtubeVideos?: Array<{ id: string; title: string; thumbnail: string }>
  socialPlatform?: SocialPlatform
  socialHandle?: string
  zIndex?: number
}

// Social platforms config
const SOCIAL_PLATFORMS: Record<string, { icon: IconType | LucideIcon; brandColor: string; buildUrl: (h: string) => string }> = {
  x: { icon: SiX, brandColor: '#000000', buildUrl: (h) => \`https://x.com/\${h}\` },
  instagram: { icon: SiInstagram, brandColor: '#E4405F', buildUrl: (h) => \`https://instagram.com/\${h}\` },
  tiktok: { icon: SiTiktok, brandColor: '#000000', buildUrl: (h) => \`https://tiktok.com/@\${h}\` },
  youtube: { icon: SiYoutube, brandColor: '#FF0000', buildUrl: (h) => \`https://youtube.com/@\${h}\` },
  github: { icon: SiGithub, brandColor: '#181717', buildUrl: (h) => \`https://github.com/\${h}\` },
  gitlab: { icon: SiGitlab, brandColor: '#FC6D26', buildUrl: (h) => \`https://gitlab.com/\${h}\` },
  linkedin: { icon: SiLinkedin, brandColor: '#0A66C2', buildUrl: (h) => \`https://linkedin.com/in/\${h}\` },
  facebook: { icon: SiFacebook, brandColor: '#1877F2', buildUrl: (h) => \`https://facebook.com/\${h}\` },
  twitch: { icon: SiTwitch, brandColor: '#9146FF', buildUrl: (h) => \`https://twitch.tv/\${h}\` },
  dribbble: { icon: SiDribbble, brandColor: '#EA4C89', buildUrl: (h) => \`https://dribbble.com/\${h}\` },
  medium: { icon: SiMedium, brandColor: '#000000', buildUrl: (h) => \`https://medium.com/@\${h}\` },
  devto: { icon: SiDevdotto, brandColor: '#0A0A0A', buildUrl: (h) => \`https://dev.to/\${h}\` },
  reddit: { icon: SiReddit, brandColor: '#FF4500', buildUrl: (h) => \`https://reddit.com/user/\${h}\` },
  pinterest: { icon: SiPinterest, brandColor: '#BD081C', buildUrl: (h) => \`https://pinterest.com/\${h}\` },
  threads: { icon: SiThreads, brandColor: '#000000', buildUrl: (h) => \`https://threads.net/@\${h}\` },
  bluesky: { icon: SiBluesky, brandColor: '#0085FF', buildUrl: (h) => \`https://bsky.app/profile/\${h}\` },
  mastodon: { icon: SiMastodon, brandColor: '#6364FF', buildUrl: (h) => h },
  substack: { icon: SiSubstack, brandColor: '#FF6719', buildUrl: (h) => \`https://\${h}.substack.com\` },
  patreon: { icon: SiPatreon, brandColor: '#FF424D', buildUrl: (h) => \`https://patreon.com/\${h}\` },
  kofi: { icon: SiKofi, brandColor: '#FF5E5B', buildUrl: (h) => \`https://ko-fi.com/\${h}\` },
  buymeacoffee: { icon: SiBuymeacoffee, brandColor: '#FFDD00', buildUrl: (h) => \`https://buymeacoffee.com/\${h}\` },
  snapchat: { icon: SiSnapchat, brandColor: '#FFFC00', buildUrl: (h) => \`https://snapchat.com/add/\${h}\` },
  discord: { icon: SiDiscord, brandColor: '#5865F2', buildUrl: (h) => h },
  telegram: { icon: SiTelegram, brandColor: '#26A5E4', buildUrl: (h) => \`https://t.me/\${h}\` },
  whatsapp: { icon: SiWhatsapp, brandColor: '#25D366', buildUrl: (h) => \`https://wa.me/\${h}\` },
  website: { icon: Globe, brandColor: '#6B7280', buildUrl: (h) => h.startsWith('http') ? h : \`https://\${h}\` },
  custom: { icon: LinkIcon, brandColor: '#6B7280', buildUrl: (h) => h },
}

// Tilt effect hook
const useTiltEffect = (isEnabled = true) => {
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({})
  const elementRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEnabled || !elementRef.current) return
    const rect = elementRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -10
    const rotateY = ((x - centerX) / centerX) * 10
    const glareX = (x / rect.width) * 100
    const glareY = (y / rect.height) * 100
    const shadowX = rotateY * 1.5
    const shadowY = rotateX * -1.5
    setTiltStyle({
      transform: \`perspective(800px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg) scale3d(1.02, 1.02, 1.02)\`,
      boxShadow: \`\${shadowX}px \${shadowY}px 25px rgba(0,0,0,0.15), 0 8px 30px rgba(0,0,0,0.1)\`,
      transition: 'transform 0.1s ease-out, box-shadow 0.1s ease-out',
      '--glare-x': \`\${glareX}%\`,
      '--glare-y': \`\${glareY}%\`,
    } as React.CSSProperties)
  }, [isEnabled])

  const handleMouseLeave = useCallback(() => {
    if (!isEnabled) return
    setTiltStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      transition: 'transform 0.5s ease-out, box-shadow 0.5s ease-out',
    })
  }, [isEnabled])

  return { elementRef, tiltStyle, handleMouseMove, handleMouseLeave }
}

// Block component
const Block = ({ block }: { block: BlockData }) => {
  const { elementRef, tiltStyle, handleMouseMove, handleMouseLeave } = useTiltEffect(true)
  const [videos, setVideos] = useState(block.youtubeVideos || [])
  const [loading, setLoading] = useState(false)
  const mediaPos = block.mediaPosition || { x: 50, y: 50 }

  useEffect(() => {
    if (block.type === BlockType.SOCIAL && block.channelId && !block.youtubeVideos?.length) {
      setLoading(true)
      const rssUrl = \`https://www.youtube.com/feeds/videos.xml?channel_id=\${block.channelId}\`
      const proxyUrl = \`https://api.allorigins.win/raw?url=\${encodeURIComponent(rssUrl)}\`
      fetch(proxyUrl).then(r => r.text()).then(text => {
        const parser = new DOMParser()
        const xml = parser.parseFromString(text, 'text/xml')
        const entries = Array.from(xml.querySelectorAll('entry'))
        const vids = entries.slice(0, 4).map(e => {
          const id = e.getElementsByTagName('yt:videoId')[0]?.textContent || ''
          const title = e.getElementsByTagName('title')[0]?.textContent || ''
          return { id, title, thumbnail: \`https://img.youtube.com/vi/\${id}/mqdefault.jpg\` }
        })
        if (vids.length) setVideos(vids)
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [block.channelId, block.youtubeVideos, block.type])

  const getBorderRadius = () => {
    const minDim = Math.min(block.colSpan, block.rowSpan)
    if (minDim <= 1) return '0.5rem'
    if (minDim <= 2) return '0.625rem'
    if (minDim <= 3) return '0.75rem'
    return '0.875rem'
  }
  const borderRadius = getBorderRadius()

  const gridStyle: React.CSSProperties = {}
  if (block.gridColumn !== undefined) {
    gridStyle.gridColumnStart = block.gridColumn
    gridStyle.gridColumnEnd = block.gridColumn + block.colSpan
  }
  if (block.gridRow !== undefined) {
    gridStyle.gridRowStart = block.gridRow
    gridStyle.gridRowEnd = block.gridRow + block.rowSpan
  }

  const handleClick = () => {
    let url = block.content
    if (block.type === BlockType.SOCIAL && block.socialPlatform && block.socialHandle) {
      url = SOCIAL_PLATFORMS[block.socialPlatform]?.buildUrl(block.socialHandle)
    } else if (block.channelId) {
      url = \`https://youtube.com/channel/\${block.channelId}\`
    }
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const isYoutube = block.type === BlockType.SOCIAL && block.channelId
  const activeVideoId = block.youtubeVideoId || videos[0]?.id
  const isRichYT = isYoutube && activeVideoId && block.youtubeMode !== 'grid' && block.youtubeMode !== 'list'
  const isYTGrid = isYoutube && (block.youtubeMode === 'grid' || block.youtubeMode === 'list')
  const isLinkImg = block.type === BlockType.LINK && block.imageUrl

  if (block.type === BlockType.SPACER) return <div style={{ borderRadius, ...gridStyle }} className="h-full" />

  if (block.type === BlockType.SOCIAL_ICON) {
    const platform = SOCIAL_PLATFORMS[block.socialPlatform || 'custom']
    const Icon = platform?.icon
    const url = block.socialHandle ? platform?.buildUrl(block.socialHandle) : ''
    return (
      <a href={url || undefined} target="_blank" rel="noopener noreferrer" onClick={handleClick}
        className={\`bento-item relative h-full \${block.color || 'bg-white'} flex items-center justify-center shadow-sm border border-gray-100 hover:shadow-md transition-all\`}
        style={{ borderRadius, ...gridStyle, ...(block.customBackground ? { background: block.customBackground } : {}) }}>
        {Icon && <span style={{ color: platform.brandColor }}><Icon size={24} /></span>}
      </a>
    )
  }

  if (isYTGrid) {
    return (
      <div onClick={handleClick} style={{ borderRadius, ...gridStyle, ...(block.customBackground ? { background: block.customBackground } : {}) }}
        className={\`bento-item group cursor-pointer h-full \${block.color || 'bg-white'} ring-1 ring-black/5 shadow-sm hover:shadow-xl transition-all\`}>
        <div className="w-full h-full flex flex-col p-2 md:p-3">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
            <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center"><Youtube size={12} /></div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] md:text-xs font-bold text-gray-900 truncate">{block.channelTitle || 'YouTube'}</h3>
              <span className="text-[8px] text-gray-400">Latest videos</span>
            </div>
          </div>
          {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={16} /></div> : (
            <div className="flex-1 grid grid-cols-2 gap-1 overflow-hidden">
              {videos.slice(0, 4).map((v, i) => (
                <a key={i} href={\`https://youtube.com/watch?v=\${v.id}\`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="relative overflow-hidden rounded bg-gray-100 group/vid">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover/vid:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity">
                      <Play size={10} className="text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  let bgStyle: React.CSSProperties = block.customBackground ? { background: block.customBackground } : {}
  if (isRichYT) bgStyle = { backgroundImage: \`url(https://img.youtube.com/vi/\${activeVideoId}/maxresdefault.jpg)\`, backgroundSize: 'cover', backgroundPosition: 'center' }
  else if (isLinkImg && block.imageUrl) bgStyle = { backgroundImage: \`url(\${block.imageUrl})\`, backgroundSize: 'cover', backgroundPosition: \`\${mediaPos.x}% \${mediaPos.y}%\` }

  return (
    <div onClick={handleClick} style={{ ...gridStyle }} className="cursor-pointer h-full transform-gpu">
      <div ref={elementRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
        style={{ ...bgStyle, borderRadius, ...tiltStyle, width: '100%', height: '100%', transformStyle: 'preserve-3d' }}
        className={\`bento-item group relative overflow-hidden w-full h-full \${!block.customBackground && !isLinkImg && !isRichYT ? (block.color || 'bg-white') : ''} \${block.textColor || 'text-gray-900'} ring-1 ring-black/5 shadow-sm transition-all\`}>
        <div className="absolute inset-0 pointer-events-none z-30 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.25) 0%, transparent 60%)' }} />
        {(isRichYT || isLinkImg) && (block.title || block.subtext) && (
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-0" />
        )}
        <div className="w-full h-full relative z-10">
          {block.type === BlockType.MEDIA && block.imageUrl ? (
            <div className="w-full h-full relative overflow-hidden">
              {/\\.(mp4|webm|ogg|mov)$/i.test(block.imageUrl) ? (
                <video src={block.imageUrl} className="full-img" style={{ objectPosition: \`\${mediaPos.x}% \${mediaPos.y}%\` }} autoPlay loop muted playsInline />
              ) : (
                <img src={block.imageUrl} alt={block.title || ''} className="full-img" style={{ objectPosition: \`\${mediaPos.x}% \${mediaPos.y}%\` }} />
              )}
              {block.title && <div className="media-overlay"><p className="media-title text-sm">{block.title}</p>{block.subtext && <p className="media-subtext">{block.subtext}</p>}</div>}
            </div>
          ) : block.type === BlockType.MAP ? (
            <div className="w-full h-full relative bg-gray-100 overflow-hidden">
              <iframe width="100%" height="100%" className="opacity-95 grayscale-[20%] group-hover:grayscale-0 transition-all"
                src={\`https://maps.google.com/maps?q=\${encodeURIComponent(block.content || 'Paris')}&t=&z=13&ie=UTF8&iwloc=&output=embed\`} loading="lazy" sandbox="allow-scripts allow-same-origin" />
              {block.title && <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent"><p className="font-semibold text-white text-sm">{block.title}</p></div>}
            </div>
          ) : isRichYT ? (
            <div className="w-full h-full relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play size={16} className="text-white ml-0.5" fill="white" />
                </div>
              </div>
              {(block.channelTitle || block.title) && <div className="absolute bottom-0 left-0 right-0 p-3"><h3 className="font-semibold text-white text-sm drop-shadow-lg">{block.channelTitle || block.title}</h3></div>}
            </div>
          ) : (
            <div className="p-3 h-full flex flex-col justify-between">
              {block.type === BlockType.SOCIAL && block.socialPlatform && (() => {
                const platform = SOCIAL_PLATFORMS[block.socialPlatform]
                const Icon = platform?.icon
                return Icon ? (
                  <div className={\`w-7 h-7 rounded-lg flex items-center justify-center \${block.textColor === 'text-white' || isLinkImg ? 'bg-white/20 backdrop-blur-sm' : 'bg-gray-100'}\`}
                    style={{ color: block.textColor === 'text-brand' ? platform.brandColor : undefined }}>
                    <Icon size={14} />
                  </div>
                ) : null
              })()}
              <div className={block.type === BlockType.TEXT ? 'flex flex-col justify-center h-full' : 'mt-auto'}>
                <h3 className={\`font-bold leading-tight \${isLinkImg ? 'text-white drop-shadow-lg' : ''}\`}>{block.title}</h3>
                {block.subtext && <p className={\`text-xs mt-1 \${isLinkImg ? 'text-white/80' : 'opacity-60'}\`}>{block.subtext}</p>}
                {block.type === BlockType.TEXT && block.content && <p className="opacity-70 mt-2 text-sm whitespace-pre-wrap">{block.content}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Profile data
const profile = ${profileJson}
const blocks: BlockData[] = ${blocksJson}

// Analytics hook
const useAnalytics = () => {
  const sessionStart = useRef(Date.now())
  const maxScroll = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0
      maxScroll.current = Math.max(maxScroll.current, scrollPercent)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const config = profile.analytics
    if (!config?.enabled || !config?.supabaseUrl || !config?.anonKey) return

    const getVisitorId = () => {
      let id = localStorage.getItem('_ob_vid')
      if (!id) {
        id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
        localStorage.setItem('_ob_vid', id)
      }
      return id
    }

    const track = async (eventType: string, extra = {}) => {
      const utm = new URLSearchParams(window.location.search)
      const payload = {
        site_id: '${data.profile.analytics?.enabled ? 'SITE_ID' : ''}',
        event_type: eventType,
        visitor_id: getVisitorId(),
        session_id: sessionStart.current.toString(36),
        page_url: window.location.href,
        referrer: document.referrer || null,
        utm_source: utm.get('utm_source'),
        utm_medium: utm.get('utm_medium'),
        utm_campaign: utm.get('utm_campaign'),
        utm_term: utm.get('utm_term'),
        utm_content: utm.get('utm_content'),
        user_agent: navigator.userAgent,
        language: navigator.language,
        screen_w: window.screen?.width,
        screen_h: window.screen?.height,
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...extra,
      }
      const endpoint = config.supabaseUrl.replace(/\\/+$/, '') + '/rest/v1/openbento_analytics_events'
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': config.anonKey!, 'Authorization': 'Bearer ' + config.anonKey, 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    }

    track('page_view')

    const trackEnd = () => {
      const duration = Math.round((Date.now() - sessionStart.current) / 1000)
      track('session_end', { duration_seconds: duration, scroll_depth: maxScroll.current, engaged: duration > 10 && maxScroll.current > 25 })
    }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') trackEnd() })
    window.addEventListener('pagehide', trackEnd)
  }, [])
}

// Sort blocks for mobile
const sortedBlocks = [...blocks].sort((a, b) => {
  const aRow = a.gridRow ?? 999
  const bRow = b.gridRow ?? 999
  const aCol = a.gridColumn ?? 999
  const bCol = b.gridColumn ?? 999
  if (aRow !== bRow) return aRow - bRow
  return aCol - bCol
})

export default function App() {
  useAnalytics()

  const avatarStyle = { borderRadius: '${avatarRadius}', boxShadow: '${avatarShadow}', border: '${avatarBorder}' }
  const bgStyle: React.CSSProperties = ${bgStyle}

  return (
    <div className="min-h-screen font-sans" style={bgStyle}>
      ${profile.backgroundImage && profile.backgroundBlur && profile.backgroundBlur > 0 ? `<div className="fixed inset-0 z-0 pointer-events-none" style={{ backdropFilter: 'blur(${profile.backgroundBlur}px)', WebkitBackdropFilter: 'blur(${profile.backgroundBlur}px)' }} />` : ''}
      <div className="relative z-10">
        {/* Desktop Layout */}
        <div className="hidden lg:flex">
          <div className="fixed left-0 top-0 w-[420px] h-screen flex flex-col justify-center items-start px-12">
            <div className="w-40 h-40 overflow-hidden bg-gray-100 mb-8" style={avatarStyle}>
              <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">{profile.name}</h1>
            <p className="text-base text-gray-500 font-medium whitespace-pre-wrap max-w-xs">{profile.bio}</p>
            ${
              profile.showSocialInHeader && profile.socialAccounts?.length
                ? `
            <div className="flex flex-wrap gap-3 mt-4">
              {profile.socialAccounts?.map((acc: any) => {
                const platform = SOCIAL_PLATFORMS[acc.platform]
                const Icon = platform?.icon
                const url = platform?.buildUrl(acc.handle)
                return (
                  <a key={acc.platform} href={url} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-transform"
                    style={{ color: platform?.brandColor }}>
                    {Icon && <Icon size={20} />}
                  </a>
                )
              })}
            </div>`
                : ''
            }
          </div>
          <div className="ml-[420px] flex-1 p-12">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(9, 1fr)', gridAutoRows: '64px' }}>
              {blocks.map(block => <Block key={block.id} block={block} />)}
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          <div className="p-4 pt-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 mb-4 overflow-hidden bg-gray-100" style={avatarStyle}>
              <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-2">{profile.name}</h1>
            <p className="text-sm text-gray-500 font-medium whitespace-pre-wrap max-w-xs">{profile.bio}</p>
            ${
              profile.showSocialInHeader && profile.socialAccounts?.length
                ? `
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {profile.socialAccounts?.map((acc: any) => {
                const platform = SOCIAL_PLATFORMS[acc.platform]
                const Icon = platform?.icon
                const url = platform?.buildUrl(acc.handle)
                return (
                  <a key={acc.platform} href={url} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:-translate-y-0.5 transition-transform"
                    style={{ color: platform?.brandColor }}>
                    {Icon && <Icon size={20} />}
                  </a>
                )
              })}
            </div>`
                : ''
            }
          </div>
          <div className="p-4">
            <div className="grid gap-5" style={{ gridTemplateColumns: '1fr', gridAutoRows: '64px' }}>
              {sortedBlocks.map(block => (
                <div key={block.id} style={{ gridRow: \`span \${block.rowSpan}\` }}>
                  <Block block={{ ...block, gridColumn: undefined, gridRow: undefined }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        ${
          profile.showBranding !== false
            ? `
        <footer className="w-full py-10 text-center">
          <p className="text-sm text-gray-400 font-medium">
            Made with <span className="text-red-400">♥</span> using{' '}
            <a href="https://github.com/yoanbernabeu/openbento" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-violet-500 transition-colors">OpenBento</a>
          </p>
        </footer>`
            : ''
        }
      </div>
    </div>
  )
}
`;
};

// --- DEPLOYMENT TEMPLATES ---

export type ExportDeploymentTarget =
  | 'vercel'
  | 'netlify'
  | 'github-pages'
  | 'docker'
  | 'vps'
  | 'heroku';

const VERCEL_JSON = `{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
`;

const NETLIFY_TOML = `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

const GITHUB_WORKFLOW_YAML = `name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build
        run: npm run build
        
      - name: Setup Pages
        uses: actions/configure-pages@v5
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'dist'
          
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

const NGINX_CONF = `server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
`;

const DOCKERFILE = `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;

const DOCKERIGNORE = `.git
node_modules
dist
`;

const HEROKU_STATIC_JSON = `{
  "root": "dist/",
  "clean_urls": true,
  "routes": {
    "/**": "index.html"
  }
}
`;

const generateDeployMd = (params: {
  name: string;
  target: ExportDeploymentTarget;
}) => `# Deploy ${params.name}

This is a React/Vite/Tailwind project exported from OpenBento.

## Quick Start

\`\`\`bash
npm install
npm run dev     # Development server
npm run build   # Production build
npm run preview # Preview production build
\`\`\`

## Deployment

### ${params.target.charAt(0).toUpperCase() + params.target.slice(1)}

${
  params.target === 'vercel'
    ? `1. Push to GitHub
2. Import in Vercel
3. Deploy (auto-detected)`
    : ''
}
${
  params.target === 'netlify'
    ? `1. Push to GitHub
2. Import in Netlify
3. Deploy (auto-detected)`
    : ''
}
${
  params.target === 'github-pages'
    ? `1. Push to GitHub
2. Go to Settings → Pages → Source: GitHub Actions
3. The included workflow will auto-deploy`
    : ''
}
${
  params.target === 'docker'
    ? `\`\`\`bash
docker build -t my-bento .
docker run -p 8080:80 my-bento
\`\`\``
    : ''
}
${
  params.target === 'vps'
    ? `1. Copy files to your server
2. Run \`npm install && npm run build\`
3. Configure nginx with the provided config
4. Point nginx root to the \`dist\` folder`
    : ''
}
${
  params.target === 'heroku'
    ? `1. Create Heroku app
2. Add buildpack: \`heroku/nodejs\`
3. Push to Heroku`
    : ''
}

## Files

- \`src/App.tsx\` - Main component with all data embedded
- \`src/index.css\` - Tailwind styles
- \`public/assets/\` - Images (if any)
`;

// --- EXPORT FUNCTION ---

export const exportSite = async (
  data: SiteData,
  opts?: { siteId?: string; deploymentTarget?: ExportDeploymentTarget }
) => {
  const zip = new JSZip();
  const assetsFolder = zip.folder('public/assets');
  const srcFolder = zip.folder('src');
  const imageMap: Record<string, string> = {};

  // Extract base64 images
  if (data.profile.avatarUrl?.startsWith('data:image')) {
    const blob = base64ToBlob(data.profile.avatarUrl);
    if (blob && assetsFolder) {
      assetsFolder.file('avatar.png', blob);
      imageMap['profile_avatar'] = '/assets/avatar.png';
    }
  }
  for (const block of data.blocks) {
    if (block.imageUrl?.startsWith('data:image')) {
      const blob = base64ToBlob(block.imageUrl);
      if (blob && assetsFolder) {
        const filename = `block-${block.id}.png`;
        assetsFolder.file(filename, blob);
        imageMap[`block_${block.id}`] = `/assets/${filename}`;
      }
    }
  }

  const deploymentTarget: ExportDeploymentTarget = opts?.deploymentTarget ?? 'vercel';

  // Root files
  zip.file('package.json', generatePackageJson(data.profile.name));
  zip.file('vite.config.ts', generateViteConfig());
  zip.file('tailwind.config.js', generateTailwindConfig());
  zip.file('postcss.config.js', generatePostCSSConfig());
  zip.file('tsconfig.json', generateTSConfig());
  zip.file('index.html', generateIndexHtml(data.profile.name));
  zip.file('DEPLOY.md', generateDeployMd({ name: data.profile.name, target: deploymentTarget }));

  // Src files
  srcFolder?.file('main.tsx', generateMainTsx());
  srcFolder?.file('index.css', generateIndexCSS());
  srcFolder?.file('App.tsx', generateAppTsx(data, imageMap));

  // Deployment configs
  switch (deploymentTarget) {
    case 'vercel':
      zip.file('vercel.json', VERCEL_JSON);
      break;
    case 'netlify':
      zip.file('netlify.toml', NETLIFY_TOML);
      break;
    case 'github-pages':
      zip.file('.github/workflows/deploy.yml', GITHUB_WORKFLOW_YAML);
      break;
    case 'docker':
      zip.file('Dockerfile', DOCKERFILE);
      zip.file('nginx.conf', NGINX_CONF);
      zip.file('.dockerignore', DOCKERIGNORE);
      break;
    case 'vps':
      zip.file('nginx.conf', NGINX_CONF.replace('/usr/share/nginx/html', '/var/www/bento/dist'));
      break;
    case 'heroku':
      zip.file('static.json', HEROKU_STATIC_JSON);
      break;
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(
    content,
    `${data.profile.name.replace(/\s+/g, '-').toLowerCase()}-bento-${deploymentTarget}.zip`
  );
};

// Keep for backward compatibility with PreviewPage
export const generatePreviewSrcDoc = (data: SiteData, opts?: { siteId?: string }): string => {
  // Return empty - will be removed when PreviewPage is refactored
  return '';
};
