# Codigos de teste de vouchers

Atualizado em: 2026-04-07

Fonte principal: `supabase/seed.vouchers.sql`

## Ja usado por voce nesta homologacao

| Codigo | Duracao | Situacao atual | Observacao |
| --- | --- | --- | --- |
| KABOO-1MES-2026 | 1 mes | Usado | Consumido na validacao real do fluxo de cadastro + resgate |
| KABOO-12MESES-2026 | 12 meses | Usado | Consumido na validacao do fluxo corrigido de cadastro + ativacao |

## Disponiveis para novos testes

| Codigo | Duracao | Situacao esperada | Observacao |
| --- | --- | --- | --- |
| KABOO-LIVR-0001 | 3 meses | Ativo | Voucher previsivel para fluxo de livro avulso no mock local |
| KABOO-TEST-0001 | 3 meses | Ativo | Voucher previsivel para testes manuais de QA/homologacao |
| KABOO-3MESES-2026 | 3 meses | Ativo | Disponivel para resgate |
| KABOO-6MESES-2026 | 6 meses | Ativo | Disponivel para resgate |
| KABOO-9MESES-2026 | 9 meses | Ativo | Disponivel para resgate |

## Codigos para cenarios especificos

| Codigo | Duracao | Situacao esperada | Observacao |
| --- | --- | --- | --- |
| KABOO-USADO-2026 | 3 meses | Redeemed | Ja vem marcado como usado no seed |
| KABOO-EXPIRADO-2026 | 1 mes | Expired | Ja vem marcado como expirado no seed |
| KABOO-BLOQUEADO-2026 | 6 meses | Disabled | Ja vem marcado como desabilitado no seed |

## Observacoes rapidas

- Se voce consumir outro codigo ativo em homologacao, mova ele para a secao "Ja usado por voce nesta homologacao".
- Esta lista mistura dois tipos de status: uso real na sua validacao e estado semeado para cenarios controlados.