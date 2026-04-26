import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: '🚀 Começando',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/environment-variables',
        'getting-started/supabase-setup',
      ],
    },
    {
      type: 'category',
      label: '🏗️ Arquitetura',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/tech-stack',
        'architecture/data-models',
      ],
    },
    {
      type: 'category',
      label: '📱 Telas',
      items: [
        'screens/overview',
        'screens/login',
        'screens/home',
        'screens/search',
        'screens/book-reader',
        'screens/audio-player',
        'screens/video-player',
        'screens/profile',
        'screens/extra-tools',
        'screens/admin-collections',
      ],
    },
    {
      type: 'category',
      label: '🧩 Componentes',
      items: [
        'components/overview',
        'components/bottom-nav',
        'components/collection-modal',
        'components/page-header',
        'components/file-upload',
        'components/flipbook-viewer',
        'components/toast',
      ],
    },
    {
      type: 'category',
      label: '🪝 Hooks',
      items: [
        'hooks/overview',
        'hooks/use-orientation',
        'hooks/use-is-mobile',
        'hooks/use-screen-size',
        'hooks/use-debounce',
        'hooks/use-toast',
        'hooks/use-ref-size',
        'hooks/use-theme-background',
      ],
    },
    {
      type: 'category',
      label: '📚 Biblioteca',
      items: [
        'lib/api',
        'lib/auth',
        'lib/supabase',
        'lib/utils',
        'lib/storage',
        'lib/logger',
        'lib/offline',
      ],
    },
    {
      type: 'category',
      label: '🗺️ Jornadas',
      collapsed: false,
      items: [
        'journeys/journeys',
        'journeys/auth',
        'journeys/post-login',
        'journeys/reference',
      ],
    },
    {
      type: 'category',
      label: '🗺️ Roadmap',
      items: [
        'roadmap/index',
        'roadmap/roadmap-central-coruja-v1.2',
        'roadmap/plano-execucao-mini-youtube-spotify',
        'roadmap/especificacao-arquitetura-mini-youtube-spotify',
        'roadmap/especificacao-ux-ui-mini-youtube-spotify',
        'roadmap/backlog-executavel-mini-youtube-spotify',
        'roadmap/consolidado-backlog-reuniao-15abr2026',
        'roadmap/backlog-central-coruja-15abr2026',
        'roadmap/prd-vouchers-por-conteudo',
        'roadmap/qa-validation-plan-v1.2',
      ],
    },
    'contributing',
  ],
};

export default sidebars;
