import VerifyEmailClient from './VerifyEmailClient'

export default async function VerifyEmailPage(props: any) {
  // Next 15 может передать searchParams как объект ИЛИ как Promise
  const sp = props?.searchParams
  const resolved: Record<string, any> =
    sp && typeof sp.then === 'function' ? await sp : (sp ?? {})

  const raw = resolved?.email
  const email = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')

  return <VerifyEmailClient email={email} />
}