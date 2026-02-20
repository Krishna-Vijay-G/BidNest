//src/types/user.ts
export interface User {
  id: string;
  name: { value: string; updated_at: string };
  username: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}
