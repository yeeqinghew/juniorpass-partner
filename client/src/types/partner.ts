export type PartnerProfile = {
  partner_id?: string | number;
  partner_name?: string;
  email?: string;
  requires_password_change?: boolean;
  [key: string]: unknown;
};
