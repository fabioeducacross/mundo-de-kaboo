-- Consolida a regra operacional atual: cada kit mantém no máximo 1 livro vinculado.
update public.collections
set kit_book_ids = array[kit_book_ids[1]]
where collection_type = 'kit'
  and coalesce(array_length(kit_book_ids, 1), 0) > 1;