import { useState, useEffect } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLocation } from '@/contexts/LocationContext';
import { cn } from '@/lib/utils';

interface LocationSelectorProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

const LocationSelector = ({ externalOpen, onExternalOpenChange }: LocationSelectorProps) => {
  const { selectedLocation, setSelectedLocation, popularLocations, otherLocations, isLoading } = useLocation();
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (onExternalOpenChange) onExternalOpenChange(val);
    else setInternalOpen(val);
  };

  const filteredPopular = popularLocations.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredOther = otherLocations.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLocation = (location: typeof popularLocations[0]) => {
    setSelectedLocation(location);
    setOpen(false);
    setSearchQuery('');
  };

  const dialogContent = (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" onInteractOutside={(e) => {
      // Prevent closing if no location selected (first visit)
      if (!selectedLocation) e.preventDefault();
    }}>
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">Select Your City</DialogTitle>
      </DialogHeader>

      {/* Search Input */}
      <div className="relative my-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search city here"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading cities...</div>
      ) : (
        <>
          {filteredPopular.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-sm text-foreground mb-4">Popular Cities</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {filteredPopular.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleSelectLocation(location)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:bg-accent group",
                      selectedLocation?.id === location.id && "bg-accent"
                    )}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-full border-2 flex items-center justify-center bg-background transition-all",
                      selectedLocation?.id === location.id
                        ? "border-primary shadow-md"
                        : "border-muted group-hover:border-primary/50"
                    )}>
                      <MapPin className={cn(
                        "h-7 w-7 transition-colors",
                        selectedLocation?.id === location.id
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-primary"
                      )} />
                    </div>
                    <span className={cn(
                      "text-xs font-medium text-center transition-colors",
                      selectedLocation?.id === location.id
                        ? "text-primary"
                        : "text-foreground"
                    )}>
                      {location.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredOther.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-4">More Cities</h3>
              <div className="flex flex-wrap gap-2">
                {filteredOther.map((location) => (
                  <Button
                    key={location.id}
                    variant={selectedLocation?.id === location.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectLocation(location)}
                    className="rounded-full px-4"
                  >
                    {location.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {filteredPopular.length === 0 && filteredOther.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No cities found matching "{searchQuery}"
            </div>
          )}
        </>
      )}
    </DialogContent>
  );

  // If externally controlled, render without trigger
  if (externalOpen !== undefined) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 text-sm font-medium hover:bg-accent"
        >
          <MapPin className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">
            {selectedLocation?.name || 'Select City'}
          </span>
          <span className="sm:hidden">
            {selectedLocation?.name?.slice(0, 3) || 'City'}
          </span>
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
};

export default LocationSelector;
