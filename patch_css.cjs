const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(
  /\/\* Modal overlay \*\/[\s\S]*?\.modal-content \{[\s\S]*?\}/,
  \/* Modal overlay */
.modal-overlay {
  @apply fixed inset-0 z-50 overflow-y-auto overflow-x-hidden;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.modal-content {
  @apply glass-card w-full animate-slide-up bg-surface;
}\
);

fs.writeFileSync('src/index.css', css);
