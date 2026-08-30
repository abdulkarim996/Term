const fs = require('fs');
let c = fs.readFileSync('src/components/ai/AIScreen.tsx', 'utf8');
const start = c.indexOf('const sendMessage = async (prompt?: string) => {');
const end = c.indexOf('const clearChat = async () => {');

const replacement = `const sendMessage = async (prompt?: string) => {
    if (!geminiApiKey) {
      showToast('الرجاء إٶافة مفتاح API الخاص بـ Gemini أولا', 'error')
      setActiveTab('more')
      return
    }
    const userMsgText = prompt || input.trim()
    if (!userMsgText) return
    const userMsg: ChatMessage = {
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
      const history = (messages ?? []).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        systemInstruction: \\`اٌت مساعد کكي للمهام والدراسة. استخدم المعلومات التالية في إجاباتك ان لزم الأمر.\n\n${context}\n\nتعليمات:\n- كن موججا'\ ومباشرا\' قدر المكان ما لم يطلب المستخدم التفاصيل\n- لغتك الأساسية هي العربيةΌ Ʉكن أجب بلغة المستخدم إٰا استخدم لغة أخرً\n- ԧٴا سأل المعتخدم عن مهامه أو جدولهΌ أجب بناءд علو المعلومات المقدمة\n- لا تذكر أنك \"잁이 اصطناعو\". استخدم ال- emoji بحرية.\\`,
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await db.messages.add({
        role: 'assistant',
        content: `Error: ${msg}`,
        timestamp: Date.now(),
        sessionId: currentSessionId,
      })
    } finally {
      setLoading(false)
      setStreamingMessage('')
    }
  }
  `;
c = c.substring(0, start) + replacement + c.substring(end);
fs.writeFileSync('src/components/ai/AIScreen.tsx', c);
