import axios from 'axios'
import { clearAuth } from '../composables/auth'

const http = axios.create({
  baseURL: '/api',
  timeout: 10000
})

http.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  if (config.method === 'get') config.params = { ...config.params, _t: Date.now() }
  return config
})

http.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      clearAuth()
      window.location.href = '/home'
    }
    return Promise.reject(err)
  }
)

export default http