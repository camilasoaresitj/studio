'use client'

import { useEffect, useRef } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { usePathname, useRouter } from 'next/navigation'

export default function TrackingMap({ location }: { location: { latitude: number, longitude: number } }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const initMap = async () => {
      if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        console.error("Google Maps API key is not set.");
        return;
      }

      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        version: 'weekly',
        libraries: ['places', 'marker']
      })

      try {
        const { Map } = await loader.importLibrary('maps');
        const { AdvancedMarkerElement } = await loader.importLibrary("marker") as google.maps.MarkerLibrary;

        if (!mapRef.current) return;

        const map = new Map(mapRef.current, {
          center: { lat: location.latitude, lng: location.longitude },
          zoom: 12,
          mapId: 'TRACKING_MAP'
        })

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: location.latitude, lng: location.longitude }
        })

        marker.addListener('gmp-click', () => {
          // Em um app real, poderia levar a uma página de detalhes do marcador/localização
          // router.push(`${pathname}/details`)
          console.log('Marker clicked!');
        })

      } catch (error) {
        console.error("Error loading Google Maps: ", error);
      }
    }

    initMap()
  }, [location, router, pathname])

  return <div ref={mapRef} className="h-[500px] w-full" />
}
