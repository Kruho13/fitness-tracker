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
        {[
          { step: '1', label: 'Log food in plain text', detail: 'Describe what you ate — AI estimates the macros instantly.' },
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
    heading: 'Be specific.\nGet accuracy.',
    subheading: null,
    content: (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-amber-800 text-sm font-bold mb-1">This is the most important thing in this app.</p>
          <p className="text-amber-700 text-xs leading-relaxed">
            The AI estimates macros based on what you describe. The more specific your description, the more accurate the result. Vague inputs produce vague estimates.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Do this</p>
          {[
            '200g grilled chicken breast, 1 cup cooked jasmine rice, 1 tbsp olive oil',
            '2 large eggs scrambled, 2 slices whole wheat toast with 1 tbsp butter',
            '1 scoop whey protein (30g) in 300ml whole milk',
          ].map(ex => (
            <div key={ex} className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <p className="text-emerald-800 text-xs leading-relaxed">"{ex}"</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Not this</p>
          {[
            'some chicken and rice',
            'eggs and toast',
            'protein shake',
          ].map(ex => (
            <div key={ex} className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <p className="text-red-700 text-xs">"{ex}" — too vague, AI will guess broadly</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-neutral-800 mb-1">Log multiple items at once</p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            You can describe an entire meal in one entry. The AI breaks it into individual items so you can see each component.
          </p>
        </div>
      </div>
    ),
  },
  {
    tag: 'Portions & Estimates',
    heading: 'Weigh it once.\nEstimate forever.',
    subheading: 'You don\'t need to weigh everything forever — but doing it early builds calibration.',
    content: (
      <div className="space-y-3">
        {[
          {
            title: 'Use a food scale when you can',
            body: 'Grams are always more accurate than visual estimates. A $10 kitchen scale is the single best investment for logging accuracy.',
          },
          {
            title: 'Use measurements as a fallback',
            body: '1 cup, 1 tbsp, 1 scoop — these give the AI enough to work with when you can\'t weigh. Always better than "some" or "a bit".',
          },
          {
            title: 'Include cooking method',
            body: '"Grilled", "fried in oil", "baked" — matters for calories. Frying adds fat; steaming doesn\'t.',
          },
          {
            title: 'Save your common meals',
            body: 'After logging a meal a few times, hit "Save as meal". Next time you log it, one tap adds it instantly — no re-describing.',
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
