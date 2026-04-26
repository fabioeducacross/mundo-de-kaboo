-- ============================================================
-- Migration: backbone inicial de mídia privada
-- Contexto: Mini YouTube / Mini Spotify privados
-- Estratégia:
--   1. Mantém compatibilidade com collection_resources e user_content_grants
--   2. Permite mídia com ou sem vínculo com coleção
--   3. Introduz catálogo, trilhos, favoritos e progresso por item
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'media_hub'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.media_hub AS ENUM ('videos', 'music', 'formations', 'materials');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'media_kind'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.media_kind AS ENUM ('video', 'audio', 'document', 'training');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'media_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.media_status AS ENUM ('draft', 'published', 'archived', 'failed');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'media_provider'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.media_provider AS ENUM ('internal', 'youtube', 'external_audio');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'media_access_mode'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.media_access_mode AS ENUM ('active_subscription', 'linked_collection_grant');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'media_shelf_type'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.media_shelf_type AS ENUM ('hero', 'rail', 'playlist', 'continue_watching');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'media_link_type'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.media_link_type AS ENUM ('contextual', 'primary_source', 'recommended_with');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub public.media_hub NOT NULL,
  media_kind public.media_kind NOT NULL,
  provider public.media_provider NOT NULL,
  access_mode public.media_access_mode NOT NULL DEFAULT 'active_subscription',
  collection_resource_id UUID REFERENCES public.collection_resources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  description TEXT,
  status public.media_status NOT NULL DEFAULT 'draft',
  storage_bucket TEXT,
  storage_path TEXT,
  thumbnail_bucket TEXT,
  thumbnail_path TEXT,
  external_url TEXT,
  external_ref TEXT,
  mime_type TEXT,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  featured_order INTEGER NOT NULL DEFAULT 0 CHECK (featured_order >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_items_internal_source_check CHECK (
    (provider = 'internal' AND storage_bucket IS NOT NULL AND storage_path IS NOT NULL)
    OR (provider <> 'internal')
  ),
  CONSTRAINT media_items_external_source_check CHECK (
    (provider IN ('youtube', 'external_audio') AND external_url IS NOT NULL)
    OR (provider = 'internal')
  )
);

CREATE INDEX IF NOT EXISTS idx_media_items_hub_status_published
  ON public.media_items (hub, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_items_provider_status
  ON public.media_items (provider, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_items_storage_key
  ON public.media_items (storage_bucket, storage_path)
  WHERE storage_bucket IS NOT NULL AND storage_path IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_items_collection_resource_id_unique
  ON public.media_items (collection_resource_id)
  WHERE collection_resource_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.media_collection_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  link_type public.media_link_type NOT NULL DEFAULT 'contextual',
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (media_item_id, collection_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_media_collection_links_collection_id
  ON public.media_collection_links (collection_id, link_type);

CREATE INDEX IF NOT EXISTS idx_media_collection_links_media_item_id
  ON public.media_collection_links (media_item_id);

CREATE TABLE IF NOT EXISTS public.media_shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub public.media_hub NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  shelf_type public.media_shelf_type NOT NULL DEFAULT 'rail',
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_shelves_hub_published_order
  ON public.media_shelves (hub, is_published, order_index);

CREATE TABLE IF NOT EXISTS public.media_shelf_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id UUID NOT NULL REFERENCES public.media_shelves(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  highlight_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shelf_id, media_item_id)
);

CREATE INDEX IF NOT EXISTS idx_media_shelf_items_shelf_id
  ON public.media_shelf_items (shelf_id, order_index);

CREATE TABLE IF NOT EXISTS public.user_media_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  last_position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_media_progress_user_media_item_key UNIQUE (user_id, media_item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_media_progress_user_id
  ON public.user_media_progress (user_id, last_played_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_media_progress_media_item_id
  ON public.user_media_progress (media_item_id);

CREATE TABLE IF NOT EXISTS public.user_media_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_media_favorites_user_media_item_key UNIQUE (user_id, media_item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_media_favorites_user_id
  ON public.user_media_favorites (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.media_link_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('ok', 'warning', 'down')),
  http_code INTEGER,
  response_ms INTEGER,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_link_health_media_item_id_key UNIQUE (media_item_id)
);

CREATE OR REPLACE FUNCTION public.handle_media_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_media_items_updated_at ON public.media_items;
CREATE TRIGGER set_media_items_updated_at
  BEFORE UPDATE ON public.media_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_media_updated_at();

DROP TRIGGER IF EXISTS set_media_shelves_updated_at ON public.media_shelves;
CREATE TRIGGER set_media_shelves_updated_at
  BEFORE UPDATE ON public.media_shelves
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_media_updated_at();

DROP TRIGGER IF EXISTS set_user_media_progress_updated_at ON public.user_media_progress;
CREATE TRIGGER set_user_media_progress_updated_at
  BEFORE UPDATE ON public.user_media_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_media_updated_at();

DROP TRIGGER IF EXISTS set_media_link_health_updated_at ON public.media_link_health;
CREATE TRIGGER set_media_link_health_updated_at
  BEFORE UPDATE ON public.media_link_health
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_media_updated_at();

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_collection_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_shelf_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_media_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_media_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_link_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios leem media items publicados" ON public.media_items;
CREATE POLICY "Usuarios leem media items publicados"
  ON public.media_items FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'editor')
      )
      OR (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND COALESCE(profiles.access_status, 'active') = 'active'
        )
        AND (
          access_mode = 'active_subscription'
          OR (
            access_mode = 'linked_collection_grant'
            AND EXISTS (
              SELECT 1
              FROM public.media_collection_links links
              JOIN public.user_content_grants grants
                ON grants.collection_id = links.collection_id
              WHERE links.media_item_id = media_items.id
                AND grants.user_id = auth.uid()
                AND (grants.expires_at IS NULL OR grants.expires_at > NOW())
            )
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Admins e editores gerenciam media items" ON public.media_items;
CREATE POLICY "Admins e editores gerenciam media items"
  ON public.media_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Service role gerencia media items" ON public.media_items;
CREATE POLICY "Service role gerencia media items"
  ON public.media_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios leem media collection links visiveis" ON public.media_collection_links;
CREATE POLICY "Usuarios leem media collection links visiveis"
  ON public.media_collection_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.media_items items
      WHERE items.id = media_collection_links.media_item_id
        AND items.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins e editores gerenciam media collection links" ON public.media_collection_links;
CREATE POLICY "Admins e editores gerenciam media collection links"
  ON public.media_collection_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Service role gerencia media collection links" ON public.media_collection_links;
CREATE POLICY "Service role gerencia media collection links"
  ON public.media_collection_links FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios leem media shelves publicadas" ON public.media_shelves;
CREATE POLICY "Usuarios leem media shelves publicadas"
  ON public.media_shelves FOR SELECT
  TO authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins e editores gerenciam media shelves" ON public.media_shelves;
CREATE POLICY "Admins e editores gerenciam media shelves"
  ON public.media_shelves FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Service role gerencia media shelves" ON public.media_shelves;
CREATE POLICY "Service role gerencia media shelves"
  ON public.media_shelves FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios leem media shelf items de shelves publicadas" ON public.media_shelf_items;
CREATE POLICY "Usuarios leem media shelf items de shelves publicadas"
  ON public.media_shelf_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.media_shelves shelves
      WHERE shelves.id = media_shelf_items.shelf_id
        AND shelves.is_published = true
    )
  );

DROP POLICY IF EXISTS "Admins e editores gerenciam media shelf items" ON public.media_shelf_items;
CREATE POLICY "Admins e editores gerenciam media shelf items"
  ON public.media_shelf_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Service role gerencia media shelf items" ON public.media_shelf_items;
CREATE POLICY "Service role gerencia media shelf items"
  ON public.media_shelf_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios leem o proprio progresso de midia" ON public.user_media_progress;
CREATE POLICY "Usuarios leem o proprio progresso de midia"
  ON public.user_media_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios inserem o proprio progresso de midia" ON public.user_media_progress;
CREATE POLICY "Usuarios inserem o proprio progresso de midia"
  ON public.user_media_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.media_items items
      WHERE items.id = media_item_id
        AND items.status = 'published'
        AND (
          items.access_mode = 'active_subscription'
          OR (
            items.access_mode = 'linked_collection_grant'
            AND EXISTS (
              SELECT 1
              FROM public.media_collection_links links
              JOIN public.user_content_grants grants
                ON grants.collection_id = links.collection_id
              WHERE links.media_item_id = items.id
                AND grants.user_id = auth.uid()
                AND (grants.expires_at IS NULL OR grants.expires_at > NOW())
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Usuarios atualizam o proprio progresso de midia" ON public.user_media_progress;
CREATE POLICY "Usuarios atualizam o proprio progresso de midia"
  ON public.user_media_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios removem o proprio progresso de midia" ON public.user_media_progress;
CREATE POLICY "Usuarios removem o proprio progresso de midia"
  ON public.user_media_progress FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role gerencia user media progress" ON public.user_media_progress;
CREATE POLICY "Service role gerencia user media progress"
  ON public.user_media_progress FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios leem os proprios favoritos de midia" ON public.user_media_favorites;
CREATE POLICY "Usuarios leem os proprios favoritos de midia"
  ON public.user_media_favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios inserem os proprios favoritos de midia" ON public.user_media_favorites;
CREATE POLICY "Usuarios inserem os proprios favoritos de midia"
  ON public.user_media_favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios removem os proprios favoritos de midia" ON public.user_media_favorites;
CREATE POLICY "Usuarios removem os proprios favoritos de midia"
  ON public.user_media_favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role gerencia user media favorites" ON public.user_media_favorites;
CREATE POLICY "Service role gerencia user media favorites"
  ON public.user_media_favorites FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins e editores leem media link health" ON public.media_link_health;
CREATE POLICY "Admins e editores leem media link health"
  ON public.media_link_health FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Admins e editores gerenciam media link health" ON public.media_link_health;
CREATE POLICY "Admins e editores gerenciam media link health"
  ON public.media_link_health FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Service role gerencia media link health" ON public.media_link_health;
CREATE POLICY "Service role gerencia media link health"
  ON public.media_link_health FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.media_items IS 'Catálogo privado de mídia para hubs gerais como Videos e Musicas.';
COMMENT ON COLUMN public.media_items.collection_resource_id IS 'Vínculo opcional com collection_resources para rollout brownfield.';
COMMENT ON COLUMN public.media_items.storage_bucket IS 'Bucket privado do Supabase Storage.';
COMMENT ON COLUMN public.media_items.storage_path IS 'Caminho privado do objeto; URLs assinadas devem ser geradas em runtime.';
COMMENT ON TABLE public.media_collection_links IS 'Relacionamento opcional entre item de mídia e coleção.';
COMMENT ON TABLE public.user_media_progress IS 'Checkpoint de reprodução por usuário e item de mídia.';
COMMENT ON TABLE public.user_media_favorites IS 'Favoritos de mídia por usuário.';

COMMIT;