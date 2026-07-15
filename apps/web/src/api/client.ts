// Core API client: attaches the bearer token, normalizes JSON errors, and
// signals auth failures so the app can bounce the user to /login.

export const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000'

const TOKEN_KEY = 'hermuz_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// Raised when the API returns a non-2xx response. `status` lets callers react
// to specific codes (e.g. 401); `message` is a user-presentable string.
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Broadcast a 401 so the auth layer can clear state and redirect. Using an
// event keeps the low-level client decoupled from react-router.
export const UNAUTHORIZED_EVENT = 'hermuz:unauthorized'

function emitUnauthorized(): void {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
}

interface RequestOptions {
  method?: string
  body?: unknown
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body } = options
  const token = getToken()

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${API_ORIGIN}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new ApiError(0, 'Network error — could not reach the API.')
  }

  if (res.status === 401) {
    clearToken()
    emitUnauthorized()
    throw new ApiError(401, 'Session expired. Please log in again.')
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = (await res.json()) as { error?: string }
      if (data?.error) message = data.error
    } catch {
      // Non-JSON error body; keep the default message.
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T

  // Some endpoints (DELETE) may return an empty 200 body.
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
