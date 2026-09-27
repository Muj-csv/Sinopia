/** Phase 0 smoke test: the app shell loads and the four nav items are present. */
import { expect, test } from '@playwright/test'

test('shows the app shell with all four nav items', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sinopia' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav.getByRole('link', { name: 'Globe' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'New' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Sketchbook' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Profile' })).toBeVisible()
})

test('navigates to the drawing spike and Sketchbook placeholder', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'New' }).click()
  await expect(page.locator('.draw-spike-stage')).toBeVisible()

  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Sketchbook' })
    .click()
  await expect(page.getByText('Your Sketchbook is empty.')).toBeVisible()
})
