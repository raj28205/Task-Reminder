import { useState, useEffect } from "react";
import { api } from "../api/client";
import MapView from "./MapView";

export default function SettingsView({ 
  geofences, 
  pendingPoint, 
  setPendingPoint, 
  refreshGeofences, 
  userPosition,
  markerTheme
}) {
  const [settingsTab, setSettingsTab] = useState("create"); // create | update | bulk
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Form State
  const [createMode, setCreateMode] = useState("coordinates");
  const [createAddressInput, setCreateAddressInput] = useState("");
  const [createMatchedAddress, setCreateMatchedAddress] = useState("");
  const [isSearchingCreate, setIsSearchingCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createRadius, setCreateRadius] = useState(150);
  const [createTasksRaw, setCreateTasksRaw] = useState("");

  // Update Form State
  const [selectedGeofenceId, setSelectedGeofenceId] = useState("");
  const [editName, setEditName] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [editRadius, setEditRadius] = useState(150);
  const [editAddress, setEditAddress] = useState("");
  const [editSearchInput, setEditSearchInput] = useState("");
  const [isSearchingEdit, setIsSearchingEdit] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Bulk Form State
  const [bulkText, setBulkText] = useState("");
  const [bulkParsed, setBulkParsed] = useState([]);
  const [bulkProgress, setBulkProgress] = useState("");

  // Sync radius changes to pending point circle in real-time
  useEffect(() => {
    if (pendingPoint && settingsTab === "create") {
      setPendingPoint({ ...pendingPoint, radius: Number(createRadius) });
    }
  }, [createRadius, settingsTab, pendingPoint, setPendingPoint]);

  // Load selected geofence for editing
  useEffect(() => {
    if (selectedGeofenceId) {
      const g = geofences.find(f => f.id === Number(selectedGeofenceId));
      if (g) {
        setEditName(g.name);
        setEditLat(g.center_lat);
        setEditLng(g.center_lng);
        setEditRadius(g.radius_meters);
        setEditAddress(g.address || "");
        setEditSearchInput("");
      }
    }
  }, [selectedGeofenceId, geofences]);

  const handleSearchCreate = async (e) => {
    e.preventDefault();
    if (!createAddressInput.trim()) return;
    setIsSearchingCreate(true);
    setError("");
    setCreateMatchedAddress("");
    try {
      const result = await api.geocodeAddress(createAddressInput);
      setPendingPoint({ lat: result.lat, lng: result.lng, radius: Number(createRadius) });
      setCreateMatchedAddress(result.display_name);
    } catch (err) {
      setError(err.message || "Failed to search address.");
    } finally {
      setIsSearchingCreate(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!pendingPoint) {
      setError("Please click on the map or search an address first to select coordinates.");
      return;
    }
    try {
      const addrToSave = (createMode === "address" && createMatchedAddress) ? createMatchedAddress : null;
      const res = await api.createGeofence(createName, pendingPoint.lat, pendingPoint.lng, Number(createRadius), addrToSave);
      
      if (createTasksRaw.trim()) {
        const tasks = createTasksRaw.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
        if (tasks.length > 0) {
          const bulkItems = tasks.map(t => ({ title: t, description: "Initial Reminder" }));
          await api.bulkCreateWorkItems(res.id, bulkItems);
        }
      }

      setCreateName("");
      setCreateRadius(150);
      setCreateTasksRaw("");
      setCreateAddressInput("");
      setCreateMatchedAddress("");
      setPendingPoint(null);
      setSuccess("Geofence created successfully!");
      await refreshGeofences();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSearchEdit = async (e) => {
    e.preventDefault();
    if (!editSearchInput.trim()) return;
    setIsSearchingEdit(true);
    setError("");
    try {
      const result = await api.geocodeAddress(editSearchInput);
      setEditLat(result.lat);
      setEditLng(result.lng);
      setEditAddress(result.display_name);
      setSuccess("Address found. You can adjust the pin on the map if needed.");
    } catch (err) {
      setError(err.message || "Failed to search address.");
    } finally {
      setIsSearchingEdit(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedGeofenceId) {
      setError("Please select a geofence to update.");
      return;
    }
    try {
      await api.updateGeofence(Number(selectedGeofenceId), editName, Number(editLat), Number(editLng), Number(editRadius), editAddress);
      setSuccess("Geofence details updated successfully.");
      await refreshGeofences();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteGeofence = async () => {
    if (!selectedGeofenceId) return;
    if (!window.confirm("Are you sure you want to delete this geofence? This deletes all associated work reminders too.")) return;
    setError("");
    setSuccess("");
    try {
      await api.deleteGeofence(Number(selectedGeofenceId));
      setSelectedGeofenceId("");
      setSuccess("Geofence deleted successfully.");
      await refreshGeofences();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddTaskToEdit = async (e) => {
    e.preventDefault();
    if (!selectedGeofenceId || !newTaskTitle.trim()) return;
    setError("");
    try {
      await api.createWorkItem(Number(selectedGeofenceId), newTaskTitle.trim(), "Added from settings editor");
      setNewTaskTitle("");
      setSuccess("Task reminder added successfully.");
      await refreshGeofences();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task reminder?")) return;
    setError("");
    setSuccess("");
    try {
      await api.deleteWorkItem(taskId);
      setSuccess("Task reminder deleted successfully.");
      await refreshGeofences();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkTextChange = (text) => {
    setBulkText(text);
    const lines = text.split("\n");
    const parsed = lines.map(line => {
      const parts = line.split("|");
      const name = parts[0]?.trim() || "";
      const address = parts[1]?.trim() || "";
      const radius = Number(parts[2]?.trim()) || 100;
      return { name, address, radius };
    }).filter(item => item.name !== "");
    setBulkParsed(parsed);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n");
      const parsed = lines.map(line => {
        const parts = line.split(",");
        const name = parts[0]?.replace(/^["']|["']$/g, "").trim() || "";
        const address = parts[1]?.replace(/^["']|["']$/g, "").trim() || "";
        const radius = Number(parts[2]?.replace(/^["']|["']$/g, "").trim()) || 100;
        return { name, address, radius };
      }).filter(item => item.name !== "" && item.name.toLowerCase() !== "name");
      setBulkParsed(parsed);
      setBulkText(parsed.map(p => `${p.name} | ${p.address} | ${p.radius}`).join("\n"));
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (bulkParsed.length === 0) {
      setError("No valid geofences parsed. Enter geofences in textarea or upload a CSV first.");
      return;
    }

    try {
      setBulkProgress(`Starting geocoding for ${bulkParsed.length} geofences...`);
      const finalItems = [];

      for (let i = 0; i < bulkParsed.length; i++) {
        const item = bulkParsed[i];
        setBulkProgress(`Geocoding ${i + 1} of ${bulkParsed.length}: ${item.address}...`);
        
        let lat = null;
        let lng = null;
        let displayAddress = item.address;

        if (item.address) {
          try {
            const result = await api.geocodeAddress(item.address);
            lat = result.lat;
            lng = result.lng;
            displayAddress = result.display_name;
          } catch (err) {
            // Ignore single failures, just leave lat/lng null and let backend fail that row or fallback
            console.warn(`Failed to geocode: ${item.address}`);
          }
          // Nominatim rate limit: 1 request per second
          await new Promise(r => setTimeout(r, 1200));
        }
        
        finalItems.push({
          name: item.name,
          address: displayAddress,
          center_lat: lat,
          center_lng: lng,
          radius_meters: item.radius
        });
      }

      setBulkProgress("Saving geofences to database...");
      
      const res = await api.bulkCreateGeofences(finalItems);
      setSuccess(`Successfully uploaded ${res.inserted_count} geofences!`);
      setBulkText("");
      setBulkParsed([]);
      await refreshGeofences();
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkProgress("");
    }
  };

  return (
    <div className="settings-split-layout">
      {/* Left Panel: Form fields */}
      <div className="settings-left-panel">
        <div className="tabs-header">
          <button 
            className={`tab-btn ${settingsTab === "create" ? "active" : ""}`}
            onClick={() => { setSettingsTab("create"); setError(""); setSuccess(""); }}
          >
            Create
          </button>
          <button 
            className={`tab-btn ${settingsTab === "update" ? "active" : ""}`}
            onClick={() => { setSettingsTab("update"); setError(""); setSuccess(""); }}
          >
            Update
          </button>
          <button 
            className={`tab-btn ${settingsTab === "bulk" ? "active" : ""}`}
            onClick={() => { setSettingsTab("bulk"); setError(""); setSuccess(""); }}
          >
            Bulk Upload
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>}
        {bulkProgress && <p className="info-alert" style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{bulkProgress}</p>}

        {/* Tab 1: Create */}
        {settingsTab === "create" && (
          <div className="settings-card">
            <h3>Create Geofence</h3>
            
            <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', fontSize: '0.9em' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input 
                  type="radio" 
                  checked={createMode === 'coordinates'} 
                  onChange={() => setCreateMode('coordinates')} 
                /> Map click
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input 
                  type="radio" 
                  checked={createMode === 'address'} 
                  onChange={() => setCreateMode('address')} 
                /> Enter address
              </label>
            </div>

            {createMode === 'address' && (
              <form onSubmit={handleSearchCreate} className="form-group" style={{ marginBottom: '15px' }}>
                <label>Address Search</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input 
                    type="text" 
                    placeholder="Type an address..." 
                    value={createAddressInput}
                    onChange={(e) => setCreateAddressInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" disabled={isSearchingCreate} className="primary-btn">
                    {isSearchingCreate ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>
            )}

            <div className="info-alert">
              {pendingPoint && pendingPoint.lat !== undefined && pendingPoint.lng !== undefined
                ? `Center selected: ${Number(pendingPoint.lat).toFixed(5)}, ${Number(pendingPoint.lng).toFixed(5)}. Click the map on the right to relocate.` 
                : (createMode === 'coordinates' ? "Click anywhere on the map to set the geofence center." : "Search an address to set the center point.")
              }
            </div>

            {createMatchedAddress && createMode === 'address' && pendingPoint && (
              <p style={{ fontSize: '0.9em', color: 'var(--accent-teal)', marginBottom: '15px' }}>
                Found: {createMatchedAddress}
              </p>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Geofence Name</label>
                <input 
                  placeholder="e.g. Warehouse A, Client HQ" 
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Radius (meters)</label>
                <input 
                  type="number" 
                  min="10" 
                  max="2000"
                  value={createRadius}
                  onChange={(e) => setCreateRadius(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Initial Tasks (Optional, separated by commas)</label>
                <textarea 
                  placeholder="e.g. Deliver checks, Take photos, Sign logs" 
                  rows="3"
                  value={createTasksRaw}
                  onChange={(e) => setCreateTasksRaw(e.target.value)}
                />
              </div>

              <button type="submit" className="primary-btn" style={{ marginTop: '15px' }}>Save</button>
            </form>
          </div>
        )}

        {/* Tab 2: Update */}
        {settingsTab === "update" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div className="settings-card">
              <h3>Select Geofence to Update</h3>
              <div className="form-group">
                <select 
                  value={selectedGeofenceId} 
                  onChange={(e) => setSelectedGeofenceId(e.target.value)}
                >
                  <option value="">-- Choose Geofence --</option>
                  {geofences.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedGeofenceId && (
              <>
                <form className="settings-card" onSubmit={handleUpdateSubmit}>
                  <h3>Modify Geofence Details</h3>
                  
                  <div className="form-group">
                    <label>Area Name</label>
                    <input 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Address Search (Optional)</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input 
                        type="text" 
                        placeholder="Search to update center coordinates..." 
                        value={editSearchInput}
                        onChange={(e) => setEditSearchInput(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        onClick={handleSearchEdit}
                        disabled={isSearchingEdit || !editSearchInput.trim()}
                        className="primary-btn"
                      >
                        {isSearchingEdit ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>

                  {editAddress && (
                     <div className="info-alert" style={{ background: 'var(--bg-tertiary)' }}>
                        <strong>Current Address:</strong> {editAddress}
                     </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Center Lat</label>
                      <input 
                        type="number" 
                        step="any"
                        value={editLat}
                        onChange={(e) => setEditLat(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Center Lng</label>
                      <input 
                        type="number" 
                        step="any"
                        value={editLng}
                        onChange={(e) => setEditLng(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="info-alert">
                    Click anywhere on the right-hand map to manually adjust the center coordinates.
                  </div>

                  <div className="form-group">
                    <label>Radius (meters)</label>
                    <input 
                      type="number" 
                      min="10" 
                      max="2000"
                      value={editRadius}
                      onChange={(e) => setEditRadius(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", gap: "0.8rem" }}>
                    <button type="submit" className="primary-btn">Update Details</button>
                    <button type="button" className="danger-btn" onClick={handleDeleteGeofence}>Delete Geofence</button>
                  </div>
                </form>

                <div className="settings-card">
                  <h3>Manage Active Reminders</h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {(() => {
                      const activeG = geofences.find(f => f.id === Number(selectedGeofenceId));
                      if (!activeG || !activeG.work_items || activeG.work_items.length === 0) {
                        return <p className="hint">No reminders attached to this geofence.</p>;
                      }
                      return activeG.work_items.map(w => (
                        <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "0.5rem 0.6rem", background: "var(--bg-tertiary)", borderRadius: "6px", fontSize: "0.85rem" }}>
                          <span style={{ flex: 1, wordBreak: "break-word", textAlign: "left" }}>{w.title}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                            <span style={{ flexShrink: 0, fontWeight: "600", color: w.is_done ? "var(--accent-teal)" : "var(--accent-amber)" }}>
                              {w.is_done ? "Done" : "Pending"}
                            </span>
                            <button 
                              type="button" 
                              style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }}
                              onClick={() => handleDeleteTask(w.id)}
                              title="Delete Task"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  <form onSubmit={handleAddTaskToEdit} style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
                    <input 
                      placeholder="Add new task title..." 
                      style={{ flex: 1, background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", padding: "0.5rem 0.6rem", borderRadius: "6px", color: "var(--text-primary)" }}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      required
                    />
                    <button type="submit" className="primary-btn" style={{ padding: "0.5rem 1rem" }}>Add</button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 3: Bulk */}
        {settingsTab === "bulk" && (
          <form className="settings-card" onSubmit={handleBulkSubmit}>
            <h3>Bulk Upload Geofences</h3>
            <p className="hint" style={{ marginBottom: '15px' }}>
              We will automatically look up the coordinates for the addresses you provide. 
              Because of limits, this process will take around 1 second per location.
            </p>

            <div className="bulk-area">
              <div className="form-group">
                <label>Paste Geofences (Format: <code>Name | Address | Radius</code>)</label>
                <textarea 
                  placeholder="Central Park | New York, NY | 200&#10;Eiffel Tower | Paris, France | 150" 
                  rows="5"
                  value={bulkText}
                  onChange={(e) => handleBulkTextChange(e.target.value)}
                  disabled={bulkProgress !== ""}
                />
              </div>
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>— OR —</div>
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                  <label style={{ margin: 0 }}>Upload CSV</label>
                  <a 
                    href="data:text/csv;charset=utf-8,Name,Address,Radius%0A" 
                    download="bulk_geofences_sample.csv" 
                    className="link-btn" 
                    style={{ fontSize: "0.8rem", textDecoration: "none", fontWeight: "600", color: "var(--accent-blue)" }}
                  >
                    Download Sample CSV
                  </a>
                </div>
                <label className="file-drag-zone" style={{ pointerEvents: bulkProgress !== "" ? 'none' : 'auto', opacity: bulkProgress !== "" ? 0.5 : 1 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>Select CSV File</span>
                  <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSVUpload} disabled={bulkProgress !== ""} />
                </label>
              </div>
            </div>

            {bulkParsed.length > 0 && (
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr><th>Name</th><th>Address</th><th>Radius</th></tr>
                  </thead>
                  <tbody>
                    {bulkParsed.map((item, idx) => (
                      <tr key={idx}><td>{item.name}</td><td>{item.address}</td><td>{item.radius}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button type="submit" className="primary-btn" disabled={bulkProgress !== ""}>
              {bulkProgress !== "" ? "Processing Upload..." : "Confirm Batch Upload"}
            </button>
          </form>
        )}

      </div>

      {/* Right Panel: Map view */}
      <div className="settings-right-map">
        <MapView 
          geofences={geofences}
          userPosition={userPosition}
          pendingPoint={
            settingsTab === "create" 
              ? pendingPoint 
              : settingsTab === "update" && selectedGeofenceId 
                ? { lat: Number(editLat), lng: Number(editLng), radius: Number(editRadius) }
                : null
          }
          onMapClick={(lat, lng) => {
            if (settingsTab === "create") {
              setPendingPoint({ lat, lng, radius: Number(createRadius) });
            } else if (settingsTab === "update" && selectedGeofenceId) {
               setEditLat(lat);
               setEditLng(lng);
               // Optional: Clear matched address when user manually drags/clicks map to adjust
               // setEditAddress(""); 
            }
          }}
          markerTheme={markerTheme}
        />
      </div>
    </div>
  );
}
