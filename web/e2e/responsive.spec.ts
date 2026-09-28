/**
 * Responsive checks across the viewport sizes the product targets: phone portrait and landscape,
 * tablet, laptop and desktop.
 *
 * The main assertion is that nothing overflows horizontally. A page wider than its viewport is the
 * failure people actually feel -- the whole layout slides sideways under the thumb -- and it is
 * cheap to catch here and expensive to spot by eye at seven sizes.
 */
import { expect, test, type Page } from '@playwright/test'

const VIEWPORTS = [
  { name: 'phone small', width: 375, height: 667 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'phone landscape', width: 844, height: 390 },
  { name: 'tablet portrait', width: 768, height: 1024 },
  { name: 'tablet large', width: 1024, height: 1366 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'desktop large', width: 1920, height: 1080 },
] as const

/** Routes reachable without an account. The rest sit behind the sign-in gate. */
const ROUTES = ['/', '/about', '/sketchbook', '/no-such-page'] as const

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    return Math.max(0, doc.scrollWidth - doc.clientWidth)
  })
}

test.describe('no horizontal overflow', () => {
  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`${viewport.name} (${viewport.width}x${viewport.height}) ${route}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(route)
        // The globe mounts MapLibre asynchronously; give the layout a frame to settle.
        await page.waitForTimeout(250)
        expect(await horizontalOverflow(page)).toBe(0)
      })
    }
  }
})

test.describe('layout changes shape with the screen', () => {
  test('phone puts the nav along the bottom', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Primary' })
    const navBox = await nav.boundingBox()
    expect(navBox).not.toBeNull()
    // A bottom bar is wide and short; a rail is the opposite.
    expect(navBox!.width).toBeGreaterThan(navBox!.height)
  })

  test('laptop turns the nav into a side rail', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    const navBox = await page.getByRole('navigation', { name: 'Primary' }).boundingBox()
    expect(navBox).not.toBeNull()
    expect(navBox!.height).toBeGreaterThan(navBox!.width)
  })

  test('touch targets stay at least 44px on the smallest phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    const links = page.getByRole('navigation', { name: 'Primary' }).getByRole('link')
    for (const link of await links.all()) {
      const box = await link.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })
})
