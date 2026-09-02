-- Seyyare.men — Multi-Agent Orchestrator tabloları
SET search_path TO public;

-- Thread (konuşma) bazlı state — PostgresSaver checkpointer
CREATE TABLE IF NOT EXISTS public.agent_threads (
  id varchar(24) PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  intent varchar(32),
  locale varchar(10) NOT NULL DEFAULT 'tr',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  private_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  turn_count int DEFAULT 0,
  total_cost_usd numeric(10,6) DEFAULT 0,
  total_tokens int DEFAULT 0,
  status varchar(16) DEFAULT 'active' CHECK (status IN ('active','paused','completed','failed')),
  resume_token varchar(64),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_threads_user ON public.agent_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_threads_status ON public.agent_threads(status, updated_at DESC);

-- Agent call audit (Langfuse uyumlu)
CREATE TABLE IF NOT EXISTS public.agent_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  thread_id varchar(24),
  agent varchar(32) NOT NULL,
  intent varchar(32),
  model varchar(128),
  tier varchar(16),
  prompt_tokens int DEFAULT 0,
  completion_tokens int DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  duration_ms int DEFAULT 0,
  success boolean DEFAULT true,
  error_message text,
  confidence numeric(4,3),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_thread ON public.agent_jobs(thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_agent_created ON public.agent_jobs(agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_cost ON public.agent_jobs(created_at DESC, cost_usd);

-- Negotiation thread (multi-turn state machine için)
CREATE TABLE IF NOT EXISTS public.negotiation_threads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status varchar(16) DEFAULT 'active' CHECK (status IN ('active','agreed','rejected','expired')),
  buyer_max_offer bigint,
  seller_min_accept bigint,
  current_offer_amount bigint,
  current_offer_by varchar(16) CHECK (current_offer_by IN ('buyer','seller','agent')),
  turn_count int DEFAULT 0,
  max_turns int DEFAULT 10,
  agreed_amount bigint,
  agreed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_negotiation_threads_buyer ON public.negotiation_threads(buyer_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_threads_seller ON public.negotiation_threads(seller_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_threads_vehicle ON public.negotiation_threads(vehicle_id);

-- Recommendation embeddings (pgvector benzeri — şimdilik JSON-based)
CREATE TABLE IF NOT EXISTS public.vehicle_embeddings (
  vehicle_id uuid PRIMARY KEY REFERENCES public.vehicles(id) ON DELETE CASCADE,
  embedding jsonb NOT NULL, -- { make: 0.8, model: 0.7, body: 0.5, ... } feature vector
  content_hash varchar(64),
  generated_at timestamptz DEFAULT now()
);

-- HIL (Human-in-the-Loop) approvals
CREATE TABLE IF NOT EXISTS public.hil_approvals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  thread_id varchar(24),
  agent varchar(32) NOT NULL,
  action varchar(64) NOT NULL,
  payload jsonb,
  status varchar(16) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hil_approvals_user_status ON public.hil_approvals(user_id, status);

-- RLS: agent_threads sadece sahibi tarafından erişilebilir
ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_threads_owner ON public.agent_threads
  FOR ALL USING (user_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

ALTER TABLE public.agent_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_jobs_select ON public.agent_jobs
  FOR SELECT USING (user_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

ALTER TABLE public.negotiation_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY negotiation_parties ON public.negotiation_threads
  FOR ALL USING (buyer_id = public.current_user_id() OR seller_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

ALTER TABLE public.hil_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY hil_owner ON public.hil_approvals
  FOR ALL USING (user_id = public.current_user_id() OR public.current_jwt_role() = 'admin');

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_touch_agent_threads ON public.agent_threads;
CREATE TRIGGER trg_touch_agent_threads BEFORE UPDATE ON public.agent_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_negotiation_threads ON public.negotiation_threads;
CREATE TRIGGER trg_touch_negotiation_threads BEFORE UPDATE ON public.negotiation_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();