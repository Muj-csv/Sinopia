/**
 * Achievements: no ranking, no score, nothing compared between artists (CLAUDE.md: "no likes,
 * follower counts, rankings"). Each one is a private milestone about your own work, visible only
 * to you on `/achievements` -- the same bar the profile's fresco count is already held to.
 *
 * Split in two because they're sourced differently: most are derived from what's already in
 * Supabase (frescoStats, friendStats, ...), and a few genuinely have no server trace at all -- the
 * eyedropper, pinning a reference and asking for a doodle guess never write a row anywhere, so
 * those three are tracked locally instead (localMilestones.ts). `unlocked()` doesn't care which:
 * it just reads whichever half of the context it needs.
 */
import type { LocalMilestone } from './localMilestones'

export interface AchievementStats {
  frescoCount: number
  publishedCount: number
  friendCount: number
  hasFavorite: boolean
  hasExactPin: boolean
  hasTag: boolean
}

export interface AchievementContext {
  stats: AchievementStats
  milestones: Record<LocalMilestone, boolean>
}

export interface Achievement {
  id: string
  name: string
  description: string
  unlocked: (ctx: AchievementContext) => boolean
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-save',
    name: 'First Mark',
    description: 'Save your first fresco to the Sketchbook.',
    unlocked: (c) => c.stats.frescoCount >= 1,
  },
  {
    id: 'five-saved',
    name: 'Filling Pages',
    description: 'Save 5 frescoes.',
    unlocked: (c) => c.stats.frescoCount >= 5,
  },
  {
    id: 'ten-saved',
    name: 'Full Sketchbook',
    description: 'Save 10 frescoes.',
    unlocked: (c) => c.stats.frescoCount >= 10,
  },
  {
    id: 'first-publish',
    name: 'Out in the Open',
    description: 'Publish your first fresco to Sinopia.',
    unlocked: (c) => c.stats.publishedCount >= 1,
  },
  {
    id: 'five-published',
    name: 'On the Map',
    description: 'Publish 5 frescoes to Sinopia.',
    unlocked: (c) => c.stats.publishedCount >= 5,
  },
  {
    id: 'ten-published',
    name: 'World Builder',
    description: 'Publish 10 frescoes to Sinopia.',
    unlocked: (c) => c.stats.publishedCount >= 10,
  },
  {
    id: 'first-friend',
    name: 'Sinopia Neighbor',
    description: 'Add your first friend.',
    unlocked: (c) => c.stats.friendCount >= 1,
  },
  {
    id: 'five-friends',
    name: 'Well Connected',
    description: 'Add 5 friends.',
    unlocked: (c) => c.stats.friendCount >= 5,
  },
  {
    id: 'favorite-chosen',
    name: "Artist's Pick",
    description: 'Choose a favorite fresco on your profile.',
    unlocked: (c) => c.stats.hasFavorite,
  },
  {
    id: 'exact-pin',
    name: 'No Secrets',
    description: 'Publish a fresco with the exact location shown.',
    unlocked: (c) => c.stats.hasExactPin,
  },
  {
    id: 'tagged',
    name: 'Cataloged',
    description: 'Add a tag to a fresco.',
    unlocked: (c) => c.stats.hasTag,
  },
  {
    id: 'eyedropper',
    name: 'Color Theory',
    description: 'Pick a colour from a photo with the eyedropper.',
    unlocked: (c) => c.milestones.eyedropper,
  },
  {
    id: 'pinned-reference',
    name: 'Did My Research',
    description: 'Pin a reference image while drawing.',
    unlocked: (c) => c.milestones['pinned-reference'],
  },
  {
    id: 'doodle-guess',
    name: 'Mind Reader',
    description: 'Ask what your drawing looks like.',
    unlocked: (c) => c.milestones['doodle-guess'],
  },
]

export function computeUnlockedIds(ctx: AchievementContext): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => a.unlocked(ctx)).map((a) => a.id))
}
