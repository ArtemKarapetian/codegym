import { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { MapZone, ZoneData } from './MapZone';

interface MapCanvasProps {
  zones: ZoneData[];
  onZoneClick?: (zone: ZoneData) => void;
  onZoneHover?: (zone: ZoneData | null) => void;
  selectedZoneId?: string | null;
}

export function MapCanvas({
  zones,
  onZoneClick,
  onZoneHover,
  selectedZoneId,
}: MapCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.min(Math.max(zoom + delta, 0.5), 2);
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.map-zone')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.map-zone')) return;

    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      setTouchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );

      if (touchDistance > 0) {
        const delta = (distance - touchDistance) * 0.01;
        const newZoom = Math.min(Math.max(zoom + delta, 0.5), 2);
        setZoom(newZoom);
      }

      setTouchDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchDistance(0);
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.2, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[var(--tinkoff-gray)]">
      {/* Hint */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs sm:text-sm text-[var(--tinkoff-dark-gray)] border border-[var(--tinkoff-border)] max-w-[90%] text-center">
        <span className="hidden sm:inline">
          Перетаскивайте карту и наводите на зоны
        </span>
        <span className="sm:hidden">Нажмите на зону для деталей</span>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-20 sm:bottom-4 right-4 z-10 flex flex-col gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          className="bg-white/90 backdrop-blur-sm hover:bg-[var(--tinkoff-yellow)]/20"
        >
          <ZoomIn className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          className="bg-white/90 backdrop-blur-sm hover:bg-[var(--tinkoff-yellow)]/20"
        >
          <ZoomOut className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          className="bg-white/90 backdrop-blur-sm hover:bg-[var(--tinkoff-yellow)]/20"
        >
          <Maximize2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Map Container */}
      <div
        ref={containerRef}
        className={`relative w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute inset-0 transition-transform duration-100"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Grid background */}
          <div className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Map Zones */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px]">
            {zones.map((zone) => (
              <MapZone
                key={zone.id}
                zone={zone}
                onClick={onZoneClick}
                onHover={onZoneHover}
                isSelected={selectedZoneId === zone.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
