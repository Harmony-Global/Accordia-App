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

export type ProfessionalServicesProgress = {
  service_count: number;
  minimum_required: number;
  has_minimum_services: boolean;
};

export type ProfessionalProfile = {
  id?: string;
  user_id?: string;
  bio: string | null;
  years_experience: number | null;
  location: string | null;
  state: string | null;
  is_available: boolean;
  professional_categories?: { category: Category }[];
  professional_services?: ProfessionalService[];
};

export type ProfessionalService = {
  id: string;
  professional_id: string;
  category_id: string | null;
  offering_type: "service" | "product";
  title: string;
  description: string;
  image_url: string;
  price_min: number;
  price_max: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
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
  currency: string;
  location: string | null;
  state: string | null;
  is_remote: boolean;
  number_of_professionals: number;
  status: string;
  views_count: number;
  applications_count: number;
  applications?: Pick<Application, "id" | "status">[];
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
  status: "pending" | "reviewed" | "shortlisted" | "selected" | "awarded" | "not_awarded" | "rejected" | string;
  created_at: string;
  updated_at: string;
  job?: Job;
  professional?: Pick<Profile, "id" | "first_name" | "last_name" | "phone_verified" | "avatar_url"> & {
    professional_profiles?: ProfessionalProfile | ProfessionalProfile[] | null;
  };
};

export type JobView = {
  id: string;
  viewed_at: string;
  professional: Pick<Profile, "id" | "first_name" | "last_name" | "phone_verified" | "avatar_url">;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  channel: string;
  sent_at: string | null;
  created_at: string;
};

export type JobConversation = {
  id: string;
  job_id: string;
  application_id: string;
  client_id: string;
  professional_id: string;
  opened_by: string | null;
  status: "open" | "archived" | string;
  created_at: string;
  updated_at: string;
  job?: Pick<Job, "id" | "title" | "status" | "category"> | null;
  application?: Pick<Application, "id" | "status" | "pitch" | "reference_image_urls"> | null;
  client?: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url" | "phone_verified"> | null;
  professional?: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url" | "phone_verified"> & {
    professional_profiles?: ProfessionalProfile | ProfessionalProfile[] | null;
  };
};

export type ChatMessage = {
  id: string;
  conversation_id: string | null;
  inquiry_id?: string | null;
  sender_id: string;
  receiver_id: string;
  job_id: string | null;
  application_id: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
  sender?: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url"> | null;
  receiver?: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url"> | null;
};

export type ProfessionalSearchResult = ProfessionalProfile & {
  profile?: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url" | "phone_verified"> | null;
};

export type ProfessionalInquiry = {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string | null;
  status: "open" | "archived" | string;
  created_at: string;
  updated_at: string;
  client?: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url" | "phone_verified"> | null;
  professional?: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url" | "phone_verified"> & {
    professional_profiles?: ProfessionalProfile | ProfessionalProfile[] | null;
  };
  service?: ProfessionalService | null;
};
export type AppointmentAvailability = {
  id: string;
  professional_id: string;
  service_id: string | null;
  starts_at: string;
  ends_at: string;
  status: "open" | "booked" | "blocked" | string;
  note: string | null;
  created_at: string;
  updated_at: string;
  service?: ProfessionalService | null;
};

export type Appointment = {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string | null;
  availability_id: string | null;
  inquiry_id: string | null;
  starts_at: string;
  ends_at: string;
  status: "requested" | "accepted" | "declined" | "cancelled" | "completed" | string;
  note: string | null;
  created_at: string;
  updated_at: string;
  client?: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url" | "phone_verified"> | null;
  professional?: Pick<Profile, "id" | "first_name" | "last_name" | "avatar_url" | "phone_verified"> & {
    professional_profiles?: ProfessionalProfile | ProfessionalProfile[] | null;
  };
  service?: ProfessionalService | null;
  availability?: AppointmentAvailability | null;
};

