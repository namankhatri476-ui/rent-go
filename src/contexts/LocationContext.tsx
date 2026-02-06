import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Location {
  id: string;
  name: string;
  slug: string;
  is_popular: boolean;
}

interface LocationContextType {
  selectedLocation: Location | null;
  setSelectedLocation: (location: Location | null) => void;
  locations: Location[];
  popularLocations: Location[];
  otherLocations: Location[];
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(null);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as Location[];
    },
  });

  const popularLocations = locations.filter(l => l.is_popular);
  const otherLocations = locations.filter(l => !l.is_popular);

  // Load saved location from localStorage
  useEffect(() => {
    const savedLocationSlug = localStorage.getItem('selectedLocation');
    if (savedLocationSlug && locations.length > 0) {
      const location = locations.find(l => l.slug === savedLocationSlug);
      if (location) {
        setSelectedLocationState(location);
      }
    }
  }, [locations]);

  const setSelectedLocation = (location: Location | null) => {
    setSelectedLocationState(location);
    if (location) {
      localStorage.setItem('selectedLocation', location.slug);
    } else {
      localStorage.removeItem('selectedLocation');
    }
  };

  return (
    <LocationContext.Provider value={{
      selectedLocation,
      setSelectedLocation,
      locations,
      popularLocations,
      otherLocations,
      isLoading,
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
