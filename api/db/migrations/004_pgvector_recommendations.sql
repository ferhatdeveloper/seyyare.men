-- Seyyare.men — pgvector extension + Recommendation Agent vector search
SET search_path TO public;

-- pgvector extension'i aktifleştir
CREATE EXTENSION IF NOT EXISTS vector;

-- Vehicle embeddings tablosunu güncelle
DROP TABLE IF EXISTS public.vehicle_embeddings;

-- Yeni: gerçek pgvector kullan (384 boyut — sentence-transformers/all-MiniLM-L6-v2 uyumlu)
CREATE TABLE IF NOT EXISTS public.vehicle_embeddings (
  vehicle_id uuid PRIMARY KEY REFERENCES public.vehicles(id) ON DELETE CASCADE,
  embedding vector(384) NOT NULL,
  content_text text NOT NULL,
  content_hash varchar(64) NOT NULL,
  model_name varchar(64) NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
  generated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ANN (Approximate Nearest Neighbor) index — pgvector HNSW
-- cosine distance için, hızlı similarity search
CREATE INDEX IF NOT EXISTS idx_vehicle_embeddings_vector
  ON public.vehicle_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Content hash için normal index (cache invalidation için)
CREATE INDEX IF NOT EXISTS idx_vehicle_embeddings_hash
  ON public.vehicle_embeddings (content_hash);

-- Content text full-text search index
CREATE INDEX IF NOT EXISTS idx_vehicle_embeddings_text
  ON public.vehicle_embeddings
  USING GIN (to_tsvector('simple', content_text));

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_touch_vehicle_embeddings ON public.vehicle_embeddings;
CREATE TRIGGER trg_touch_vehicle_embeddings BEFORE UPDATE ON public.vehicle_embeddings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Recommendation query fonksiyonu (cosine similarity ile en yakın K komşu)
CREATE OR REPLACE FUNCTION public.find_similar_vehicles(
  query_embedding vector(384),
  exclude_vehicle_id uuid DEFAULT NULL,
  k integer DEFAULT 10,
  min_similarity numeric DEFAULT 0.5,
  country_filter char(2) DEFAULT NULL,
  make_filter integer DEFAULT NULL
)
RETURNS TABLE (
  vehicle_id uuid,
  similarity numeric,
  title text,
  price_amount bigint,
  year integer
) LANGUAGE sql STABLE AS $$
  SELECT
    ve.vehicle_id,
    1 - (ve.embedding <=> query_embedding) AS similarity,
    v.title_original,
    v.price_amount,
    v.year
  FROM public.vehicle_embeddings ve
  JOIN public.vehicles v ON v.id = ve.vehicle_id
  WHERE v.status = 'active'
    AND (exclude_vehicle_id IS NULL OR v.id != exclude_vehicle_id)
    AND (country_filter IS NULL OR v.country_code = country_filter)
    AND (make_filter IS NULL OR v.make_id = make_filter)
    AND (1 - (ve.embedding <=> query_embedding)) >= min_similarity
  ORDER BY ve.embedding <=> query_embedding
  LIMIT k;
$$;

GRANT EXECUTE ON FUNCTION public.find_similar_vehicles(vector(384), uuid, integer, numeric, char(2), integer)
  TO anon, authenticated, dealer, admin;

-- Hybrid search: full-text + vector + filters
CREATE OR REPLACE FUNCTION public.hybrid_search_vehicles(
  query_text text DEFAULT NULL,
  query_embedding vector(384) DEFAULT NULL,
  text_weight numeric DEFAULT 0.3,  -- 0..1 (kalan kısım vector weight)
  k integer DEFAULT 20,
  country_filter char(2) DEFAULT NULL,
  make_filter integer DEFAULT NULL,
  min_price bigint DEFAULT NULL,
  max_price bigint DEFAULT NULL,
  min_year integer DEFAULT NULL,
  max_year integer DEFAULT NULL
)
RETURNS TABLE (
  vehicle_id uuid,
  combined_score numeric,
  text_rank numeric,
  vector_similarity numeric,
  title text,
  price_amount bigint,
  year integer
) LANGUAGE sql STABLE AS $$
  WITH text_results AS (
    SELECT
      v.id,
      v.title_original,
      v.price_amount,
      v.year,
      COALESCE(ts_rank(to_tsvector('simple', coalesce(v.title_original, '') || ' ' || coalesce(v.description_original, '')),
                   plainto_tsquery('simple', coalesce(query_text, ''))), 0) AS rank
    FROM public.vehicles v
    WHERE v.status = 'active'
      AND query_text IS NOT NULL
      AND (
        country_filter IS NULL OR v.country_code = country_filter
      ) AND (make_filter IS NULL OR v.make_id = make_filter)
      AND (min_price IS NULL OR v.price_amount >= min_price)
      AND (max_price IS NULL OR v.price_amount <= max_price)
      AND (min_year IS NULL OR v.year >= min_year)
      AND (max_year IS NULL OR v.year <= max_year)
  ),
  vector_results AS (
    SELECT
      ve.vehicle_id AS id,
      1 - (ve.embedding <=> query_embedding) AS similarity
    FROM public.vehicle_embeddings ve
    WHERE query_embedding IS NOT NULL
  ),
  combined AS (
    SELECT
      COALESCE(t.id, v.id) AS id,
      t.title_original,
      t.price_amount,
      t.year,
      COALESCE(t.rank, 0) * text_weight + COALESCE(v.similarity, 0) * (1 - text_weight) AS score,
      COALESCE(t.rank, 0) AS t_rank,
      COALESCE(v.similarity, 0) AS v_sim
    FROM text_results t
    FULL OUTER JOIN vector_results v ON t.id = v.id
  )
  SELECT id, score, t_rank, v_sim, title_original, price_amount, year
  FROM combined
  ORDER BY score DESC
  LIMIT k;
$$;

GRANT EXECUTE ON FUNCTION public.hybrid_search_vehicles(
  text, vector(384), numeric, integer, char(2), integer, bigint, bigint, integer, integer
) TO anon, authenticated, dealer, admin;

-- RLS: vehicle_embeddings okunabilir (public öneriler için)
ALTER TABLE public.vehicle_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_embeddings_select_all ON public.vehicle_embeddings
  FOR SELECT USING (true);

-- insert/update: sadece service role
CREATE POLICY vehicle_embeddings_service_write ON public.vehicle_embeddings
  FOR ALL USING (public.current_jwt_role() IN ('admin', 'service'))
  WITH CHECK (public.current_jwt_role() IN ('admin', 'service'));

-- Migration tracking comment
COMMENT ON TABLE public.vehicle_embeddings IS
  'pgvector-based vehicle embeddings for Recommendation Agent. 384-dim MiniLM-L6-v2 vectors with HNSW index for cosine similarity search.';

-- Outdated JSON-only vehicle_embeddings (varsa) — mevcut JSON-based fallback'i koruyalım
-- Eski tablo zaten DROP TABLE IF EXISTS ile düşürüldü
-- vehicle_embeddings.content_text + JSON kombinasyonu artık yok, vector(384) kullanılıyor
