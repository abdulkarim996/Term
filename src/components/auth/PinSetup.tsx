import { useTranslation } from '../../hooks/useTranslation'
// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { Lock, Delete } from 'lucide-react'
import { setUserPinHash } from '../../lib/firestore'

interface Props {
  uid: string
  onComplete: () => void
}

// SHA-256 hash helper
async function hashCode(code: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Pre-compute the expected hash at module level (computed once)
// The access code owner has set this to a specific 6-digit value
const EXPECTED_HASH = (async () => hashCode('137013'))()

export default function PinSetup({ uid, onComplete }: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [shake, setShake] = useState(false)

  // Lockout state
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [lockTimeLeft, setLockTimeLeft] = useState(0)

  useEffect(() => {
    if (!lockedUntil) return
    const interval = setInterval(() => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (left <= 0) {
        setLockedUntil(null)
        setLockTimeLeft(0)
      } else {
        setLockTimeLeft(left)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  const isLocked = lockedUntil !== null && lockedUntil > Date.now()

  const handleDigit = (d: string) => {
  const { t } = useTranslation();
    if (isLocked || checking) return
    if (input.length >= 6) return
    const next = input + d
    setInput(next)
    setError('')
    if (next.length === 6) {
      setTimeout(() => verify(next), 150)
    }
  }

  const handleDelete = () => {
    if (isLocked || checking) return
    setInput(prev => prev.slice(0, -1))
    setError('')
  }

  const verify = async (code: string) => {
    setChecking(true)
    const hash = await hashCode(code)
    const expected = await EXPECTED_HASH

    if (hash === expected) {
      // Correct! Save verification to Firestore so user never sees this again
      await setUserPinHash(uid, hash) // reuse pinHash field to store verification
      onComplete()
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setInput('')
      setShake(true)
      setTimeout(() => setShake(false), 600)

      if (newAttempts % 5 === 0) {
        const lockMinutes = 5 * Math.pow(2, Math.floor(newAttempts / 5) - 1)
        setLockedUntil(Date.now() + lockMinutes * 60 * 1000)
        setError(`{t('wrongCode')}. {t('lockedFor')} ${lockMinutes} {t('minute')}`)
      } else {
        const remaining = 5 - (newAttempts % 5)
        setError(`{t('wrongCode')}. ${remaining} {t('attemptsBeforeLock')}`)
      }
    }
    setChecking(false)
  }

  const digits = ['1','2','3','4','5','6','7','8','9','','0','del']

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center">
            <Lock size={32} className="text-accent-blue" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-text-primary text-center mb-2">{t('passcode')}</h1>
        <p className="text-sm text-text-muted text-center mb-8">
          {t('enterPasscode')} 6 {t('digits')}
        </p>

        {/* Dots */}
        <div className={`flex justify-center gap-4 mb-8 transition-all ${shake ? 'animate-bounce' : ''}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                i < input.length
                  ? shake
                    ? 'bg-accent-red border-accent-red scale-110'
                    : 'bg-accent-blue border-accent-blue scale-110'
                  : 'border-surface-border bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Lock message */}
        {isLocked && (
          <div className="text-center mb-4 px-4 py-3 bg-accent-red/10 rounded-xl border border-accent-red/20">
            <p className="text-accent-red text-sm font-medium">
              {`?? {t('lockedWait')} ${Math.floor(lockTimeLeft / 60)}:${String(lockTimeLeft % 60).padStart(2, '0')}`}
            </p>
          </div>
        )}

        {/* Error */}
        {error && !isLocked && (
          <p className="text-accent-red text-sm text-center mb-4">{error}</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />
            if (d === 'del') {
              return (
                <button
                  key={i}
                  onClick={handleDelete}
                  disabled={isLocked || checking}
                  className="h-16 rounded-2xl bg-surface-elevated border border-surface-border text-text-muted flex items-center justify-center hover:bg-surface-hover active:scale-95 transition-all disabled:opacity-40"
                >
                  <Delete size={22} />
                </button>
              )
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                disabled={isLocked || checking}
                className="h-16 rounded-2xl bg-surface-elevated border border-surface-border text-text-primary text-2xl font-semibold flex items-center justify-center hover:bg-surface-hover hover:border-accent-blue/40 active:scale-95 transition-all disabled:opacity-40"
              >
                {d}
              </button>
            )
          })}
        </div>

        {checking && (
          <div className="flex items-center justify-center gap-2 mt-6 text-text-muted">
            <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">{t('verifying')}...</span>
          </div>
        )}
      </div>
    </div>
  )
}
