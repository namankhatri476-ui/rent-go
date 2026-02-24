import LocationSelector from '@/components/LocationSelector';
import { useLocation } from '@/contexts/LocationContext';

const LocationPopupWrapper = () => {
  const { showLocationPopup, setShowLocationPopup } = useLocation();

  return (
    <LocationSelector
      externalOpen={showLocationPopup}
      onExternalOpenChange={setShowLocationPopup}
    />
  );
};

export default LocationPopupWrapper;
