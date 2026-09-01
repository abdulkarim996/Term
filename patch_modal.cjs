const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(
  /\.modal-overlay \{[\s\S]*?\}/,
  \.modal-overlay {
  @apply fixed inset-0 z-50 flex justify-center;
  align-items: flex-start;
  padding-top: 2rem;
  padding-bottom: 2rem;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}\
);

css = css.replace(
  /max-height: 90vh;/g,
  '/* max-height removed to allow overlay scrolling */'
);

fs.writeFileSync('src/index.css', css);

