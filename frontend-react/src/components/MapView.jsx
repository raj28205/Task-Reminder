import { useState } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Handles clicks on the map to drop a new geofence center point
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapView({ geofences, userPosition, pendingPoint, onMapClick, markerTheme }) {
  const [mapLayer, setMapLayer] = useState(() => {
    return localStorage.getItem("mapLayer") || "standard";
  });

  const layers = {
    standard: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    terrain: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
    }
  };

  const handleLayerChange = (layerKey) => {
    setMapLayer(layerKey);
    localStorage.setItem("mapLayer", layerKey);
  };

  const center = userPosition
    ? [userPosition.lat, userPosition.lng]
    : geofences[0]
    ? [geofences[0].center_lat, geofences[0].center_lng]
    : [23.0225, 72.5714]; // fallback: Ahmedabad

  // Define custom icons based on the chosen theme
  const getMarkerIcon = (theme) => {
    switch (theme) {
      case "pulse":
        return L.divIcon({
          className: "leaflet-pulse-marker",
          html: `<div class="pulse-marker-container"><div class="pulse-core"></div><div class="pulse-ring"></div></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
      case "pin":
        return L.divIcon({
          className: "leaflet-pin-marker",
          html: `<svg viewBox="0 0 24 24" width="32" height="32" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/></svg>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -28],
        });
      case "arrow":
      default:
        return L.divIcon({
          className: "leaflet-arrow-marker",
          html: `<svg viewBox="0 0 24 24" width="32" height="32" style="filter: drop-shadow(0 2px 5px rgba(99, 102, 241, 0.4));"><path d="M12 3l8 18-8-6-8 6z" fill="#6366f1" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/></svg>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Floating Layer Switcher */}
      <div className="map-layer-selector">
        <button 
          className={`layer-btn ${mapLayer === "standard" ? "active" : ""}`}
          onClick={() => handleLayerChange("standard")}
        >
          Standard
        </button>
        <button 
          className={`layer-btn ${mapLayer === "satellite" ? "active" : ""}`}
          onClick={() => handleLayerChange("satellite")}
        >
          Satellite
        </button>
        <button 
          className={`layer-btn ${mapLayer === "terrain" ? "active" : ""}`}
          onClick={() => handleLayerChange("terrain")}
        >
          Terrain
        </button>
      </div>

      <MapContainer center={center} zoom={14} className="map-container">
        <TileLayer
          key={mapLayer}
          attribution={layers[mapLayer].attribution}
          url={layers[mapLayer].url}
        />

        <ClickHandler onMapClick={onMapClick} />

        {userPosition && (
          <Marker position={[userPosition.lat, userPosition.lng]} icon={getMarkerIcon(markerTheme)}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {pendingPoint && (
          <>
            <Marker
              position={[pendingPoint.lat, pendingPoint.lng]}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  onMapClick(pos.lat, pos.lng);
                },
              }}
              icon={getMarkerIcon("pin")}
            >
              <Popup>Drag to adjust geofence center</Popup>
            </Marker>
            <Circle
              center={[pendingPoint.lat, pendingPoint.lng]}
              radius={pendingPoint.radius || 150}
              pathOptions={{ color: "#e07a3f", dashArray: "6 6" }}
            />
          </>
        )}

        {geofences.map((g) => (
          <Circle
            key={g.id}
            center={[g.center_lat, g.center_lng]}
            radius={g.radius_meters}
            pathOptions={{ color: "#2f6f4f" }}
          >
            <Popup>
              <strong>{g.name}</strong>
              <br />
              {g.work_items?.length
                ? g.work_items.map((w) => <div key={w.id}>• {w.title}</div>)
                : "No tasks yet"}
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
