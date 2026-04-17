'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const STEPS = [
  {
    tag: 'Welcome to Pulse',
    heading: 'Track less.\nLearn more.',
    subheading: 'Pulse is built for intermediate lifters who want useful signal — not another app to babysit.',
    content: (
      <div className="space-y-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-emerald-900 font-semibold text-sm">Consistency beats perfection</p>
          <p className="text-emerald-700 text-xs mt-1 leading-relaxed">An imperfect log every day beats a perfect log twice a week. Your weight trend over time is the real signal — individual estimates don&apos;t need to be exact.</p>
        </div>
        {[
          { step: '1', label: 'Log food in plain text', detail: 'Describe what you ate — AI estimates the macros instantly. Any description is better than nothing.' },
          { step: '2', label: 'Log your weight daily', detail: 'First thing every morning. 10 seconds. Builds your trend line.' },
          { step: '3', label: 'Complete the Sunday check-in', detail: '4 quick questions. Pulse generates a plain-English weekly report.' },
        ].map(({ step, label, detail }) => (
          <div key={step} className="flex gap-3.5 bg-white border border-neutral-200 rounded-2xl p-4">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</div>
            <div>
              <p className="text-sm font-semibold text-neutral-800">{label}</p>
              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: 'Food Logging',
    heading: 'Log it fast.\nEdit if needed.',
    subheading: null,
    content: (
      <div className="space-y-3">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
          {[
            { label: 'Quick & vague', example: '"big mac and fries"', note: 'works fine — log it and move on' },
            { label: 'More detail', example: '"200g grilled chicken, 1 cup rice"', note: 'better accuracy' },
            { label: 'Packaged foods', example: '"Oikos yogurt, 130 cal, 20g protein"', note: 'add the label numbers for exact values' },
            { label: 'Photo', example: 'Tap the camera icon', note: 'snap your plate and AI reads it' },
          ].map(({ label, example, note }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <span className="text-neutral-500 text-xs">{label} — </span>
                <span className="text-neutral-800 text-xs font-medium">{example}</span>
                <p className="text-neutral-400 text-xs mt-0.5">{note}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-neutral-800 mb-1">Every entry is editable</p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Not happy with an estimate? Tap any logged item to adjust the numbers manually. Log fast, refine later.
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-neutral-800 mb-1">Save meals you repeat</p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Log something 3 times and Pulse will suggest saving it. One tap to add it next time — no re-describing.
          </p>
        </div>
      </div>
    ),
  },
  {
    tag: 'Portions & Estimates',
    heading: 'Log as you go.\nNot at the end.',
    subheading: 'You\'ll remember portions more accurately right after eating.',
    content: (
      <div className="space-y-3">
        {[
          {
            title: 'Log right after eating',
            body: 'Waiting until end of day means forgotten meals and guessed portions. 30 seconds after each meal keeps it accurate.',
          },
          {
            title: 'Use a food scale when you can',
            body: 'Grams beat visual estimates every time. A $10 kitchen scale is the single best investment for accuracy.',
          },
          {
            title: 'Use measurements as a fallback',
            body: '1 cup, 1 tbsp, 1 scoop — always better than "some" or "a bit". Give the AI something to work with.',
          },
          {
            title: 'Include cooking method',
            body: '"Grilled", "fried in oil", "baked" — matters for calories. Frying adds fat; steaming doesn\'t.',
          },
        ].map(({ title, body }) => (
          <div key={title} className="bg-white border border-neutral-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-neutral-800">{title}</p>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: 'Weight & Reports',
    heading: 'Weigh daily.\nReport weekly.',
    subheading: null,
    content: (
      <div className="space-y-3">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-neutral-800">Daily weigh-in rules</p>
          {[
            'Same time every day — first thing after waking up',
            'After using the bathroom, before eating or drinking',
            'Don\'t panic at daily fluctuations — water, sodium, and sleep affect the scale. The weekly trend is what matters.',
          ].map(rule => (
            <div key={rule} className="flex gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <p className="text-xs text-neutral-500 leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-neutral-800">The weekly report</p>
          {[
            'Complete the check-in every Sunday — 4 questions, takes 30 seconds',
            'The report connects your food data, weight change, and how you felt that week',
            'One specific action to take next week — that\'s the only thing you need to read',
          ].map(rule => (
            <div key={rule} className="flex gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <p className="text-xs text-neutral-500 leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-emerald-800">Daily numbers are noisy.</p>
          <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
            Don't obsess over a single day. Log consistently, check-in Sunday, and let the report tell you what to adjust.
          </p>
        </div>
      </div>
    ),
  },
]

export default function WelcomePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <div className="max-w-sm mx-auto w-full flex-1 flex flex-col px-4 pt-8 pb-6">

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'bg-emerald-500 w-6' : i < step ? 'bg-emerald-300 w-3' : 'bg-neutral-200 w-3'}`} />
          ))}
        </div>

        {/* Header */}
        <div className="mb-5">
          <p className="text-emerald-600 text-xs font-semibold uppercase tracking-widest mb-2">{current.tag}</p>
          <h1 className="text-3xl font-bold text-neutral-900 leading-tight whitespace-pre-line">{current.heading}</h1>
          {current.subheading && (
            <p className="text-neutral-400 text-sm mt-2 leading-relaxed">{current.subheading}</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{current.content}</div>

        {/* Navigation */}
        <div className="flex gap-2 mt-6">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-3.5 border border-neutral-200 rounded-2xl text-sm font-semibold text-neutral-500 hover:bg-neutral-100 transition-colors">
              Back
            </button>
          )}
          <button
            onClick={() => isLast ? router.push('/home') : setStep(s => s + 1)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
            {isLast ? 'Start tracking' : 'Next'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
