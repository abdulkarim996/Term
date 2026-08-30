const fs = require('fs');

const original = fs.readFileSync('src/components/ai/AIScreen.tsx', 'utf8');
const top = fs.readFileSync('top.txt', 'utf8');

const returnIndex = original.indexOf('  return (');
if (returnIndex === -1) throw new Error('return not found');

let bottom = original.substring(returnIndex);

// Clean up any remaining ? or mojibake in bottom
bottom = bottom.replace(/\?\?\?/g, ''); // just remove these for now or replace with correct Arabic
// Let's replace the known corrupted strings in JSX
bottom = bottom.replace(/<h2.*?<\/h2>/, '<h2 className="text-lg font-bold ai-gradient-text mb-1">مرحباً!</h2>');
bottom = bottom.replace(/<p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">[\s\S]*?<\/p>/, '<p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">أنا هنا لمساعدتك. أستطيع قراءة <span className="text-accent-green font-medium">مهامك</span>، و<span className="text-accent-yellow font-medium">أحداثك</span>، و<span className="text-accent-blue font-medium">ملفاتك</span>.</p>');

bottom = bottom.replace(/<span className="text-\[10px\] text-text-muted">.*?<\/span>/, '<span className="text-[10px] text-text-muted">السياق:</span>');
bottom = bottom.replace(/<span className="text-\[10px\] text-accent-green">.*?<\/span>/, '<span className="text-[10px] text-accent-green">المهام القادمة</span>');
bottom = bottom.replace(/<span className="text-\[10px\] text-accent-yellow">.*?<\/span>/, '<span className="text-[10px] text-accent-yellow">الأحداث والامتحانات</span>');
bottom = bottom.replace(/<span className="text-\[10px\] text-accent-blue">.*?<\/span>/, '<span className="text-[10px] text-accent-blue">المحتوى الدراسي</span>');

bottom = bottom.replace(/<Calendar size=\{11\} \/>.*?<\/span>/, '<Calendar size={11} /> المهام</span>');
bottom = bottom.replace(/<CheckSquare size=\{11\} \/>.*?<\/span>/, '<CheckSquare size={11} /> الاختبارات</span>');
bottom = bottom.replace(/<BookOpen size=\{11\} \/> \{driveFilesCount\}.*?<\/span>/, '<BookOpen size={11} /> {driveFilesCount} ملفات</span>');

bottom = bottom.replace(/Enter .*? Shift\+Enter .*?<\/div>/, 'Enter للإرسال أو Shift+Enter لسطر جديد</div>');
bottom = bottom.replace(/placeholder=".*?"/, 'placeholder="اسأل مساعد الذكاء الاصطناعي..."');

// Also clearChat is missing, let's add it between top and bottom
const middle = \
  const clearChat = async () => {
    if (window.confirm('هل أنت متأكد من مسح المحادثة؟')) {
      await db.messages.where('sessionId').equals(currentSessionId).delete()
      await db.chatSessions.delete(currentSessionId)
      createNewSession()
    }
  }

  const hasMessages = messages && messages.length > 0

  const sendMessage = async (text: string = input) => {
    if (!text.trim() || loading) return
    if (!geminiApiKey) {
      showToast('الرجاء إضافة مفتاح API الخاص بـ Gemini أولاً', 'error')
      setActiveTab('more')
      return
    }

    const userMsgText = text.trim()

    if (!hasMessages) {
      const title = userMsgText.length > 25 ? userMsgText.substring(0, 25) + '...' : userMsgText
      await ensureSessionExists(title)
    } else {
      await ensureSessionExists()
    }

    const userMsg = {
      role: 'user',
      content: userMsgText,
      timestamp: Date.now(),
      sessionId: currentSessionId,
    }

    await db.messages.add(userMsg)
    setInput('')
    setLoading(true)

    try {
      const context = await buildFullContext()

      const history = (messages || []).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        systemInstruction: \\\أنت مساعد ذكي للمهام والدراسة. استخدم المعلومات التالية في إجاباتك إن لزم الأمر.

\

تعليمات:
- كن موجزاً ومباشراً قدر الإمكان ما لم يطلب المستخدم التفاصيل
- لغتك الأساسية هي العربية، لكن أجب بلغة المستخدم إذا استخدم لغة أخرى
- إذا سأل المستخدم عن مهامه أو جدوله، أجب بناءً على المعلومات المقدمة
- لا تذكر أنك "ذكاء اصطناعي". استخدم الـ emoji بحرية.\\\,
      })

      const chat = model.startChat({ history })
      const result = await chat.sendMessageStream(userMsgText)
      
      let fullText = ''
      for await (const chunk of result.stream) {
        fullText += chunk.text()
        setStreamingMessage(fullText)
      }

      await db.messages.add({
        role: 'assistant',
        content: fullText,
        timestamp: Date.now(),
        sessionId: currentSessionId,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await db.messages.add({
        role: 'assistant',
        content: 'Error: ' + msg,
        timestamp: Date.now(),
        sessionId: currentSessionId,
      })
    } finally {
      setLoading(false)
      setStreamingMessage('')
    }
  }

  const currentSession = sessions.find(s => s.id === currentSessionId)

\;

const fullFile = top + middle + bottom;
fs.writeFileSync('src/components/ai/AIScreen.tsx', fullFile);
console.log('Fixed AIScreen.tsx');
