'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TOTAL = 3

export default function WelcomePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  return (
    <div className="welcome-root">
      {/* Progress bar */}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${((step + 1) / TOTAL) * 100}%` }} />
      </div>

      <div className="welcome-inner">
        {/* Top row */}
        <div className="top-row">
          <span className="step-label">
            {step === 0 ? 'Getting started' : step === 1 ? 'Logging food' : 'Tracking progress'}
          </span>
          <span className="step-counter">{step + 1} / {TOTAL}</span>
        </div>

        {/* Heading */}
        <div className="heading-block" key={`h-${step}`}>
          <h1 className="heading">
            {step === 0 ? <>Three habits.<br />That&apos;s it.</> : step === 1 ? <>4 ways<br />to log.</> : <>Weigh in.<br />Report weekly.</>}
          </h1>
          <p className="subheading">
            {step === 0
              ? 'No calorie counting. No barcodes. Just log, weigh, and check in weekly.'
              : step === 1
              ? 'Pick whatever feels fastest — any log is better than no log.'
              : 'Daily data builds the picture. Weekly reports tell you what to fix.'}
          </p>
        </div>

        {/* Content */}
        <div className="content-block" key={`c-${step}`}>

          {step === 0 && (
            <div className="stack">
              {[
                { icon: '🍽️', label: 'Log meals', desc: 'After each meal — text, voice, photo, or label scan. Takes under 10 seconds.' },
                { icon: '⚖️', label: 'Weigh in daily', desc: 'First thing every morning. Same time. One number.' },
                { icon: '📊', label: 'Weekly report', desc: 'Check in every Sunday — 4 questions and you get a full breakdown of your progress.' },
              ].map((item, i) => (
                <div key={i} className="row-card" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="icon-box">{item.icon}</div>
                  <div>
                    <p className="card-title">{item.label}</p>
                    <p className="card-body">{item.desc}</p>
                  </div>
                </div>
              ))}
              <div className="insight-card" style={{ animationDelay: '260ms' }}>
                <p className="insight-title">Consistency beats perfection</p>
                <p className="insight-body">An imperfect log every day beats a perfect log twice a week.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="stack">
              <div className="methods-grid">
                {[
                  { icon: '✏️', label: 'Text', desc: 'Describe in plain English' },
                  { icon: '🎙️', label: 'Voice', desc: 'Speak your meal out loud' },
                  { icon: '📷', label: 'Photo', desc: 'Snap a picture of your food' },
                  { icon: '🔲', label: 'Label scan', desc: 'Photograph a nutrition label' },
                ].map((m, i) => (
                  <div key={m.label} className="method-card" style={{ animationDelay: `${i * 70}ms` }}>
                    <span className="method-icon">{m.icon}</span>
                    <p className="method-label">{m.label}</p>
                    <p className="method-desc">{m.desc}</p>
                  </div>
                ))}
              </div>
              <div className="tip-row" style={{ animationDelay: '310ms' }}>
                <div className="tip-dot" />
                <p className="tip-text"><strong>Log right after eating</strong> — portions are freshest in memory immediately after a meal.</p>
              </div>
              <div className="tip-row" style={{ animationDelay: '370ms' }}>
                <div className="tip-dot" />
                <p className="tip-text"><strong>Every entry is editable</strong> — log fast, adjust the numbers later if needed.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="stack">
              <div className="section-card" style={{ animationDelay: '0ms' }}>
                <div className="section-header">
                  <span className="section-icon">⚖️</span>
                  <p className="section-title">Daily weigh-in</p>
                </div>
                {[
                  'Same time every morning — right after waking up',
                  'After bathroom, before eating or drinking',
                  "Ignore daily swings. The weekly trend is what matters.",
                ].map((r, i) => (
                  <div key={i} className="bullet-row">
                    <div className="bullet" />
                    <p className="bullet-text">{r}</p>
                  </div>
                ))}
              </div>
              <div className="section-card" style={{ animationDelay: '90ms' }}>
                <div className="section-header">
                  <span className="section-icon">📊</span>
                  <p className="section-title">Weekly report</p>
                </div>
                {[
                  'Check in every Sunday — 4 questions, 30 seconds',
                  'Connects your food data, weight trend, and how you felt',
                  'One specific action to take next week — that&apos;s all you need to read',
                ].map((r, i) => (
                  <div key={i} className="bullet-row">
                    <div className="bullet" />
                    <p className="bullet-text" dangerouslySetInnerHTML={{ __html: r }} />
                  </div>
                ))}
              </div>
              <div className="dark-card" style={{ animationDelay: '170ms' }}>
                <p className="dark-title">Daily numbers are noisy</p>
                <p className="dark-body">Log consistently, check in Sunday, and let the report tell you what to adjust.</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="nav-row">
          {step > 0 && (
            <button className="btn-back" onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          <button
            className="btn-next"
            onClick={() => step === TOTAL - 1 ? router.push('/home') : setStep(s => s + 1)}>
            {step === TOTAL - 1 ? 'Start tracking' : 'Next'} →
          </button>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .welcome-root {
          min-height: 100svh;
          background: #f8f7f4;
          display: flex;
          flex-direction: column;
          font-family: 'DM Sans', sans-serif;
        }
        .progress-track {
          height: 3px;
          background: #e5e5e0;
        }
        .progress-fill {
          height: 100%;
          background: #059669;
          transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .welcome-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 390px;
          margin: 0 auto;
          width: 100%;
          padding: 28px 20px 24px;
        }
        .top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .step-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #059669;
        }
        .step-counter {
          font-size: 12px;
          font-weight: 600;
          color: #c4c4bc;
        }
        .heading-block {
          margin-bottom: 24px;
          animation: fadeUp 0.4s ease both;
        }
        .heading {
          font-family: 'Instrument Serif', serif;
          font-size: 42px;
          line-height: 1.05;
          color: #0f0f0e;
          letter-spacing: -0.01em;
          margin-bottom: 10px;
        }
        .subheading {
          font-size: 14px;
          color: #828276;
          line-height: 1.6;
        }
        .content-block {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .stack { display: flex; flex-direction: column; gap: 10px; }

        /* Step 1 — row cards */
        .row-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: white;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03);
          animation: fadeUp 0.4s ease both;
        }
        .icon-box {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          background: #f0fdf4;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .card-title { font-size: 14px; font-weight: 700; color: #0f0f0e; }
        .card-body  { font-size: 12px; color: #9b9b93; margin-top: 3px; line-height: 1.55; }
        .insight-card {
          background: #0f0f0e;
          border-radius: 16px;
          padding: 18px;
          animation: fadeUp 0.4s ease both;
        }
        .insight-title { font-size: 13px; font-weight: 700; color: white; }
        .insight-body  { font-size: 12px; color: #6b6b63; margin-top: 4px; line-height: 1.5; }

        /* Step 2 — methods grid */
        .methods-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .method-card {
          background: white;
          border-radius: 16px;
          padding: 16px 14px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03);
          animation: fadeUp 0.38s ease both;
        }
        .method-icon  { font-size: 22px; display: block; margin-bottom: 10px; }
        .method-label { font-size: 13px; font-weight: 700; color: #0f0f0e; }
        .method-desc  { font-size: 11px; color: #9b9b93; margin-top: 3px; line-height: 1.45; }
        .tip-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          animation: fadeUp 0.38s ease both;
        }
        .tip-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #059669;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .tip-text { font-size: 12px; color: #828276; line-height: 1.55; }
        .tip-text strong { color: #0f0f0e; font-weight: 600; }

        /* Step 3 — section cards */
        .section-card {
          background: white;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03);
          animation: fadeUp 0.4s ease both;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .section-icon  { font-size: 18px; }
        .section-title { font-size: 14px; font-weight: 700; color: #0f0f0e; }
        .bullet-row {
          display: flex;
          gap: 10px;
          margin-bottom: 8px;
        }
        .bullet-row:last-child { margin-bottom: 0; }
        .bullet {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #059669;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .bullet-text { font-size: 12px; color: #828276; line-height: 1.55; }
        .dark-card {
          background: #0f0f0e;
          border-radius: 16px;
          padding: 18px;
          animation: fadeUp 0.4s ease both;
        }
        .dark-title { font-size: 13px; font-weight: 700; color: white; }
        .dark-body  { font-size: 12px; color: #6b6b63; margin-top: 4px; line-height: 1.5; }

        /* Nav */
        .nav-row {
          display: flex;
          gap: 10px;
          margin-top: 24px;
        }
        .btn-back {
          padding: 14px 20px;
          border-radius: 14px;
          border: 1.5px solid #e5e5e0;
          background: white;
          font-size: 14px;
          font-weight: 600;
          color: #828276;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.15s;
        }
        .btn-back:hover { background: #f4f3f0; }
        .btn-next {
          flex: 1;
          background: #059669;
          color: white;
          font-weight: 700;
          padding: 14px 24px;
          border-radius: 14px;
          font-size: 14px;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.15s;
        }
        .btn-next:hover { background: #047857; }
      `}</style>
    </div>
  )
}
