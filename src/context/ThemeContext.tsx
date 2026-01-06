import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface ThemeContextType {
  theme: 'day' | 'night';
  isAuto: boolean;
  toggleTheme: () => void;
  setAutoMode: (auto: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

// Calculate sunrise and sunset times based on latitude and longitude
const getSunriseSunset = (lat: number, lon: number, date: Date) => {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

  // Solar declination
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));

  // Hour angle
  const cosHourAngle = -Math.tan(lat * Math.PI / 180) * Math.tan(declination * Math.PI / 180);

  // Check if sun never sets or never rises
  if (cosHourAngle > 1) {
    // Sun never rises (polar night)
    return { sunrise: null, sunset: null, isAlwaysNight: true };
  } else if (cosHourAngle < -1) {
    // Sun never sets (polar day)
    return { sunrise: null, sunset: null, isAlwaysDay: true };
  }

  const hourAngle = Math.acos(cosHourAngle) * (180 / Math.PI);

  // Solar noon (in hours from midnight)
  const solarNoon = 12 - (lon / 15);

  // Sunrise and sunset in hours from midnight
  const sunriseHour = solarNoon - (hourAngle / 15);
  const sunsetHour = solarNoon + (hourAngle / 15);

  // Convert to Date objects
  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseHour), Math.round((sunriseHour % 1) * 60), 0, 0);

  const sunset = new Date(date);
  sunset.setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0, 0);

  return { sunrise, sunset, isAlwaysNight: false, isAlwaysDay: false };
};

// Determine if it's day or night based on current time and location
const isDayTime = (lat: number, lon: number): boolean => {
  const now = new Date();
  const { sunrise, sunset, isAlwaysNight, isAlwaysDay } = getSunriseSunset(lat, lon, now);

  if (isAlwaysNight) return false;
  if (isAlwaysDay) return true;

  if (sunrise && sunset) {
    return now >= sunrise && now < sunset;
  }

  // Fallback to simple time-based check (6 AM - 6 PM)
  const hour = now.getHours();
  return hour >= 6 && hour < 18;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'day' | 'night'>('day');
  const [isAuto, setIsAuto] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Get user's geolocation
  useEffect(() => {
    if (isAuto && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Fallback to time-based detection
          const hour = new Date().getHours();
          setTheme(hour >= 6 && hour < 18 ? 'day' : 'night');
        }
      );
    }
  }, [isAuto]);

  // Update theme based on location and time
  useEffect(() => {
    if (!isAuto) return;

    const updateTheme = () => {
      if (location) {
        const isDay = isDayTime(location.lat, location.lon);
        const newTheme = isDay ? 'day' : 'night';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      } else {
        // Fallback to simple time-based check
        const hour = new Date().getHours();
        const newTheme = hour >= 6 && hour < 18 ? 'day' : 'night';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      }
    };

    updateTheme();

    // Update every minute to catch sunrise/sunset
    const interval = setInterval(updateTheme, 60000);

    return () => clearInterval(interval);
  }, [isAuto, location]);

  // Manual theme toggle
  const toggleTheme = () => {
    setIsAuto(false);
    const newTheme = theme === 'day' ? 'night' : 'day';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('theme-auto', 'false');
  };

  const setAutoMode = (auto: boolean) => {
    setIsAuto(auto);
    localStorage.setItem('theme-auto', String(auto));
    if (!auto) {
      const savedTheme = localStorage.getItem('theme') as 'day' | 'night' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    }
  };

  // Load saved preferences on mount
  useEffect(() => {
    const savedAuto = localStorage.getItem('theme-auto');
    const savedTheme = localStorage.getItem('theme');

    if (savedAuto !== null) {
      setIsAuto(savedAuto === 'true');
    }

    if (savedAuto === 'false' && savedTheme) {
      setTheme(savedTheme as 'day' | 'night');
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const value = {
    theme,
    isAuto,
    toggleTheme,
    setAutoMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
