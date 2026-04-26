-- ============================================================
-- Mundo de Kaboo — Voucher Seed de Homologação
--
-- Objetivo:
--   Popular códigos previsíveis para validar o fluxo real de
--   cadastro, bloqueio e renovação em ambientes controlados.
--
-- Atenção:
--   Este arquivo deve ser usado apenas em desenvolvimento,
--   QA ou homologação. Não recria nem altera códigos já
--   existentes no banco.
-- ============================================================

BEGIN;

INSERT INTO public.vouchers (code, duration_months, status)
VALUES
  ('KABOO-1MES-2026', 1, 'active'),
  ('KABOO-LIVR-0001', 3, 'active'),
  ('KABOO-TEST-0001', 3, 'active'),
  ('KABOO-3MESES-2026', 3, 'active'),
  ('KABOO-6MESES-2026', 6, 'active'),
  ('KABOO-9MESES-2026', 9, 'active'),
  ('KABOO-12MESES-2026', 12, 'active')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.vouchers (code, duration_months, status, consumed_at)
VALUES
  ('KABOO-USADO-2026', 3, 'redeemed', NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.vouchers (code, duration_months, status, expires_at)
VALUES
  ('KABOO-EXPIRADO-2026', 1, 'expired', NOW() - INTERVAL '1 day')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.vouchers (code, duration_months, status)
VALUES
  ('KABOO-BLOQUEADO-2026', 6, 'disabled')
ON CONFLICT (code) DO NOTHING;

COMMIT;