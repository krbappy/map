/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useEffect, useState   } from 'react'
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';

import './App.css'
import { getData } from './api/getData';

interface PersonMarker {
  "Marker Type": string;
  "First Name": string;
  "Last Name": string;
  "Title": string;
  "Email": string;
  "Company Name": string;
  "Web Address": string;
  "HomeAddress1": string;
  "HomeAddress2": string;
  "HomeCity": string;
  "HomeState": string;
  "HomeZipCode": string;
  "HomeCountry": string;
  "Phone": string;
  "WorkAddress1": string;
  "WorkAddress2": string;
  "WorkCity": string;
  "WorkState": string;
  "WorkZipCode": string;
  "WorkCountry": string;
  "Address": string;
  "Latitude": string;
  "Longitude": string;
  "undefined"?: string;
}



function App() {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const [data, setData] = useState<PersonMarker[]>([])
  const [showPeople, setShowPeople] = useState(true)
  const [showAirports, setShowAirports] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const data = await getData('1naE-xN9IVLXWTa6qh1RjMZTzjki7ZANfPl15oqu7apA', 'People')
      setData(data)
    }
    fetchData()
  }, [])

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1Ijoic2Vhbi10YWxvcyIsImEiOiJjbTcxeDV3Z3kwNGl1MmlwdmFidDl3b3AwIn0.LpR8CLrvzXb4y_ZdNz8MsQ'
    if (mapContainerRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/sean-talos/cm733mfny003801r06qb6exoz',
        center: [-95.7129, 37.0902],
        zoom: 3
      });

      mapRef.current.on('load', () => {
        mapRef.current?.addSource('airports', {
          type: 'vector',
          url: 'mapbox://sean-talos.c3tqbny2'
        });

        mapRef.current?.addLayer({
          'id': 'airports-layer',
          'type': 'circle',
          'source': 'airports',
          'source-layer': 'Airports28062017_894444143927-4gzpfj',
          'paint': {
            'circle-color': '#4CAF50',  // Green color
            'circle-radius': 2,
            'circle-opacity': 1
          },
          'layout': {
            'visibility': showAirports ? 'visible' : 'none'  // Set initial visibility
          }
        });

        // Create a popup but don't add it to the map yet
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
        });

        // Mouse enter event - show popup
        mapRef.current?.on('mouseenter', 'airports-layer', (e) => {
          if (e.features && e.features.length > 0 && mapRef.current) {
            const feature = e.features[0];
            
            // Change the cursor style
            mapRef.current.getCanvas().style.cursor = 'pointer';
            
            const coordinates = feature.geometry.type === 'Point' 
              ? (feature.geometry.coordinates as [number, number])
              : [0, 0];

            // Create the popup content
            const html = `
              <h3>${feature.properties?.name || 'Unknown Airport'}</h3>
              <p>IATA: ${feature.properties?.iata_code || 'N/A'}</p>
              <p>City: ${feature.properties?.municipality || 'N/A'}</p>
              <p>Country: ${feature.properties?.iso_country || 'N/A'}</p>
            `;

            // Populate the popup and set its coordinates
            popup
              .setLngLat(coordinates as [number, number])
              .setHTML(html)
              .addTo(mapRef.current);
          }
        });

        // Mouse leave event - remove popup
        mapRef.current?.on('mouseleave', 'airports-layer', () => {
          if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = '';
            popup.remove();
          }
        });
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
      }
    }
  }, []); // Remove showAirports from dependencies

  useEffect(() => {
    if (mapRef.current) {
      // Wait for both the map and style to be loaded
      const setVisibility = () => {
        const visibility = showAirports ? 'visible' : 'none';
        mapRef.current?.setLayoutProperty('airports-layer', 'visibility', visibility);
      };

      if (mapRef.current.isStyleLoaded()) {
        setVisibility();
      } else {
        mapRef.current.once('style.load', setVisibility);
      }
    }
  }, [showAirports]);

  useEffect(() => {
    if (mapRef.current && data.length > 0 && showPeople) {
      const markers: mapboxgl.Marker[] = [];

      data.forEach((person) => {
        const lat = parseFloat(person.Latitude);
        const lng = parseFloat(person.Longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <h3>${person["First Name"]} ${person["Last Name"]}</h3>
            <p>${person.Title}</p>
            <p>${person["Company Name"]}</p>
            <p>${person.Email}</p>
          `);

          const marker = new mapboxgl.Marker()
            .setLngLat([lng, lat])
            .setPopup(popup);
          
          if (mapRef.current) {
            marker.addTo(mapRef.current);
            markers.push(marker);
          }
        }
      });

      return () => {
        markers.forEach(marker => marker.remove());
      };
    }
  }, [data, showPeople]);

  return (
    <>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1 }}>
        <button 
          onClick={() => setShowPeople(!showPeople)}
          style={{ 
            margin: '5px',
            padding: '8px 16px',
            backgroundColor: showPeople ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showPeople ? 'Hide People' : 'Show People'}
        </button>
        <button 
          onClick={() => setShowAirports(!showAirports)}
          style={{ 
            margin: '5px',
            padding: '8px 16px',
            backgroundColor: showAirports ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showAirports ? 'Hide Airports' : 'Show Airports'}
        </button>
      </div>
      <div id='map-container' ref={mapContainerRef}/>
    </>
  )
}

export default App