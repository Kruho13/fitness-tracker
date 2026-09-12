'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send } from 'lucide-react'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  "How's my week looking?",
  'Am I hitting my protein goal?',
  "What's been my biggest treat food?",
  "How's my vitamin D intake?",
]

export default function AskPulsePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    const history = messages
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/ask-pulse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setError('Failed to get a response. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="px-5 pt-8 pb-6" style={{ background: 'linear-gradient(160deg, #111110 0%, #1C1C1A 100%)' }}>
        <p className="text-neutral-500 text-xs font-semibold uppercase tracking-widest mb-1">Ask Pulse</p>
        <p className="text-white font-bold text-2xl leading-tight" style={{ fontFamily: 'var(--font-bricolage)' }}>
          Ask about your data
        </p>
        <p className="text-neutral-500 text-sm mt-1">Nutrition, weight, and progress — grounded in what you&apos;ve logged</p>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 flex gap-3" style={{ boxShadow: 'var(--card-shadow)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
                <Sparkles size={15} className="text-white" />
              </div>
              <p className="text-neutral-600 text-sm leading-relaxed">
                Ask me anything about your logged food, weight trend, or weekly balance — I&apos;ll only answer from your own data. Estimates, not lab measurements.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs font-medium text-neutral-600 bg-white border border-neutral-200 rounded-full px-3.5 py-2 hover:bg-neutral-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-md'
                  : 'bg-white text-neutral-700 rounded-bl-md'
              }`}
              style={m.role === 'assistant' ? { boxShadow: 'var(--card-shadow-sm)' } : undefined}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 flex gap-1" style={{ boxShadow: 'var(--card-shadow-sm)' }}>
              <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-[bounce_1s_ease-in-out_0s_infinite]" />
              <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
              <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={e => { e.preventDefault(); sendMessage(input) }}
        className="sticky bottom-16 px-4 py-3 flex gap-2 bg-white/95 backdrop-blur border-t border-neutral-100"
      >
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          placeholder="Ask about your nutrition or progress..."
          rows={1}
          className="flex-1 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-11 h-11 shrink-0 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  )
}
