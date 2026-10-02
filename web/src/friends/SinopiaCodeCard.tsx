/**
 * Your own code and QR, on Profile. Scanning the QR (or typing the code) on the Friends tab sends
 * you a request -- see qr.ts for why the QR encodes a link rather than the bare code.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import './friends.css'
import { friendLinkFor, friendQrDataUrl } from './qr'

export function SinopiaCodeCard({ code }: { code: string }) {
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    friendQrDataUrl(code)
      .then((url) => {
        if (!cancelled) setQr(url)
      })
      .catch(() => {
        if (!cancelled) setQr(null)
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(friendLinkFor(code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission can be denied; the code is still shown to copy by hand.
    }
  }

  return (
    <div className="profile-code-card">
      <h2 className="t-small">Your Sinopia code</h2>
      {qr !== null && (
        <img src={qr} alt={`QR code for Sinopia code ${code}`} className="profile-code-qr" />
      )}
      <span className="profile-code-value">{code}</span>
      <p className="t-small">
        Someone can type this code, or scan the QR, on their{' '}
        <Link className="link" to="/friends">
          Friends
        </Link>{' '}
        tab to add you.
      </p>
      <button type="button" className="btn-o" onClick={copy}>
        <Icon name="qr" />
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  )
}
