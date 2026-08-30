const fs = require('fs');
let c = fs.readFileSync('src/components/ai/AIScreen.tsx', 'utf8');

// Fix props
c = c.replace('interface AIScreenProps {\\n  geminiApiKey: string | null\\n  setActiveTab: (tab: \\'tasks\\' | \\'calendar\\' | \\'study\\' | \\'ai\\' | \\'more\\') => void\\n  showToast: (msg: string, type: \\'success\\' | \\'error\\') => void\\n}\\n\\nexport default function AIScreen({ geminiApiKey, setActiveTab, showToast }: AIScreenProps) {', 'export default function AIScreen() {');

// Add geminiApiKey from db
c = c.replace('const [streamingMessage, setStreamingMessage] = useState(\\'\\')', 'const [streamingMessage, setStreamingMessage] = useState(\\'\\')\\n\\n  const settings = useLiveQuery(() => db.settings.toArray())\\n  const geminiApiKey = settings?.[0]?.geminiApiKey');

// Fix db.driveFiles
c = c.replace('db.studyFiles.where(\\'source\\').equals(\\'drive\\')', 'db.driveFiles');

// Fix ChatSession updatedAt missing
c = c.replace('createdAt: Date.now()\\n    })', 'createdAt: Date.now(), updatedAt: Date.now()\\n    })');
c = c.replace('createdAt: Date.now()\\n      })', 'createdAt: Date.now(), updatedAt: Date.now()\\n      })');
c = c.replace('{ title }', '{ title, updatedAt: Date.now() }');

// Fix Task status
c = c.replace('t.status', 't.completed ? \\'مكتملة\\' : \\'غير مكتملة\\'');

// Fix Event date
c = c.replace('e.date', 'new Date(e.startDate).toLocaleString()');

// Fix getTaskAttachments
c = c.replace('import { getTaskAttachments } from \\'../../lib/syncEngine\\'', '');

// Fix showToast and setActiveTab missing (since we removed them from props)
c = c.replace(/showToast\\('.*?'\\, 'error'\\)/, 'alert(\\'الرجاء إضافة مفتاح API الخاص بـ Gemini من الإعدادات\\')');
c = c.replace('setActiveTab(\\'more\\')', '');

fs.writeFileSync('src/components/ai/AIScreen.tsx', c);
