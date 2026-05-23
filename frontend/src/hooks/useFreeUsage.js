import { useState, useEffect, useRef, useCallback } from 'react'

const FREE_LIMIT_MS = 30 * 60 * 1000 // 30 minutos en ms

/**
 * Obtiene la clave de almacenamiento para el mes actual.
 * Ejemplo: "miraa_usage_2026-05"
 */
function getStorageKey() {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return `miraa_usage_${month}`
}

/**
 * Lee el tiempo acumulado (ms) para el mes actual.
 */
function readAccumulatedMs() {
  try {
    const raw = localStorage.getItem(getStorageKey())
    return raw ? parseInt(raw, 10) : 0
  } catch {
    return 0
  }
}

/**
 * Escribe el tiempo acumulado (ms) para el mes actual.
 */
function writeAccumulatedMs(ms) {
  try {
    localStorage.setItem(getStorageKey(), String(ms))
  } catch {
    // localStorage puede no estar disponible (p.ej. modo privado muy restrictivo)
  }
}

/**
 * Hook principal de control de uso gratuito.
 *
 * @param {boolean} isAuthenticated - Si el usuario está autenticado (Clerk).
 * @returns {{
 *   remainingMs: number,
 *   limitReached: boolean,
 *   startTracking: () => void,
 *   stopTracking: () => void,
 *   resetUsage: () => void
 * }}
 */
export function useFreeUsage(isAuthenticated) {
  const [accumulatedMs, setAccumulatedMs] = useState(readAccumulatedMs)
  const intervalRef = useRef(null)
  const sessionStartRef = useRef(null)

  const limitReached = !isAuthenticated && accumulatedMs >= FREE_LIMIT_MS
  const remainingMs = Math.max(0, FREE_LIMIT_MS - accumulatedMs)

  // Detener contador
  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    sessionStartRef.current = null
  }, [])

  // Iniciar contador (solo para usuarios no autenticados)
  const startTracking = useCallback(() => {
    if (isAuthenticated) return // Usuarios autenticados: sin límite
    if (intervalRef.current) return // Ya está corriendo
    if (accumulatedMs >= FREE_LIMIT_MS) return // Ya alcanzó el límite

    sessionStartRef.current = Date.now()

    intervalRef.current = setInterval(() => {
      const sessionMs = Date.now() - sessionStartRef.current
      const total = readAccumulatedMs() + sessionMs

      writeAccumulatedMs(total)
      setAccumulatedMs(total)
      sessionStartRef.current = Date.now() // Reset sesión parcial

      if (total >= FREE_LIMIT_MS) {
        stopTracking()
      }
    }, 5000) // Actualizar cada 5 segundos
  }, [isAuthenticated, accumulatedMs, stopTracking])

  // Limpiar al desmontar
  useEffect(() => {
    return () => stopTracking()
  }, [stopTracking])

  // Resetear (útil para testing o si el admin lo requiere)
  const resetUsage = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey())
    } catch {/**/}
    setAccumulatedMs(0)
  }, [])

  return { remainingMs, limitReached, startTracking, stopTracking, resetUsage }
}

/**
 * Formatea ms en "MM min SS seg"
 */
export function formatRemaining(ms) {
  if (ms <= 0) return '0 min'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} seg`
  return `${minutes} min ${seconds > 0 ? `${seconds} seg` : ''}`
}
