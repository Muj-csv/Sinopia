/** The one entry point the rest of the app calls: "what's newly unlocked since we last checked?" */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ACHIEVEMENTS, computeUnlockedIds, type Achievement } from './achievements'
import { fetchAchievementStats } from './achievementStats'
import { hasMilestone } from './localMilestones'
import { readSeen, writeSeen } from './seenAchievements'

function currentMilestones() {
  return {
    eyedropper: hasMilestone('eyedropper'),
    'pinned-reference': hasMilestone('pinned-reference'),
    'doodle-guess': hasMilestone('doodle-guess'),
  }
}

/**
 * Recomputes every achievement and returns the ones newly unlocked since the last call (for the
 * caller to toast), then marks the full unlocked set seen. Called after a fresco save/publish --
 * the one moment stats can plausibly have changed -- and is also what AchievementsPage runs to
 * keep "seen" in sync while just showing the current state.
 */
export async function checkNewAchievements(
  userId: string,
  client: SupabaseClient = supabase,
): Promise<Achievement[]> {
  const stats = await fetchAchievementStats(userId, client)
  const unlocked = computeUnlockedIds({ stats, milestones: currentMilestones() })
  const seen = readSeen(userId)
  const newly = ACHIEVEMENTS.filter((a) => unlocked.has(a.id) && !seen.has(a.id))
  writeSeen(userId, unlocked)
  return newly
}
