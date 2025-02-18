/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useEffect, useState   } from 'react'
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';

import './App.css'
import { getData } from './api/getData';
import airplaneIcon from './assets/airplane (4).png';

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
        style: 'mapbox://styles/sean-talos/cm7a6dgvi002p01r7aj1yd9ue',
        center: [-95.7129, 37.0902],
        zoom: 3
      });

      mapRef.current.on('load', () => {
        // Load the airplane icon
        mapRef.current?.loadImage(airplaneIcon, (error, image) => {
          if (error) throw error;
          
          // Add the image to the map style
          if (image && mapRef.current) {
            mapRef.current.addImage('airplane-marker', image);
          }

          // Add the GeoJSON source with clustering
          mapRef.current?.addSource('airports', {
            type: 'geojson',
            data: 'https://gis.wfp.org/arcgis/rest/services/GLOBAL/GlobalAirports/FeatureServer/0/query?where=status+%3D+%27Open%27&outFields=*&returnGeometry=true&f=geojson',
            cluster: true,
            clusterMaxZoom: 10,
            clusterRadius: 50
          });

          // Add clustered layer for airports
          mapRef.current?.addLayer({
            'id': 'airports-clusters',
            'type': 'circle',
            'source': 'airports',
            'filter': ['has', 'point_count'],
            'paint': {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#4CAF50',
                10,
                '#2196F3',
                30,
                '#9C27B0'
              ],
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                15,
                10,
                20,
                30,
                25
              ]
            },
            'layout': {
              'visibility': showAirports ? 'visible' : 'none'
            }
          });

          // Add cluster count text layer for airports
          mapRef.current?.addLayer({
            'id': 'airports-cluster-count',
            'type': 'symbol',
            'source': 'airports',
            'filter': ['has', 'point_count'],
            'layout': {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12,
              'visibility': showAirports ? 'visible' : 'none'
            },
            'paint': {
              'text-color': '#ffffff'
            }
          });

          // Add unclustered points as circles
          mapRef.current?.addLayer({
            'id': 'airports-points',
            'type': 'symbol',
            'source': 'airports',
            'filter': ['!', ['has', 'point_count']],
            'layout': {
              'visibility': showAirports ? 'visible' : 'none',
              'icon-image': 'airplane-marker',
              'icon-size': 0.1,  // Adjust this value to resize your icon
              'icon-allow-overlap': true
            }
          });

          // Create popup for airports
          const airportPopup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true
          });

          // Add click event for airports
          mapRef.current?.on('click', 'airports-points', (e) => {
            if (e.features && e.features.length > 0 && mapRef.current) {
              const feature = e.features[0];
              const coordinates = feature.geometry.type === 'Point' 
                ? (feature.geometry.coordinates as [number, number])
                : [0, 0];

              const html = `
                <h3>${feature.properties?.nameshort || 'Unknown Airport'}</h3>
                <p>IATA: ${feature.properties?.iata || 'N/A'}</p>
              `;

              // Remove any existing popup
              airportPopup.remove();
              
              // Show new popup
              airportPopup
                .setLngLat(coordinates as [number, number])
                .setHTML(html)
                .addTo(mapRef.current);
            }
          });

          // Add hover effects for airports
          mapRef.current?.on('mouseenter', 'airports-points', () => {
            if (mapRef.current) {
              mapRef.current.getCanvas().style.cursor = 'pointer';
            }
          });

          mapRef.current?.on('mouseleave', 'airports-points', () => {
            if (mapRef.current) {
              mapRef.current.getCanvas().style.cursor = '';
            }
          });
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
        mapRef.current?.setLayoutProperty('airports-clusters', 'visibility', visibility);
        mapRef.current?.setLayoutProperty('airports-cluster-count', 'visibility', visibility);
        mapRef.current?.setLayoutProperty('airports-points', 'visibility', visibility);
      };

      if (mapRef.current.isStyleLoaded()) {
        setVisibility();
      } else {
        mapRef.current.once('style.load', setVisibility);
      }
    }
  }, [showAirports]);

  useEffect(() => {
    if (mapRef.current && data.length > 0) {
      // Remove existing source if it exists
      if (mapRef.current.getSource('people')) {
        mapRef.current.removeLayer('people-clusters');
        mapRef.current.removeLayer('people-points');
        mapRef.current.removeSource('people');
      }
  
      mapRef.current.addSource('people', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: data.map(person => ({
            type: 'Feature',
            properties: {
              name: `${person["First Name"]} ${person["Last Name"]}`,
              title: person.Title,
              company: person["Company Name"],
              email: person.Email,
              HomeState: person["HomeState"],
              HomeZipCode: person["HomeZipCode"],
              WorkState: person["WorkState"],
              WorkZipCode: person["WorkZipCode"]
            },
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(person.Longitude), parseFloat(person.Latitude)]
            }
          }))
        },
        cluster: true,
        clusterMaxZoom: 14, // Adjust based on zoom level preference
        clusterRadius: 50 // Determines cluster size
      });
  
      // Add clustered layer
      mapRef.current.addLayer({
        id: 'people-clusters',
        type: 'circle',
        source: 'people',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#DAA520',
          'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 25]
        },
        layout: {
          'visibility': showPeople ? 'visible' : 'none'  // Add visibility control
        }
      });

      // Add cluster count text layer
      mapRef.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'people',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'visibility': showPeople ? 'visible' : 'none'  // Add visibility control
        },
        paint: {
          'text-color': '#ffffff'
        }
      });
  
      // Add individual people markers (non-clustered)
      mapRef.current.addLayer({
        id: 'people-points',
        type: 'circle',
        source: 'people',
        filter: ['!', ['has', 'point_count']], // Only shows non-clustered points
        paint: {
          'circle-color': '#D4AF37',
          'circle-radius': 6
        },
        layout: {
          'visibility': showPeople ? 'visible' : 'none'  // Add visibility control
        }
      });
  
      // Create a popup but don't add it to the map yet
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true
      });

      // Wait for the layer to be loaded before adding click handlers
      mapRef.current.on('sourcedata', (e) => {
        if (e.sourceId === 'people' && mapRef.current?.isSourceLoaded('people')) {
          // Click event for individual people markers
          mapRef.current.on('click', 'people-points', (e) => {
            if (e.features && e.features.length > 0 && mapRef.current) {
              const feature = e.features[0];
              const coordinates = feature.geometry.type === 'Point' 
                ? (feature.geometry.coordinates as [number, number])
                : [0, 0];

              const html = `
                <h3>${feature.properties?.name || 'Unknown'}</h3>
                <p>Title: ${feature.properties?.title || 'N/A'}</p>
                <p>Company: ${feature.properties?.company || 'N/A'}</p>
                <p>Email: ${feature.properties?.email || 'N/A'}</p>
                <p>Home state: ${feature.properties?.HomeState || 'N/A'}</p>
                <p>Home zip code: ${feature.properties?.HomeZipCode || 'N/A'}</p>
                <p>Work state: ${feature.properties?.WorkState || 'N/A'}</p>
                <p>Work zip code: ${feature.properties?.WorkZipCode || 'N/A'}</p>
              `;

              // Remove any existing popup
              popup.remove();
              
              // Show new popup
              popup
                .setLngLat(coordinates as [number, number])
                .setHTML(html)
                .addTo(mapRef.current);
            }
          });
        }
      });

      // Add hover effect for better UX
      mapRef.current.on('mouseenter', 'people-points', () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = 'pointer';
        }
      });

      mapRef.current.on('mouseleave', 'people-points', () => {
        if (mapRef.current) {
          mapRef.current.getCanvas().style.cursor = '';
        }
      });

      return () => {
        if (mapRef.current?.getSource('people')) {
          mapRef.current?.removeLayer('cluster-count');
          mapRef.current?.removeLayer('people-clusters');
          mapRef.current?.removeLayer('people-points');
          mapRef.current?.removeSource('people');
        }
      };
    }
  }, [data, showPeople]);

  // Add new useEffect for controlling people layers visibility
  useEffect(() => {
    if (mapRef.current) {
      const setVisibility = () => {
        const visibility = showPeople ? 'visible' : 'none';
        mapRef.current?.setLayoutProperty('people-clusters', 'visibility', visibility);
        mapRef.current?.setLayoutProperty('cluster-count', 'visibility', visibility);
        mapRef.current?.setLayoutProperty('people-points', 'visibility', visibility);
      };

      if (mapRef.current.isStyleLoaded()) {
        setVisibility();
      } else {
        mapRef.current.once('style.load', setVisibility);
      }
    }
  }, [showPeople]);

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