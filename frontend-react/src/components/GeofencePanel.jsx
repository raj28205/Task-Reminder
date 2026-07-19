import { useState } from "react";
import { api } from "../api/client";

export default function GeofencePanel({
  pendingPoint,
  setPendingPoint,
  geofences,
  refreshGeofences,
}) {
  const [creationMode, setCreationMode] = useState("coordinates"); // "coordinates" or "address"
  const [addressInput, setAddressInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [matchedAddress, setMatchedAddress] = useState("");

  const [name, setName] = useState("");
  const [radius, setRadius] = useState(150);
  const [workTitle, setWorkTitle] = useState("");
  const [workDesc, setWorkDesc] = useState("");
  const [activeGeofenceId, setActiveGeofenceId] = useState(null);
  const [error, setError] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    if (!addressInput.trim()) return;
    setIsSearching(true);
    setError("");
    setMatchedAddress("");
    try {
      const result = await api.geocodeAddress(addressInput);
      setPendingPoint({ lat: result.lat, lng: result.lng });
      setMatchedAddress(result.display_name);
    } catch (err) {
      setError(err.message || "Failed to search address.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCreateGeofence(e) {
    e.preventDefault();
    if (!pendingPoint) {
      setError("Click a spot on the map or search an address first to set the geofence center.");
      return;
    }
    try {
      const addrToSave = (creationMode === "address" && matchedAddress) ? matchedAddress : null;
      await api.createGeofence(name, pendingPoint.lat, pendingPoint.lng, Number(radius), addrToSave);
      setName("");
      setAddressInput("");
      setMatchedAddress("");
      setPendingPoint(null);
      await refreshGeofences();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddWorkItem(e) {
    e.preventDefault();
    if (!activeGeofenceId) {
      setError("Pick a geofence to attach this task to.");
      return;
    }
    try {
      await api.createWorkItem(activeGeofenceId, workTitle, workDesc);
      setWorkTitle("");
      setWorkDesc("");
      await refreshGeofences();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="side-panel">
      <section>
        <h2>1. New geofence area</h2>
        
        <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', fontSize: '0.9em' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input 
              type="radio" 
              checked={creationMode === 'coordinates'} 
              onChange={() => setCreationMode('coordinates')} 
            /> Map click
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input 
              type="radio" 
              checked={creationMode === 'address'} 
              onChange={() => setCreationMode('address')} 
            /> Enter address
          </label>
        </div>

        {creationMode === 'address' && (
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
            <input 
              type="text" 
              placeholder="Type an address..." 
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
        )}

        <p className="hint">
          {pendingPoint
            ? `Center set: ${pendingPoint.lat.toFixed(5)}, ${pendingPoint.lng.toFixed(5)}`
            : (creationMode === 'coordinates' ? "Click anywhere on the map to set the center point." : "Search an address to set the center point.")}
        </p>
        
        {matchedAddress && creationMode === 'address' && pendingPoint && (
          <p style={{ fontSize: '0.9em', color: '#16a34a', marginTop: '-5px', marginBottom: '10px' }}>
            Did you mean: {matchedAddress}
            <br />
            <small style={{ color: '#555' }}>You can drag the pin on the map to adjust it.</small>
          </p>
        )}

        <form onSubmit={handleCreateGeofence}>
          <input
            placeholder="Area name (e.g. Warehouse A)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label>
            Radius (meters)
            <input
              type="number"
              min="10"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
          </label>
          <button type="submit">Save geofence</button>
        </form>
      </section>

      <section>
        <h2>2. Add work / reminder</h2>
        <form onSubmit={handleAddWorkItem}>
          <select
            value={activeGeofenceId ?? ""}
            onChange={(e) => setActiveGeofenceId(Number(e.target.value))}
          >
            <option value="" disabled>
              Choose a geofence
            </option>
            {geofences.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Task title"
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Details (optional)"
            value={workDesc}
            onChange={(e) => setWorkDesc(e.target.value)}
          />
          <button type="submit">Add task</button>
        </form>
      </section>

      <section>
        <h2>Your geofences</h2>
        <ul className="geofence-list">
          {geofences.map((g) => (
            <li key={g.id}>
              <strong>{g.name}</strong> — {g.radius_meters}m
              {g.address && <div style={{ fontSize: '0.8em', color: '#555', marginTop: '3px' }}>{g.address}</div>}
              <ul>
                {g.work_items?.map((w) => (
                  <li key={w.id} className={w.is_done ? "done" : ""}>
                    {w.title}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
