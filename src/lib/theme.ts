import { ref, computed } from 'vue';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'transport_manager_theme';

/**
 * Obtiene el tema inicial preferido desde localStorage o preferencia del sistema
 */
function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  }
  return 'dark'; // Tema predeterminado
}

export const currentTheme = ref<Theme>(getInitialTheme());

export const isDarkMode = computed(() => currentTheme.value === 'dark');

/**
 * Aplica el tema al elemento html y persiste en localStorage
 */
export function setTheme(theme: Theme) {
  currentTheme.value = theme;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn('No se pudo guardar la preferencia de tema en localStorage:', e);
    }

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }
}

/**
 * Alterna entre modo claro y oscuro
 */
export function toggleTheme() {
  setTheme(currentTheme.value === 'dark' ? 'light' : 'dark');
}

/**
 * Hook composable para componentes Vue
 */
export function useTheme() {
  return {
    theme: currentTheme,
    isDark: isDarkMode,
    setTheme,
    toggleTheme
  };
}
