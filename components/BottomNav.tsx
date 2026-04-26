import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { ScreenName, UserProfile } from '../types';
import { LOGO_URL } from '../constants';
import { UserIdentityCard } from './UserIdentityCard';
import { isSupabaseConfigured } from '../lib/supabase';
import { isDevMockSession } from '../lib/api';
import { getMockCurrentUserRole } from '../lib/mockData';
import { getMockProfile } from '../lib/mockData';

interface BottomNavProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName, params?: any) => void;
  currentParams?: any;
  profile?: UserProfile | null;
}

type NavItem = {
  key: string;
  screen: ScreenName;
  icon: typeof Icons.Library;
  label: string;
  params?: any;
};

const STORAGE_SIDEBAR_COLLAPSED = 'kaboo_sidebar_collapsed';

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate, currentParams, profile }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED, String(isCollapsed));
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const fallbackRole = !profile && (!isSupabaseConfigured || isDevMockSession())
    ? getMockCurrentUserRole()
    : null;
  const fallbackProfile = !profile && (!isSupabaseConfigured || isDevMockSession())
    ? getMockProfile()
    : null;
  const effectiveProfile = profile ?? fallbackProfile;
  const effectiveRole = profile?.role ?? fallbackRole;
  const canEdit = effectiveRole === 'admin' || effectiveRole === 'editor';
  const isProfileSection = currentScreen === 'profile' || currentScreen === 'my_data';
  const currentCollectionGroup = currentParams?.collectionGroup === 'books' ? 'books' : 'kits';

  const isItemActive = (item: NavItem) => {
    if (item.key === 'profile') {
      return isProfileSection;
    }

    if (item.screen === 'home') {
      if (!(currentScreen === 'home' || currentScreen === 'search' || currentScreen === 'characters')) {
        return false;
      }

      const itemCollectionGroup = item.params?.collectionGroup === 'books' ? 'books' : 'kits';
      return currentCollectionGroup === itemCollectionGroup;
    }

    return currentScreen === item.screen;
  };

  const catalogNavItems: NavItem[] = [
    { key: 'collections', screen: 'home', icon: Icons.Library, label: 'Coleções', params: { collectionGroup: 'kits' } },
    { key: 'books', screen: 'home', icon: Icons.BookOpen, label: 'Livros', params: { collectionGroup: 'books' } },
  ];

  const libraryNavItems: NavItem[] = [
    { key: 'videos', screen: 'videos', icon: Icons.Video, label: 'Vídeos' },
    { key: 'music', screen: 'music', icon: Icons.Headphones, label: 'Músicas' },
    { key: 'formations', screen: 'formations', icon: Icons.BookOpen, label: 'Formações' },
    { key: 'materials', screen: 'materials', icon: Icons.FileText, label: 'Materiais' },
  ];

  const footerNavItems: NavItem[] = [];

  // Add admin collections item if user has permission
  const adminNavItem: NavItem | null = canEdit
    ? { key: 'admin', screen: 'admin', icon: Icons.Settings, label: 'Gerenciar' }
    : null;

  const desktopNavSections = [
    { title: 'Acervo', items: catalogNavItems },
    { title: 'Bibliotecas', items: libraryNavItems },
    ...(adminNavItem ? [{ title: 'Gestão', items: [adminNavItem] }] : []),
  ];

  const mobileNavItems = [
    ...catalogNavItems,
    ...libraryNavItems,
    ...(adminNavItem ? [adminNavItem] : []),
    { key: 'profile', screen: 'profile', icon: Icons.User, label: 'Perfil' },
  ];

  return (
    <>
      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {mobileNavItems.map((item) => {
            const isActive = isItemActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.screen, item.params)}
                aria-label={item.label}
                className="flex flex-col items-center gap-1 min-w-[68px] pb-1"
              >
                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-kaboo-primary/10' : 'bg-transparent'}`}>
                  <Icon
                    size={24}
                    className={`transition-colors ${isActive ? 'text-kaboo-primary stroke-[3px]' : 'text-gray-400 stroke-[2px]'}`}
                  />
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-kaboo-primary' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <div className={`hidden md:flex flex-col h-screen bg-white border-r border-gray-100 shrink-0 z-50 shadow-sm transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-20' : 'w-64'
        }`}>
        {/* Toggle Button - Top Border */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-4 w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 z-10"
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? (
            <Icons.ChevronRight size={14} className="text-gray-600" />
          ) : (
            <Icons.ChevronLeft size={14} className="text-gray-600" />
          )}
        </button>

        {/* Logo Area - Clickable */}
        <button
          onClick={() => onNavigate('home')}
          className={`w-full flex justify-center hover:opacity-80 transition-opacity focus:outline-none ${isCollapsed ? 'p-4' : 'p-8'
            }`}
          aria-label="Ir para o Início"
          title="Ir para o Início"
        >
          {!isCollapsed && (
            <img src={LOGO_URL} alt="Kaboo" className="w-32 h-auto" />
          )}
          {isCollapsed && (
            <img src={LOGO_URL} alt="Kaboo" className="w-10 h-auto" />
          )}
        </button>

        {/* Nav Items */}
        <div className={`flex-1 space-y-4 py-4 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'
          }`}>
          {desktopNavSections.map((section, sectionIndex) => (
            <div key={section.title} className={`space-y-2 ${sectionIndex > 0 ? 'pt-4 border-t border-gray-100' : ''}`}>
              {!isCollapsed && (
                <p className="px-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-300">
                  {section.title}
                </p>
              )}

              {section.items.map((item) => {
                const isActive = isItemActive(item);
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => onNavigate(item.screen, item.params)}
                    aria-label={item.label}
                    className={`w-full flex items-center rounded-[100px] transition-all duration-200 group ${isCollapsed
                      ? 'justify-center px-3 py-4'
                      : 'gap-4 px-6 py-4'
                      } ${isActive
                        ? 'bg-kaboo-primary text-white shadow-md shadow-kaboo-primary/20'
                        : 'bg-transparent text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <Icon
                      size={22}
                      className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px] group-hover:text-kaboo-primary'}
                    />
                    {!isCollapsed && (
                      <span className={`text-sm font-bold ${isActive ? '' : 'group-hover:text-gray-800'}`}>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`border-t border-gray-100 transition-all duration-300 ${isCollapsed ? 'px-2 py-4' : 'px-4 pt-4 pb-6'}`}>
          <div className="space-y-2">
            {footerNavItems.map((item) => {
              const isActive = isItemActive(item);
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.screen, item.params)}
                  aria-label={item.label}
                  className={`w-full flex items-center rounded-[100px] transition-all duration-200 group ${isCollapsed
                    ? 'justify-center px-3 py-4'
                    : 'gap-4 px-6 py-4'
                    } ${isActive
                      ? 'bg-kaboo-primary text-white shadow-md shadow-kaboo-primary/20'
                      : 'bg-transparent text-gray-500 hover:bg-gray-50'
                    }`}
                >
                  <Icon
                    size={22}
                    className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px] group-hover:text-kaboo-primary'}
                  />
                  {!isCollapsed && (
                    <span className={`text-sm font-bold ${isActive ? '' : 'group-hover:text-gray-800'}`}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {effectiveProfile && (
            <div className={`${isCollapsed ? 'flex justify-center' : ''} ${footerNavItems.length > 0 ? 'mt-4' : ''}`}>
              <UserIdentityCard
                profile={effectiveProfile}
                collapsed={isCollapsed}
                active={isProfileSection}
                onClick={() => onNavigate('profile')}
              />
            </div>
          )}

          {!isCollapsed && (
            <div className="pt-4 text-center text-xs text-gray-300">
              <p>Mundo de Kaboo © 2025</p>
              <p className="mt-1">Versão 2.1</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};