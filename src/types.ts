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

export type JobApplicationSummary = Pick<Application, "id" | "job_id" | "professional_id" | "status" | "chat_invited_at" | "proposed_rate" | "created_at" | "updated_at"> & {
  professional?: Application["professional"];
};

export type Job = {
  id: string;
  title: string;
  description: string;
  currency: string;
  price_type?: "fixed" | "negotiable" | string;
  price_amount?: number | null;
  location: string | null;
  state: string | null;
  is_remote: boolean;
  number_of_professionals: number;
  status: string;
  views_count: number;
  applications_count: number;
  applications?: JobApplicationSummary[];
  rejected_applications?: JobApplicationSummary[];
  categories?: Category;
  category?: Category;
  client?: Pick<Profile, "id" | "first_name" | "last_name" | "phone_verified">;
  created_at: string;
  updated_at?: string;
};

export type JobQuoteAttachment = {
  id?: string;
  name: string;
  type?: string | null;
  size?: number | null;
  path?: string;
  bucket?: string;
  created_at?: string;
};

export type JobQuote = {
  id: string;
  conversation_id: string;
  job_id: string;
  application_id: string;
  client_id: string;
  professional_id: string;
  version: number;
  status: "sent" | "review_requested" | "accepted" | "superseded" | string;
  project_title: string;
  project_description: string;
  total_budget: number;
  duration_days: number;
  attachments: JobQuoteAttachment[];
  review_note?: string | null;
  accepted_at?: string | null;
  review_requested_at?: string | null;
  created_at: string;
  updated_at: string;
  job?: Pick<Job, "id" | "title" | "price_type" | "price_amount" | "currency"> | null;
};

export type ProposalAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  bucket: string;
  created_at: string;
};

export type DeliverableAttachment = ProposalAttachment;

export type ConversationReview = {
  id: string;
  rating: number | null;
  review_text: string | null;
  skipped: boolean;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  job_id: string;
  professional_id: string;
  pitch: string;
  proposed_rate: number | null;
  estimated_days: number | null;
  proposed_start_at?: string | null;
  reference_image_urls: string[];
  proposal_attachments: ProposalAttachment[];
  chat_invited_at?: string | null;
  chat_invited_by?: string | null;
  chat_accepted_at?: string | null;
  chat_accepted_by?: string | null;
  status: "pending" | "reviewed" | "shortlisted" | "selected" | "awarded" | "not_awarded" | "rejected" | "withdrawn" | string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deleted_reason?: string | null;
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

export type ProposalDraft = {
  id: string;
  job_id: string;
  professional_id: string;
  pitch: string | null;
  proposed_rate: number | null;
  estimated_days: number | null;
  proposed_start_at: string | null;
  reference_image_urls: string[];
  created_at: string;
  updated_at: string;
};

export type JobConversation = {
  id: string;
  job_id: string;
  application_id: string;
  client_id: string;
  professional_id: string;
  opened_by: string | null;
  status: "open" | "archived" | string;
  upfront_payment_made_at?: string | null;
  upfront_payment_made_by?: string | null;
  work_status?: "in_progress" | "submitted" | "revision_requested" | "completed" | string;
  work_starts_at?: string | null;
  work_ends_at?: string | null;
  work_submitted_at?: string | null;
  revision_requested_at?: string | null;
  completed_at?: string | null;
  final_payment_made_at?: string | null;
  final_payment_made_by?: string | null;
  deliverables?: DeliverableAttachment[];
  revision_note?: string | null;
  review?: ConversationReview | ConversationReview[] | null;
  created_at: string;
  updated_at: string;
  job?: Pick<Job, "id" | "title" | "status" | "category" | "is_remote" | "description" | "number_of_professionals" | "location" | "state" | "price_type" | "price_amount" | "currency"> | null;
  application?: Pick<Application, "id" | "status" | "pitch" | "proposed_rate" | "estimated_days" | "reference_image_urls" | "proposal_attachments"> | null;
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
  rating_average?: number | null;
  review_count?: number;
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

export type AppointmentRescheduleRequest = {
  id: string;
  appointment_id: string;
  requested_by: string;
  requested_for: string;
  previous_starts_at: string;
  previous_ends_at: string;
  proposed_starts_at: string;
  proposed_ends_at: string;
  note: string | null;
  status: "pending" | "accepted" | "declined" | string;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
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
  reschedule_requests?: AppointmentRescheduleRequest[];
};

