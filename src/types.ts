export interface User {
  id: number;
  name: string;
}

export interface AuthResponse {
  status: 'success' | 'error';
  token?: string;
  user?: {
    name: string;
    role: string;
  };
  redirect?: string;
  message?: string;
}
