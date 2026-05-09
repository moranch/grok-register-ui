/**
 * 基础 HTTP 客户端
 * Requirement: Task 9.1 - API 层重构，封装 fetch 自动添加 Bearer token、处理错误
 */

const BASE_URL = '/api'

/** 获取认证 token */
function getAuthHeaders(): Record<string, string> {
  const password = localStorage.getItem('console_password')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (password) {
    headers['Authorization'] = `Bearer ${password}`
  }
  return headers
}

/** 统一错误处理 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem('console_password')
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/sign-in')
    ) {
      window.location.href = '/sign-in'
    }
    throw new Error('未授权，请重新登录')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message = body?.detail || body?.message || `请求失败 (${response.status})`
    throw new Error(message)
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

/** GET 请求 */
export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  let url = `${BASE_URL}${path}`
  if (params) {
    const searchParams = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
    )
    const qs = searchParams.toString()
    if (qs) url += `?${qs}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })
  return handleResponse<T>(response)
}

/** POST 请求 */
export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

/** PATCH 请求 */
export async function apiPatch<T>(path: string, body?: any): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

/** DELETE 请求 */
export async function apiDelete<T>(path: string, body?: any): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(response)
}

export { BASE_URL }
