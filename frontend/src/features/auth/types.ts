export interface User {
  id: string
  email: string
  full_name: string
  role: "admin" | "contributor"
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
}
