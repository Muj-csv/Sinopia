/**
 * Phase 0 smoke test, updated for the design kit's shell: the nav is three items (Globe · New ·
 * Sketchbook) with no persistent title bar, and it hides itself on the full-screen flow screens,
 * which carry their own exit instead (SCREENS.md).
 */
import { expect, test } from '@playwright/test'

test('shows the three-item nav on the globe', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav.getByRole('link', { name: 'Globe' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'New' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Sketchbook' })).toBeVisible()

  // Profile folded into the Sketchbook header; it is no longer a nav destination.
  await expect(nav.getByRole('link', { name: 'Profile' })).toHaveCount(0)
  // There is no app-wide title bar: the globe is full-bleed.
  await expect(page.getByRole('heading', { name: 'Sinopia', exact: true })).toHaveCount(0)
})

test('marks the current nav item', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav.getByRole('link', { name: 'Globe' })).toHaveClass(/active/)
})

test('hides the nav on the flow screens, which carry their own exit', async ({ page }) => {
  await page.goto('/new/draw')
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
})

test('the unknown route offers a way back', async ({ page }) => {
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { name: 'Nothing here' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to the globe' })).toBeVisible()
})
