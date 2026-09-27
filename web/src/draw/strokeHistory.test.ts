import { describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
  emptyHistory,
  hasAnyStroke,
  pushEntry,
  redo,
  undo,
  visibleStrokes,
  type BrushStroke,
  type ClearLayer,
} from './strokeHistory'

function stroke(id: string, layerIndex = 0): BrushStroke {
  return {
    type: 'stroke',
    id,
    layerIndex,
    tool: 'brush',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    color: '#000',
    size: 4,
    opacity: 1,
  }
}

function clear(id: string, layerIndex = 0): ClearLayer {
  return { type: 'clear', id, layerIndex }
}

describe('pushEntry / undo / redo', () => {
  it('starts empty with nothing to undo or redo', () => {
    const h = emptyHistory()
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
  })

  it('adding a stroke makes it visible and undoable', () => {
    let h = emptyHistory()
    h = pushEntry(h, stroke('a'))
    expect(visibleStrokes(h, 0).map((s) => s.id)).toEqual(['a'])
    expect(canUndo(h)).toBe(true)
    expect(canRedo(h)).toBe(false)
  })

  it('undo removes the most recent entry from what is visible', () => {
    let h = emptyHistory()
    h = pushEntry(h, stroke('a'))
    h = pushEntry(h, stroke('b'))
    h = undo(h)
    expect(visibleStrokes(h, 0).map((s) => s.id)).toEqual(['a'])
    expect(canRedo(h)).toBe(true)
  })

  it('redo restores it', () => {
    let h = emptyHistory()
    h = pushEntry(h, stroke('a'))
    h = undo(h)
    h = redo(h)
    expect(visibleStrokes(h, 0).map((s) => s.id)).toEqual(['a'])
    expect(canRedo(h)).toBe(false)
  })

  it('a new stroke after undo discards the redo tail', () => {
    let h = emptyHistory()
    h = pushEntry(h, stroke('a'))
    h = pushEntry(h, stroke('b'))
    h = undo(h)
    h = pushEntry(h, stroke('c'))
    expect(visibleStrokes(h, 0).map((s) => s.id)).toEqual(['a', 'c'])
    expect(canRedo(h)).toBe(false)
  })

  it('undo/redo past the ends are no-ops', () => {
    const h = emptyHistory()
    expect(undo(h)).toEqual(h)
    expect(redo(h)).toEqual(h)
  })

  it('supports at least 50 undo steps', () => {
    let h = emptyHistory()
    for (let i = 0; i < 60; i++) h = pushEntry(h, stroke(String(i)))
    for (let i = 0; i < 55; i++) h = undo(h)
    expect(visibleStrokes(h, 0)).toHaveLength(5)
    for (let i = 0; i < 55; i++) h = redo(h)
    expect(visibleStrokes(h, 0)).toHaveLength(60)
  })
})

describe('layers', () => {
  it('keeps strokes on different layers independent', () => {
    let h = emptyHistory()
    h = pushEntry(h, stroke('a', 0))
    h = pushEntry(h, stroke('b', 1))
    expect(visibleStrokes(h, 0).map((s) => s.id)).toEqual(['a'])
    expect(visibleStrokes(h, 1).map((s) => s.id)).toEqual(['b'])
  })
})

describe('clear', () => {
  it('hides everything before it on that layer only', () => {
    let h = emptyHistory()
    h = pushEntry(h, stroke('a', 0))
    h = pushEntry(h, stroke('b', 1))
    h = pushEntry(h, clear('c', 0))
    expect(visibleStrokes(h, 0)).toEqual([])
    expect(visibleStrokes(h, 1).map((s) => s.id)).toEqual(['b'])
  })

  it('is itself undoable', () => {
    let h = emptyHistory()
    h = pushEntry(h, stroke('a'))
    h = pushEntry(h, clear('c'))
    expect(visibleStrokes(h, 0)).toEqual([])
    h = undo(h)
    expect(visibleStrokes(h, 0).map((s) => s.id)).toEqual(['a'])
  })

  it('a stroke drawn after clear is visible again', () => {
    let h = emptyHistory()
    h = pushEntry(h, stroke('a'))
    h = pushEntry(h, clear('c'))
    h = pushEntry(h, stroke('d'))
    expect(visibleStrokes(h, 0).map((s) => s.id)).toEqual(['d'])
  })
})

describe('hasAnyStroke', () => {
  it('false for an empty history', () => {
    expect(hasAnyStroke(emptyHistory())).toBe(false)
  })

  it('true once a stroke exists on any layer', () => {
    const h = pushEntry(emptyHistory(), stroke('a', 2))
    expect(hasAnyStroke(h)).toBe(true)
  })

  it('false again after that layer is cleared', () => {
    let h = emptyHistory()
    h = pushEntry(h, stroke('a'))
    h = pushEntry(h, clear('c'))
    expect(hasAnyStroke(h)).toBe(false)
  })

  it('false when the only stroke is undone away', () => {
    let h = emptyHistory()
    h = pushEntry(h, stroke('a'))
    h = undo(h)
    expect(hasAnyStroke(h)).toBe(false)
  })
})
