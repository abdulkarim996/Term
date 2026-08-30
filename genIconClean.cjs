const puppeteer = require('puppeteer');
const fs = require('fs');

async function generateIcon(size, filename, isApple = false) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle at 30% 30%, #2a2d42 0%, #13141C 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .t-icon {
            font-size: ${size * 0.65}px;
            font-weight: 800;
            background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 4px 12px rgba(167, 139, 250, 0.4));
            line-height: 1;
            margin-top: -${size * 0.05}px; /* Optical center tweak */
          }
        </style>
      </head>
      <body>
        <div class="t-icon">T</div>
      </body>
    </html>
  `;

  await page.setContent(html);
  await page.screenshot({ path: 'public/' + filename, omitBackground: true });
  await browser.close();
  console.log('Generated ' + filename);
}

async function run() {
  await generateIcon(180, 'apple-touch-icon.png', true);
  await generateIcon(192, 'icon-192.png');
  await generateIcon(512, 'icon-512.png');
}

run();
