import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1c29" />
      <stop offset="100%" stop-color="#10111a" />
    </linearGradient>
    <linearGradient id="t-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f8ef7" />
      <stop offset="100%" stop-color="#9b7bea" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  
  <!-- Inner subtle border -->
  <rect width="508" height="508" x="2" y="2" rx="110" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="4" />
  
  <!-- The T Letter -->
  <g filter="url(#glow)">
    <path d="M150 160 h 212 c 12 0 20 8 20 20 v 30 c 0 12 -8 20 -20 20 h -76 v 150 c 0 12 -8 20 -20 20 h -40 c -12 0 -20 -8 -20 -20 v -150 h -56 c -12 0 -20 -8 -20 -20 v -30 c 0 -12 8 -20 20 -20 z" fill="url(#t-grad)" />
    <!-- Arabic text تِرْم small at bottom -->
    <text x="256" y="420" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" fill="rgba(255,255,255,0.7)" text-anchor="middle" letter-spacing="4">تِـرْم</text>
  </g>
</svg>
`;

async function generate() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const sizes = [
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 }
  ];

  for (const s of sizes) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; background: transparent; }
          svg { width: ${s.size}px; height: ${s.size}px; }
        </style>
      </head>
      <body>
        ${svg.replace(/width="512" height="512"/, `width="${s.size}" height="${s.size}"`)}
      </body>
      </html>
    `;
    
    await page.setViewport({ width: s.size, height: s.size, deviceScaleFactor: 1 });
    await page.setContent(html);
    const el = await page.$('svg');
    await el.screenshot({ 
      path: path.join('public', s.name), 
      omitBackground: true 
    });
    console.log('Generated', s.name);
  }
  
  await browser.close();
}

generate().catch(console.error);
