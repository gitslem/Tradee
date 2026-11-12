import { createContext, useContext } from 'react';

export interface ThemeContextType {
  theme: 'day' | 'night';
  isAuto: boolean;
  toggleTheme: () => void;
  setAutoMode: (auto: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
