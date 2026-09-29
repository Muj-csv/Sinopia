/**
 * A friend code, drawn as a QR code. The QR encodes a link (`/friend/<code>`), not the bare code --
 * so scanning it with an ordinary phone camera app opens Sinopia straight to the add-friend screen.
 * No in-app scanner has to exist for "scan to add" to work; ScanCode.tsx is an optional shortcut on
 * top of this, not a requirement.
 */
import QRCode from 'qrcode'

export function friendLinkFor(code: string): string {
  return `${window.location.origin}/friend/${code}`
}

function themeColor(varName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return value === '' ? fallback : value
}

export async function friendQrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(friendLinkFor(code), {
    margin: 1,
    width: 220,
    color: {
      dark: themeColor('--ink', '#1A1A1A'),
      light: themeColor('--paper', '#FFFFFF'),
    },
  })
}
