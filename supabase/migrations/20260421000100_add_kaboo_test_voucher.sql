-- Garantir voucher de QA/homologacao previsivel em ambientes ligados via migration.
INSERT INTO public.vouchers (code, duration_months, status)
VALUES ('KABOO-TEST-0001', 3, 'active')
ON CONFLICT (code) DO NOTHING;