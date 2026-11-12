import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './theme';

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

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode etc.) - preference just won't persist
  }
};

const timeBasedTheme = (): 'day' | 'night' => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'day' : 'night';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isAuto, setIsAuto] = useState(() => readStorage('theme-auto') !== 'false');
  const [theme, setTheme] = useState<'day' | 'night'>(() => {
    const saved = readStorage('theme');
    if (readStorage('theme-auto') === 'false' && (saved === 'day' || saved === 'night')) {
      return saved;
    }
    return timeBasedTheme();
  });
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Keep the <html data-theme> attribute in sync so CSS tokens switch
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Get user's geolocation (auto mode only)
  useEffect(() => {
    if (isAuto && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => {
          // Fall back to time-based detection
          setTheme(timeBasedTheme());
        }
      );
    }
  }, [isAuto]);

  // Update theme based on location and time
  useEffect(() => {
    if (!isAuto) return;

    const updateTheme = () => {
      if (location) {
        setTheme(isDayTime(location.lat, location.lon) ? 'day' : 'night');
      } else {
        setTheme(timeBasedTheme());
      }
    };

    updateTheme();

    // Update every minute to catch sunrise/sunset
    const interval = setInterval(updateTheme, 60000);

    return () => clearInterval(interval);
  }, [isAuto, location]);

  // Manual theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'day' ? 'night' : 'day';
    setIsAuto(false);
    setTheme(newTheme);
    writeStorage('theme', newTheme);
    writeStorage('theme-auto', 'false');
  };

  const setAutoMode = (auto: boolean) => {
    setIsAuto(auto);
    writeStorage('theme-auto', String(auto));
  };

  const value = {
    theme,
    isAuto,
    toggleTheme,
    setAutoMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
