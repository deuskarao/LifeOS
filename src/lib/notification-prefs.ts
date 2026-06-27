'use client'

import { useSyncExternalStore, useCallback } from 'react'

export interface NotificationPrefs {
  paymentReminders: boolean
  cardDebtAlerts: boolean
  budgetLimits: boolean
  weeklyReport: boolean
}

const DEFAULTS: NotificationPrefs = {
  paymentReminders: true,
  cardDebtAlerts: true,
  budgetLimits: true,
  weeklyReport: false,
}

const KEY = 'lifeos_notifications'
const EVENT = 'lifeos-notifications-change'

function readPrefsRaw(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULTS
}

// Stable snapshot cache — useSyncExternalStore aynı referans bekler
let cachedPrefs: NotificationPrefs = DEFAULTS
let cachedPrefsRaw: string | null = null
let initialized = false

function getPrefsSnapshot(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  if (!initialized) {
    cachedPrefsRaw = localStorage.getItem(KEY)
    cachedPrefs = cachedPrefsRaw !== null ? readPrefsRaw() : DEFAULTS
    initialized = true
  }
  const raw = localStorage.getItem(KEY)
  if (raw !== cachedPrefsRaw) {
    cachedPrefsRaw = raw
    cachedPrefs = readPrefsRaw()
  }
  return cachedPrefs
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  window.addEventListener(EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(EVENT, callback)
  }
}

export function useNotificationPrefs() {
  const prefs = useSyncExternalStore(subscribe, getPrefsSnapshot, () => DEFAULTS)

  const update = useCallback((p: Partial<NotificationPrefs>) => {
    const current = getPrefsSnapshot()
    const next = { ...current, ...p }
    try {
      const serialized = JSON.stringify(next)
      localStorage.setItem(KEY, serialized)
      cachedPrefsRaw = serialized
      cachedPrefs = next
      window.dispatchEvent(new Event(EVENT))
    } catch {
      /* ignore */
    }
  }, [])

  return { prefs, update }
}

/** Okunmuş bildirim ID'lerini localStorage'da tutar. */
const READ_KEY = 'lifeos_read_notifications'
const READ_EVENT = 'lifeos-read-change'

const EMPTY_SET: Set<string> = new Set()

let cachedReadIds: Set<string> = EMPTY_SET
let cachedReadRaw: string | null = null
let readInitialized = false

function getReadIdsSnapshot(): Set<string> {
  if (typeof window === 'undefined') return EMPTY_SET
  if (!readInitialized) {
    cachedReadRaw = localStorage.getItem(READ_KEY)
    readInitialized = true
    if (cachedReadRaw) {
      try {
        cachedReadIds = new Set(JSON.parse(cachedReadRaw) as string[])
      } catch {
        cachedReadIds = EMPTY_SET
      }
    }
  }
  const raw = localStorage.getItem(READ_KEY)
  if (raw !== cachedReadRaw) {
    cachedReadRaw = raw
    if (raw) {
      try {
        cachedReadIds = new Set(JSON.parse(raw) as string[])
      } catch {
        cachedReadIds = EMPTY_SET
      }
    } else {
      cachedReadIds = EMPTY_SET
    }
  }
  return cachedReadIds
}

function subscribeRead(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  window.addEventListener(READ_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(READ_EVENT, callback)
  }
}

export function useReadNotifications() {
  const readIdsSet = useSyncExternalStore(subscribeRead, getReadIdsSnapshot, () => EMPTY_SET)

  const markRead = useCallback((ids: string[]) => {
    const current = getReadIdsSnapshot()
    const next = new Set(current)
    let changed = false
    ids.forEach((id) => {
      if (!next.has(id)) {
        next.add(id)
        changed = true
      }
    })
    if (changed) {
      try {
        const serialized = JSON.stringify(Array.from(next))
        localStorage.setItem(READ_KEY, serialized)
        cachedReadRaw = serialized
        cachedReadIds = next
        window.dispatchEvent(new Event(READ_EVENT))
      } catch {
        /* ignore */
      }
    }
  }, [])

  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(READ_KEY)
      cachedReadRaw = null
      cachedReadIds = EMPTY_SET
      window.dispatchEvent(new Event(READ_EVENT))
    } catch {
      /* ignore */
    }
  }, [])

  return { readIds: readIdsSet, markRead, clearAll }
}
