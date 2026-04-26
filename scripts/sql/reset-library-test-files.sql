-- Reset de arquivos para testes de Bibliotecas
-- Remove recursos antigos de collections e cria uma base nova com tipos video/audio/pdf.
-- Seguro para homologacao: script idempotente por titulo+url+collection_id.

BEGIN;

DELETE FROM public.collection_resources;

INSERT INTO public.collection_resources (collection_id, title, type, url, size)
VALUES
  (
    '784b3238-0916-4922-af3c-8627d74cc16c',
    'Biblioteca Teste - Video 01',
    'video',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    NULL
  ),
  (
    '784b3238-0916-4922-af3c-8627d74cc16c',
    'Biblioteca Teste - Audio 01',
    'audio',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    NULL
  ),
  (
    '784b3238-0916-4922-af3c-8627d74cc16c',
    'Biblioteca Teste - PDF 01',
    'pdf',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    NULL
  ),
  (
    'c6334710-6117-426f-995c-07be8d87d872',
    'Biblioteca Teste - Video 02',
    'video',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    NULL
  ),
  (
    'c6334710-6117-426f-995c-07be8d87d872',
    'Biblioteca Teste - Audio 02',
    'audio',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    NULL
  ),
  (
    'c6334710-6117-426f-995c-07be8d87d872',
    'Biblioteca Teste - PDF 02',
    'pdf',
    'https://www.africau.edu/images/default/sample.pdf',
    NULL
  ),
  (
    '6a93b60f-b4e9-4fe6-9fed-7c6f7391745c',
    'Biblioteca Teste - Video 03',
    'video',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    NULL
  ),
  (
    '6a93b60f-b4e9-4fe6-9fed-7c6f7391745c',
    'Biblioteca Teste - Audio 03',
    'audio',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    NULL
  ),
  (
    '6a93b60f-b4e9-4fe6-9fed-7c6f7391745c',
    'Biblioteca Teste - PDF 03',
    'pdf',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    NULL
  );

COMMIT;
