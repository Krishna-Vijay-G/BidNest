//src/types/chitmember.ts
export interface ChitMember {
  id: string;
  member_id: string;
  chit_group_id: string;
  ticket_number: number;
  is_active: boolean;
  created_at: string;
  member?: {
    id: string;
    name: { value: string; updated_at: string };
    mobile: { value: string; updated_at: string };
    upi_ids: { value: string; added_at: string; is_active: boolean }[];
  };
}