//src/types/member.ts
export interface Member {
  id: string;
  user_id: string;
  name: { value: string; updated_at: string };
  nickname: { value: string; updated_at: string };
  mobile: { value: string; updated_at: string };
  upi_ids: { value: string; added_at: string; is_active: boolean }[];
  is_active: boolean;
  created_at: string;
}