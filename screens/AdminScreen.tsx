import React, { useState, useRef } from 'react';
import { Icons } from '../components/Icons';
import { AdminModule, ScreenName } from '../types';
import useIsMobile from '../hooks/useIsMobile';

// Re-export the legacy admin screen so existing code keeps working
import { AdminCollectionsScreen, AdminCollectionsHandle } from './AdminCollectionsScreen';
import { AdminCharactersHandle, AdminCharactersScreen } from './AdminCharactersScreen';
import { VouchersModule } from './VouchersModule';

interface AdminScreenProps {
    onNavigate: (screen: ScreenName, params?: any) => void;
    onBack: () => void;
}

const MODULE_META: Record<AdminModule, { icon: React.FC<{ className?: string }>; label: string }> = {
    collections: { icon: Icons.Library, label: 'Coleções' },
    videos: { icon: Icons.Video, label: 'Vídeos' },
    music: { icon: Icons.Headphones, label: 'Músicas' },
    formations: { icon: Icons.BookOpen, label: 'Formações' },
    materials: { icon: Icons.FileText, label: 'Materiais' },
    users: { icon: Icons.User, label: 'Usuários' },
    vouchers: { icon: Icons.Ticket, label: 'Vouchers' },
    characters: { icon: Icons.Users, label: 'Personagens' },
};

const MODULES: AdminModule[] = ['collections', 'videos', 'music', 'formations', 'materials', 'users', 'characters', 'vouchers'];

const COLLECTION_SCREEN_MODULES: AdminModule[] = ['collections', 'users', 'videos', 'music', 'formations', 'materials'];

/* ─── Sidebar ──────────────────────────────────────────── */

const AdminSidebar: React.FC<{
    active: AdminModule;
    onSelect: (m: AdminModule) => void;
    collapsed: boolean;
    onToggle: () => void;
}> = ({ active, onSelect, collapsed, onToggle }) => (
    <aside
        className={`
      bg-gray-50 border-r border-gray-200 flex flex-col
      transition-all duration-200
      ${collapsed ? 'w-16' : 'w-56'}
    `}
    >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-gray-200">
            {!collapsed && <span className="text-sm font-bold text-gray-700 truncate">Administração</span>}
            <button
                onClick={onToggle}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"
                aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
                {collapsed ? <Icons.ChevronRight className="w-4 h-4" /> : <Icons.ChevronLeft className="w-4 h-4" />}
            </button>
        </div>

        {/* Module links */}
        <nav className="flex-1 py-2 space-y-0.5">
            {MODULES.map((mod) => {
                const meta = MODULE_META[mod];
                const isActive = active === mod;
                const Icon = meta.icon;
                return (
                    <button
                        key={mod}
                        onClick={() => onSelect(mod)}
                        className={`
              w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors
              ${isActive
                                ? 'bg-kaboo-primary/10 text-kaboo-primary border-r-2 border-kaboo-primary'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }
              ${collapsed ? 'justify-center' : ''}
            `}
                        title={collapsed ? meta.label : undefined}
                        aria-label={meta.label}
                    >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{meta.label}</span>}
                    </button>
                );
            })}
        </nav>
    </aside>
);

/* ─── Mobile tab bar (replaces sidebar on small screens) ─ */

const AdminTabBar: React.FC<{
    active: AdminModule;
    onSelect: (m: AdminModule) => void;
}> = ({ active, onSelect }) => (
    <div className="flex border-b border-gray-200 bg-gray-50 px-2">
        {MODULES.map((mod) => {
            const meta = MODULE_META[mod];
            const isActive = active === mod;
            const Icon = meta.icon;
            return (
                <button
                    key={mod}
                    onClick={() => onSelect(mod)}
                    className={`
            flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2
            ${isActive
                            ? 'text-kaboo-primary border-kaboo-primary'
                            : 'text-gray-500 border-transparent hover:text-gray-700'
                        }
          `}
                >
                    <Icon className="w-4 h-4" />
                    <span>{meta.label}</span>
                </button>
            );
        })}
    </div>
);

/* ─── Admin Screen (CMS shell) ─────────────────────────── */

export const AdminScreen: React.FC<AdminScreenProps> = ({ onNavigate, onBack }) => {
    const isMobile = useIsMobile();
    const [activeModule, setActiveModule] = useState<AdminModule>('collections');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const collectionsRef = useRef<AdminCollectionsHandle>(null);
    const charactersRef = useRef<AdminCharactersHandle>(null);

    const handleModuleSelect = (mod: AdminModule) => {
        // Guard: check for unsaved changes before leaving collections/users module
        if (COLLECTION_SCREEN_MODULES.includes(activeModule) && mod !== activeModule) {
            if (collectionsRef.current?.hasUnsavedChanges()) {
                if (!window.confirm('Você tem alterações não salvas. Deseja sair sem salvar?')) {
                    return;
                }
            }
        }

        if (activeModule === 'characters' && mod !== activeModule) {
            if (charactersRef.current?.hasUnsavedChanges()) {
                if (!window.confirm('Você tem alterações não salvas. Deseja sair sem salvar?')) {
                    return;
                }
            }
        }

        setActiveModule(mod);
    };

    const renderModule = () => {
        switch (activeModule) {
            case 'collections':
            case 'users':
            case 'videos':
            case 'music':
            case 'formations':
            case 'materials':
                // Delegate to legacy screen; pass the active tab so it opens the right one
                return (
                    <AdminCollectionsScreen
                        ref={collectionsRef}
                        key={activeModule}
                        onNavigate={onNavigate}
                        onBack={onBack}
                        initialTab={activeModule === 'users' ? 'users' : 'collections'}
                        initialLibraryArea={activeModule === 'collections' || activeModule === 'users' ? undefined : activeModule}
                    />
                );
            case 'vouchers':
                return <VouchersModule />;
            case 'characters':
                return <AdminCharactersScreen ref={charactersRef} onNavigate={onNavigate} onBack={onBack} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {isMobile ? (
                <>
                    <AdminTabBar active={activeModule} onSelect={handleModuleSelect} />
                    <div className="flex-1 overflow-y-auto">{renderModule()}</div>
                </>
            ) : (
                <div className="flex h-full">
                    <AdminSidebar
                        active={activeModule}
                        onSelect={handleModuleSelect}
                        collapsed={sidebarCollapsed}
                        onToggle={() => setSidebarCollapsed((c) => !c)}
                    />
                    <div className="flex-1 overflow-y-auto">{renderModule()}</div>
                </div>
            )}
        </div>
    );
};
