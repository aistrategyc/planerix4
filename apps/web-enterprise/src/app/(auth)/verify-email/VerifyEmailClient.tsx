'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { resendVerification } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'

function getMailboxUrl(email?: string | null) {
  if (!email) return 'https://mail.google.com/'
  const domain = email.split('@')[1]?.toLowerCase() || ''
  if (domain.includes('gmail.com')) return 'https://mail.google.com/'
  if (domain.includes('yandex.')) return 'https://mail.yandex.ru/'
  if (domain.includes('outlook.') || domain.includes('hotmail.') || domain.includes('live.')) return 'https://outlook.live.com/mail/'
  if (domain.includes('icloud.')) return 'https://www.icloud.com/mail/'
  return `https://${domain}`
}

type VerifyEmailClientProps = { email: string }

export default function VerifyEmailClient({ email }: VerifyEmailClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const mailboxUrl = useMemo(() => getMailboxUrl(email), [email])

  useEffect(() => {
    if (!email) setError('Не указан email для подтверждения.')
  }, [email])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [secondsLeft])

  const handleResend = async () => {
    if (!email || secondsLeft > 0) return
    setLoading(true)
    setError(null)
    try {
      await resendVerification(email)
      setSent(true)
      setSecondsLeft(60)
    } catch (err: any) {
      setError(err?.message || 'Не удалось отправить письмо повторно')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border p-8 rounded-lg shadow-sm space-y-6 text-center">
        <div className="flex justify-center">
          <Mail className="w-10 h-10 text-primary mb-2" />
        </div>

        <h1 className="text-2xl font-bold">Проверьте вашу почту</h1>
        <p className="text-muted-foreground">
          Мы отправили письмо с подтверждением на{' '}
          <span className="font-semibold">{email || 'указанный email'}</span>.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {sent && !error && (
          <Alert variant="default">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription>Письмо отправлено повторно!</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button onClick={handleResend} disabled={loading || !email || secondsLeft > 0} className="w-full" aria-label="Resend email">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Отправка...
              </>
            ) : secondsLeft > 0 ? (
              `Отправить повторно (${secondsLeft}s)`
            ) : (
              'Отправить повторно'
            )}
          </Button>

          <a href={mailboxUrl} target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="secondary" className="w-full" aria-label="Open mailbox">
              Открыть почту
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </a>

          <Button variant="outline" className="w-full" onClick={() => router.push('/login')} aria-label="Go to login">
            Перейти ко входу
          </Button>
        </div>

        {!email && (
          <p className="text-xs text-muted-foreground">
            Адрес не передан. Вернитесь на страницу регистрации и укажите email корректно.
          </p>
        )}
      </div>
    </div>
  )
}