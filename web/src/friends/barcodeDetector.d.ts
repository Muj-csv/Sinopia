/**
 * Minimal ambient types for the Shape Detection API's BarcodeDetector, which TypeScript's DOM lib
 * does not ship. Chrome/Edge/Android only (Safari has no implementation) -- ScanCode.tsx feature-
 * detects it and falls back to "use your phone's own camera app" everywhere else.
 */
interface DetectedBarcode {
  rawValue: string
}

interface BarcodeDetectorOptions {
  formats?: string[]
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions)
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector
}
