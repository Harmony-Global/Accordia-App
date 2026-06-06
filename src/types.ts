export type Role = "client" | "professional" | "admin";

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
};

export type Profile = {
  id: string;
  email: string;
  phone: string;
  role: Role;
  first_name: string;
  last_name: string;
  phone_verified: boolean;
  avatar_url?: string | null;
  professional_profiles?: ProfessionalProfile | ProfessionalProfile[] | null;
};

export type ProfessionalProfile = {
  id?: string;
  user_id?: string;
  bio: string | null;
  years_experience: number | null;
  hourly_rate: number | null;
  location: string | null;
  state: string | null;
  is_available: boolean;
  professional_categories?: { category: Category }[];
};

export type Verification = {
  id: string;
  type: "phone" | string;
  value: string;
  status: "pending" | "verified" | "rejected" | string;
  otp_expires_at?: string | null;
  last_sent_at?: string | null;
  created_at?: string;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_type: "fixed" | "hourly";
  currency: string;
  location: string | null;
  state: string | null;
  is_remote: boolean;
  status: string;
  views_count: number;
  applications_count: number;
  categories?: Category;
  category?: Category;
  client?: Pick<Profile, "id" | "first_name" | "last_name" | "phone_verified">;
};

export type Application = {
  id: string;
  job_id: string;
  professional_id: string;
  pitch: string;
  proposed_rate: number | null;
  reference_image_urls: string[];
  status: "pending" | "reviewed" | "shortlisted" | "rejected" | "awarded" | string;
  created_at: string;
  updated_at: string;
  job?: Job;
  professional?: Pick<Profile, "id" | "first_name" | "last_name" | "phone_verified" | "avatar_url">;
};

export type JobView = {
  id: string;
  viewed_at: string;
  professional: Pick<Profile, "id" | "first_name" | "last_name" | "phone_verified" | "avatar_url">;
};
