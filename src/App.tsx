/* eslint-disable @typescript-eslint/no-unused-vars */
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
  const [showChoropleth, setShowChoropleth] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const data = await getData('1naE-xN9IVLXWTa6qh1RjMZTzjki7ZANfPl15oqu7apA', 'People')
      // Filter out entries with invalid coordinates
      const validData = data.filter((person: PersonMarker) => {
        const lat = parseFloat(person.Latitude);
        const lng = parseFloat(person.Longitude);
        return !isNaN(lat) && !isNaN(lng) && 
               lat >= -90 && lat <= 90 && 
               lng >= -180 && lng <= 180;
      });
      setData(validData);
    }
    fetchData()
  }, [])

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1Ijoic2Vhbi10YWxvcyIsImEiOiJjbTcxeDV3Z3kwNGl1MmlwdmFidDl3b3AwIn0.LpR8CLrvzXb4y_ZdNz8MsQ'
    if (mapContainerRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/sean-talos/cm7bp1p9c005q01r40i3k87dn',
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
        });

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

        // Add unclustered points as circles with labels
        mapRef.current?.addLayer({
          'id': 'airports-points',
          'type': 'symbol',
          'source': 'airports',
          'filter': ['!', ['has', 'point_count']],
          'layout': {
            'visibility': showAirports ? 'visible' : 'none',
            'icon-image': 'airplane-marker',
            'icon-size': 0.1,
            'icon-allow-overlap': true,
            'text-field': ['get', 'nameshort'],
            'text-variable-anchor': ['top'],
            'text-radial-offset': 0.8,
            'text-justify': 'auto',
            'text-size': 14,
            'text-optional': true,
            'text-allow-overlap': false,
            'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold']
          },
          'paint': {
            'text-color': '#000000',
            'text-halo-color': '#ffffff',
            'text-halo-width': 3
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
      // Remove existing layers and source if they exist
      const layersToRemove = ['cluster-count', 'people-clusters', 'people-points', 'people-labels'];
      layersToRemove.forEach(layer => {
        if (mapRef.current?.getLayer(layer)) {
          mapRef.current.removeLayer(layer);
        }
      });

      if (mapRef.current.getSource('people')) {
        mapRef.current.removeSource('people');
      }

      // Wait for the removal to complete before adding new source and layers
      setTimeout(() => {
        if (!mapRef.current?.getSource('people')) {
          // Group points by location
          const locationGroups = data.reduce((acc: { [key: string]: PersonMarker[] }, person) => {
            const key = `${person.Latitude},${person.Longitude}`;
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(person);
            return acc;
          }, {});

          // Create features with adjusted coordinates for overlapping points
          const features = Object.entries(locationGroups).flatMap(([_, group]) => {
            if (group.length === 1) {
              // Single point, no adjustment needed
              const person = group[0];
              return [{
                type: 'Feature',
                properties: {
                  name: `${person["First Name"]} ${person["Last Name"]}`,
                  title: person.Title,
                  company: person["Company Name"],
                  email: person.Email,
                  HomeState: person["HomeState"],
                  HomeZipCode: person["HomeZipCode"],
                  WorkState: person["WorkState"],
                  WorkZipCode: person["WorkZipCode"],
                  pointCount: group.length
                },
                geometry: {
                  type: 'Point',
                  coordinates: [parseFloat(person.Longitude), parseFloat(person.Latitude)]
                }
              }];
            } else {
              // Multiple points, create a spiral pattern
              return group.map((person, index) => {
                const angle = (index * (2 * Math.PI)) / group.length;
                const radius = 0.0001 * (1 + index * 0.5); // Adjust radius as needed
                const lat = parseFloat(person.Latitude) + radius * Math.cos(angle);
                const lng = parseFloat(person.Longitude) + radius * Math.sin(angle);
                
                return {
                  type: 'Feature',
                  properties: {
                    name: `${person["First Name"]} ${person["Last Name"]}`,
                    title: person.Title,
                    company: person["Company Name"],
                    email: person.Email,
                    HomeState: person["HomeState"],
                    HomeZipCode: person["HomeZipCode"],
                    WorkState: person["WorkState"],
                    WorkZipCode: person["WorkZipCode"],
                    pointCount: group.length
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
                  }
                };
              });
            }
          });

          mapRef.current?.addSource('people', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: features as any
            },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
          });

          // Add clustered layer
          mapRef.current?.addLayer({
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
          mapRef.current?.addLayer({
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
          mapRef.current?.addLayer({
            id: 'people-points',
            type: 'circle',
            source: 'people',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#DAA520',
              'circle-radius': 10,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'
            },
            layout: {
              'visibility': showPeople ? 'visible' : 'none'
            }
          });

          // Add a separate layer for labels
          mapRef.current?.addLayer({
            id: 'people-labels',
            type: 'symbol',
            source: 'people',
            filter: ['!', ['has', 'point_count']],
            layout: {
              'visibility': showPeople ? 'visible' : 'none',
              'text-field': ['get', 'name'],
              'text-variable-anchor': ['top'],
              'text-radial-offset': 0.8,
              'text-justify': 'auto',
              'text-size': 14,
              'text-optional': true,
              'text-allow-overlap': false,
              'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold']
            },
            paint: {
              'text-color': '#000000',
              'text-halo-color': '#ffffff',
              'text-halo-width': 3
            }
          });
      
          // Create a popup but don't add it to the map yet
          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true
          });

          // Wait for the layer to be loaded before adding click handlers
          mapRef.current?.on('sourcedata', (e) => {
            if (e.sourceId === 'people' && mapRef.current?.isSourceLoaded('people')) {
              // Click event for individual people markers
              mapRef.current?.on('click', 'people-points', (e) => {
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
          mapRef.current?.on('mouseenter', 'people-points', () => {
            if (mapRef.current) {
              mapRef.current.getCanvas().style.cursor = 'pointer';
            }
          });

          mapRef.current?.on('mouseleave', 'people-points', () => {
            if (mapRef.current) {
              mapRef.current.getCanvas().style.cursor = '';
            }
          });

          // Add click handler for clusters
          mapRef.current?.on('click', 'people-clusters', (e) => {
            if (e.features && e.features[0].geometry.type === 'Point') {
              const coordinates = e.features[0].geometry.coordinates as [number, number];
              const clusterId = e.features[0].properties?.cluster_id;
              const source = mapRef.current?.getSource('people') as mapboxgl.GeoJSONSource;

              source.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err || !mapRef.current) return;

                mapRef.current.easeTo({
                  center: coordinates,
                  zoom: (zoom ?? 14) + 1, // Fallback to zoom level 14 if undefined
                  duration: 500
                });
              });
            }
          });

          // Add hover effects for clusters
          mapRef.current?.on('mouseenter', 'people-clusters', () => {
            if (mapRef.current) {
              mapRef.current.getCanvas().style.cursor = 'pointer';
            }
          });

          mapRef.current?.on('mouseleave', 'people-clusters', () => {
            if (mapRef.current) {
              mapRef.current.getCanvas().style.cursor = '';
            }
          });
        }
      }, 0);
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

  // Add new useEffect for controlling choropleth layer visibility
  useEffect(() => {
    if (mapRef.current) {
      const setVisibility = () => {
        const visibility = showChoropleth ? 'visible' : 'none';
        mapRef.current?.setLayoutProperty('choropleth-fill', 'visibility', visibility);
      };

      if (mapRef.current.isStyleLoaded()) {
        setVisibility();
      } else {
        mapRef.current.once('style.load', setVisibility);
      }
    }
  }, [showChoropleth]);

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
        <button 
          onClick={() => setShowChoropleth(!showChoropleth)}
          style={{ 
            margin: '5px',
            padding: '8px 16px',
            backgroundColor: showChoropleth ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showChoropleth ? 'Hide States' : 'Show States'}
        </button>
      </div>
      <div id='map-container' ref={mapContainerRef}/>
    </>
  )
}

export default App