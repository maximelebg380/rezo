class TransitAggloGame {
  constructor() {
    this.cityKey = "grenoble";
    this.operator = { isOfficial: true, name: "M RÉSO", fullName: "M RÉSO", logoFile: "images/mreso.png", color: "#00a3e0", shape: "carre" };
    this.treasury = 280000000;
    this.day = 1; this.hour = 7; this.minute = 0;
    this.simSpeed = 0;
    this.difficulty = "moyen";
    this.randomEventsEnabled = true;
    this.currentSaveId = null;

    this.stations = []; this.lines = []; this.districts = []; this.pois = []; this.pendingExpansions = [];
    this.activeTool = "inspect"; this.selectedEntity = null; 

    this.activeEvent = null;
    this.eventCooldownHours = 14;

    this.draftLine = { isEditingExisting: false, editingLineId: null, type: "bus", stations: [], code: "1", name: "Ligne 1", shape: "carre", color: "#38bdf8" };

    this.stats = {
      passengersTotal: 0, passengersHistory: new Array(24).fill(0), passengersThisHour: 0,
      hourlyRevenue: 0, hourlyExpenses: 0, globalCongestion: 75, modalShare: 12.5, satisfaction: 75
    };

    this.map = null;
    this.layers = {
      pois_transport: null, pois_sante: null, pois_commerce: null, pois_culture: null,
      pois_parc: null, pois_sport: null, pois_enseignement: null, pois_admin: null,
      districts: null, od_flows: null, stations: null, lines: null, vehicles: null, draft: null
    };

    this.vehicleMarkers = new Map();
  }

  initMap() {
    this.map = L.map("map", { 
      zoomControl: true, 
      attributionControl: true, 
      maxZoom: 19,
      minZoom: 11,
      maxBoundsViscosity: 1.0
    }).setView([45.1885, 5.7245], 13);
    
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(this.map);

    this.layers.pois_transport = L.layerGroup().addTo(this.map); this.layers.pois_sante = L.layerGroup().addTo(this.map);
    this.layers.pois_commerce = L.layerGroup().addTo(this.map); this.layers.pois_culture = L.layerGroup().addTo(this.map);
    this.layers.pois_parc = L.layerGroup().addTo(this.map); this.layers.pois_sport = L.layerGroup().addTo(this.map);
    this.layers.pois_enseignement = L.layerGroup().addTo(this.map); this.layers.pois_admin = L.layerGroup().addTo(this.map);
    this.layers.districts = L.layerGroup().addTo(this.map); this.layers.od_flows = L.layerGroup().addTo(this.map);
    this.layers.lines = L.layerGroup().addTo(this.map); this.layers.stations = L.layerGroup().addTo(this.map);
    this.layers.vehicles = L.layerGroup().addTo(this.map); this.layers.draft = L.layerGroup().addTo(this.map);

    this.map.on("click", (e) => this.handleMapClick(e));
  }

  async startNewGame(cityKey, operatorConfig, difficultyKey = "moyen", randomEventsEnabled = true) {
    const raw = CITIES_DATA[cityKey];
    if (!raw) return;

    this.cityKey = cityKey; 
    this.operator = operatorConfig; 
    this.difficulty = difficultyKey;
    this.randomEventsEnabled = randomEventsEnabled;
    this.currentSaveId = `save_${cityKey}_${Date.now()}`;

    const diffPreset = DIFFICULTY_PRESETS[this.difficulty] || DIFFICULTY_PRESETS.moyen;
    this.treasury = Math.round(raw.initialTreasury * diffPreset.budgetMultiplier);
    
    this.day = 1; this.hour = 7; this.minute = 0;
    this.simSpeed = 0;
    this.stations = []; this.lines = []; this.selectedEntity = null;
    this.draftLine.stations = []; this.draftLine.isEditingExisting = false;
    this.stats.passengersHistory = new Array(24).fill(0); 
    this.stats.passengersThisHour = 0; 
    this.stats.passengersTotal = 0;
    this.stats.hourlyRevenue = 0;
    this.stats.hourlyExpenses = 0;
    this.activeEvent = null;

    document.querySelectorAll(".btn-speed").forEach(b => {
      b.classList.toggle("active", b.dataset.speed === "0");
    });

    const totalDistrictsCount = Math.max(4, Math.round(raw.districts.length * diffPreset.startDistrictsRatio));
    this.districts = raw.districts.slice(0, totalDistrictsCount).map(d => ({ 
      ...d, 
      congestion: 70 + Math.floor(Math.random() * 18), 
      currentTransitShare: 8 + Math.random() * 4 
    }));

    this.pendingExpansions = JSON.parse(JSON.stringify(raw.expansions || []));
    this.pois = JSON.parse(JSON.stringify(raw.pois || []));

    if (cityKey === "grenoble") {
      try {
        const res = await fetch("./points/grenoble.json");
        if (res.ok) {
          const json = await res.json();
          if (json.points_interet && json.points_interet.length > 0) {
            this.pois = json.points_interet.map(p => {
              let cat = "commerce"; const c = (p.categorie || "").toLowerCase();
              if (c.includes("transport") || c.includes("gare")) cat = "transport";
              else if (c.includes("santé") || c.includes("hôpital") || c.includes("clinique")) cat = "sante";
              else if (c.includes("culture") || c.includes("musée") || c.includes("patrimoine")) cat = "culture";
              else if (c.includes("parc")) cat = "parc";
              else if (c.includes("commerce")) cat = "commerce";
              else if (c.includes("enseignement") || c.includes("recherche")) cat = "enseignement";
              else if (c.includes("sport")) cat = "sport";
              else if (c.includes("administration") || c.includes("justice")) cat = "admin";
              return { id: p.id, nom: p.nom, categorie: p.categorie, catKey: cat, lat: p.latitude, lng: p.longitude };
            });
          }
        }
      } catch (e) {}
    }

    this.map.flyTo(raw.center, raw.zoom, { duration: 1.2 });
    if (raw.bbox) this.map.setMaxBounds(raw.bbox);

    this.refreshAllMapLayers(); this.updateAggloStats(); this.updateHUD();
  }

  // GESTIONNAIRE DE SAUVEGARDES (DOSSIER saves/)
  getAllSaves() {
    try {
      const raw = localStorage.getItem("transit_agglo_saves_dir");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveGameSlot(customName = null) {
    const saves = this.getAllSaves();
    const saveId = this.currentSaveId || `save_${this.cityKey}_${Date.now()}`;
    this.currentSaveId = saveId;

    const cityName = CITIES_DATA[this.cityKey] ? CITIES_DATA[this.cityKey].name : this.cityKey;
    const saveObj = {
      id: saveId,
      folderPath: `saves/${saveId}/`,
      slotName: customName || `${cityName} - J${this.day} ${this.hour < 10 ? '0' + this.hour : this.hour}:${this.minute < 10 ? '0' + Math.floor(this.minute) : Math.floor(this.minute)}`,
      savedTimestamp: Date.now(),
      savedDateFormatted: new Date().toLocaleString("fr-FR"),
      cityKey: this.cityKey,
      cityName: cityName,
      operator: this.operator,
      difficulty: this.difficulty,
      randomEventsEnabled: this.randomEventsEnabled,
      treasury: this.treasury,
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      linesCount: this.lines.length,
      stationsCount: this.stations.length,
      satisfaction: this.stats.satisfaction,
      globalCongestion: this.stats.globalCongestion,
      modalShare: this.stats.modalShare,
      stations: this.stations,
      lines: this.lines,
      districts: this.districts,
      pois: this.pois,
      pendingExpansions: this.pendingExpansions,
      stats: this.stats
    };

    const existingIdx = saves.findIndex(s => s.id === saveId);
    if (existingIdx !== -1) {
      saves[existingIdx] = saveObj;
    } else {
      saves.unshift(saveObj);
    }

    try {
      localStorage.setItem("transit_agglo_saves_dir", JSON.stringify(saves));
      this.showToast(`Partie enregistrée dans ${saveObj.folderPath}`);
    } catch (e) {
      this.showToast("Erreur d'écriture dans le stockage local !");
    }
  }

  loadGameSlot(saveId) {
    const saves = this.getAllSaves();
    const save = saves.find(s => s.id === saveId);
    if (!save) {
      this.showToast("Sauvegarde introuvable !");
      return;
    }
    this.applySaveData(save);
    this.showToast(`Partie chargée : ${save.slotName}`);
  }

  deleteGameSlot(saveId) {
    let saves = this.getAllSaves();
    saves = saves.filter(s => s.id !== saveId);
    try {
      localStorage.setItem("transit_agglo_saves_dir", JSON.stringify(saves));
      this.showToast("Emplacement de sauvegarde supprimé.");
    } catch (e) {}
  }

  applySaveData(data) {
    this.cityKey = data.cityKey;
    this.currentSaveId = data.id || `save_${data.cityKey}_${Date.now()}`;
    this.operator = data.operator || (CITIES_DATA[data.cityKey] ? CITIES_DATA[data.cityKey].officialOperator : { isOfficial: true, name: "TC", logoFile: "", color: "#38bdf8", shape: "carre" });
    this.treasury = data.treasury;
    this.difficulty = data.difficulty || "moyen";
    this.randomEventsEnabled = data.randomEventsEnabled !== undefined ? data.randomEventsEnabled : true;
    this.day = data.day;
    this.hour = data.hour;
    this.minute = data.minute;
    this.simSpeed = 0;
    this.stations = data.stations || [];
    this.lines = data.lines || [];
    this.districts = data.districts || [];
    this.pois = data.pois || (CITIES_DATA[data.cityKey] ? CITIES_DATA[data.cityKey].pois : []);
    this.pendingExpansions = data.pendingExpansions || [];
    this.stats = data.stats || { passengersTotal:0, passengersHistory:new Array(24).fill(0), passengersThisHour:0, hourlyRevenue:0, hourlyExpenses:0, globalCongestion:75, modalShare:12.5, satisfaction: 75 };

    document.querySelectorAll(".btn-speed").forEach(b => {
      b.classList.toggle("active", b.dataset.speed === "0");
    });

    this.vehicleMarkers.forEach(m => this.layers.vehicles.removeLayer(m));
    this.vehicleMarkers.clear();

    const cityCenter = (CITIES_DATA[data.cityKey] && CITIES_DATA[data.cityKey].center) ? CITIES_DATA[data.cityKey].center : [data.districts[0].lat, data.districts[0].lng];
    const cityZoom = (CITIES_DATA[data.cityKey] && CITIES_DATA[data.cityKey].zoom) ? CITIES_DATA[data.cityKey].zoom : 13;
    
    this.map.flyTo(cityCenter, cityZoom, { duration: 1.2 });
    if (CITIES_DATA[data.cityKey] && CITIES_DATA[data.cityKey].bbox) {
      this.map.setMaxBounds(CITIES_DATA[data.cityKey].bbox);
    }
    
    this.refreshAllMapLayers();
    this.updateAggloStats();
    this.updateHUD();
  }

  refreshAllMapLayers() {
    this.renderPOIs(); this.renderDistricts(); this.renderStations(); this.renderLines(); this.renderDraft(); this.renderODFlows();
  }

  renderPOIs() {
    this.layers.pois_transport.clearLayers(); this.layers.pois_sante.clearLayers(); this.layers.pois_commerce.clearLayers();
    this.layers.pois_culture.clearLayers(); this.layers.pois_parc.clearLayers(); this.layers.pois_sport.clearLayers();
    this.layers.pois_enseignement.clearLayers(); this.layers.pois_admin.clearLayers();

    this.pois.forEach(poi => {
      const cat = poi.catKey || "commerce"; const iconSvg = POI_ICONS[cat] || POI_ICONS.transport;
      const isSurged = this.activeEvent && this.activeEvent.targetPoiId === poi.id;
      const badgeHtml = `
        <div class="poi-badge-container ${isSurged ? 'event-surged' : ''}">
          <div class="poi-icon-disc poi-type-${cat}">${iconSvg}</div>
          <span class="poi-badge-title">${poi.nom}</span>
          ${isSurged ? '<span style="color:#ef4444; font-weight:800; font-size:10px;">⚡ EVENT</span>' : ''}
        </div>
      `;
      const customIcon = L.divIcon({ className: "leaflet-clean-poi", html: badgeHtml, iconSize: [0, 0] });
      const marker = L.marker([poi.lat, poi.lng], { icon: customIcon, interactive: false });
      if (this.layers[`pois_${cat}`]) this.layers[`pois_${cat}`].addLayer(marker);
    });
  }

  renderDistricts() {
    this.layers.districts.clearLayers();
    const cityCenterLat = CITIES_DATA[this.cityKey].center[0];
    const cityCenterLng = CITIES_DATA[this.cityKey].center[1];

    this.districts.forEach(d => {
      const congRatio = d.congestion / 100;
      const distFromCenter = Math.hypot(d.lat - cityCenterLat, d.lng - cityCenterLng) * 111;

      let coreColor, midColor, outerColor;
      if (distFromCenter < 4.5) { 
        if (congRatio > 0.65) { coreColor = "#ef4444"; midColor = "#f97316"; outerColor = "rgba(239,68,68,0.2)"; }
        else if (congRatio > 0.45) { coreColor = "#f97316"; midColor = "#f59e0b"; outerColor = "rgba(249,115,22,0.2)"; }
        else { coreColor = "#10b981"; midColor = "#34d399"; outerColor = "rgba(16,185,129,0.2)"; }
      } else { 
        if (congRatio > 0.65) { coreColor = "#f97316"; midColor = "#f59e0b"; outerColor = "rgba(249,115,22,0.2)"; }
        else if (congRatio > 0.45) { coreColor = "#f59e0b"; midColor = "#fde047"; outerColor = "rgba(245,158,11,0.2)"; }
        else { coreColor = "#34d399"; midColor = "#10b981"; outerColor = "rgba(52,211,153,0.2)"; }
      }

      const outer = L.circle([d.lat, d.lng], { radius: d.radius, color: outerColor, weight: 1, fillColor: outerColor, fillOpacity: 0.15, interactive: true });
      const mid = L.circle([d.lat, d.lng], { radius: d.radius * 0.65, color: midColor, weight: 0, fillColor: midColor, fillOpacity: 0.25, interactive: false });
      const core = L.circle([d.lat, d.lng], { radius: d.radius * 0.35, color: coreColor, weight: 0, fillColor: coreColor, fillOpacity: 0.45, interactive: false });

      outer.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.activeTool.startsWith("station-")) { this.buildStationAt(e.latlng.lat, e.latlng.lng); }
        else { this.selectedEntity = { type: "district", data: d }; this.renderODFlows(); this.updateInspector(); }
      });

      const labelIcon = L.divIcon({
        className: "district-label-marker",
        html: `<div class="district-badge"><span class="district-badge-name">${d.name}</span><span class="district-badge-sub">${Math.round(d.congestion)}% cong.</span></div>`
      });

      const marker = L.marker([d.lat, d.lng], { icon: labelIcon, interactive: false });
      this.layers.districts.addLayer(outer); this.layers.districts.addLayer(mid); this.layers.districts.addLayer(core); this.layers.districts.addLayer(marker);
    });
  }

  getCommuteDemandMatrix(originDistrict) {
    const totalJobsInAgglo = this.districts.reduce((acc, cur) => acc + (cur.jobs || 10000), 0);
    const flows = [];

    this.districts.forEach(target => {
      if (target.id === originDistrict.id) return;
      const jobWeight = (target.jobs || 10000) / totalJobsInAgglo;
      let rawCommuters = Math.round(originDistrict.pop * 0.28 * jobWeight);

      if (this.activeEvent && this.activeEvent.type === "global_surge") {
        rawCommuters = Math.round(rawCommuters * this.activeEvent.surgeFactor);
      }

      const originStations = this.stations.filter(st => Math.hypot(st.lat - originDistrict.lat, st.lng - originDistrict.lng) * 111000 <= TRANSIT_SPECS[st.type].coverageMeters);
      const targetStations = this.stations.filter(st => Math.hypot(st.lat - target.lat, st.lng - target.lng) * 111000 <= TRANSIT_SPECS[st.type].coverageMeters);

      let isConnected = false; let connectingLine = null;
      for (let os of originStations) {
        for (let ts of targetStations) {
          const directLine = this.lines.find(l => l.stationIds.includes(os.id) && l.stationIds.includes(ts.id));
          if (directLine) { isConnected = true; connectingLine = directLine; break; }
        }
        if (isConnected) break;
      }
      const captureRatio = isConnected ? Math.min(0.85, 0.45 + (1 / Math.max(2, this.getLineMetrics(connectingLine).headwayMin)) * 2) : 0.05;
      flows.push({ target, rawCommuters, capturedTransit: Math.round(rawCommuters * captureRatio), isConnected, connectingLine });
    });
    return flows.sort((a, b) => b.rawCommuters - a.rawCommuters);
  }

  renderODFlows() {
    this.layers.od_flows.clearLayers();
    if (this.activeTool !== "view-od-flows" && (!this.selectedEntity || this.selectedEntity.type !== "district")) return;
    const origins = (this.selectedEntity && this.selectedEntity.type === "district") ? [this.selectedEntity.data] : this.districts;
    origins.forEach(orig => {
      const flows = this.getCommuteDemandMatrix(orig);
      flows.slice(0, 4).forEach(f => {
        const color = f.isConnected ? "#10b981" : "#ef4444";
        const weight = Math.max(1.5, Math.min(6, f.rawCommuters / 2000));
        const curvePoints = [[orig.lat, orig.lng], [(orig.lat + f.target.lat) / 2 + (orig.lng - f.target.lng) * 0.1, (orig.lng + f.target.lng) / 2 + (orig.lat - f.target.lat) * 0.1], [f.target.lat, f.target.lng]];
        const line = L.polyline(curvePoints, { color: color, weight: weight, opacity: 0.65, dashArray: f.isConnected ? null : "4, 6" });
        this.layers.od_flows.addLayer(line);
      });
    });
  }

  renderStations() {
    this.layers.stations.clearLayers();
    this.stations.forEach(st => {
      const size = st.type === "metro" ? 14 : (st.type === "tram" ? 12 : 10);
      const isSelected = this.selectedEntity && this.selectedEntity.type === "station" && this.selectedEntity.data.id === st.id;
      const isDraft = this.draftLine.stations.includes(st.id);
      const icon = L.divIcon({
        className: "custom-station",
        html: `<div class="station-marker-icon station-marker-${st.type}" style="width:${size}px; height:${size}px; ${isSelected || isDraft ? 'border-color: #38bdf8; transform:scale(1.35); box-shadow:0 0 14px #38bdf8;' : ''}" title="${st.name}"></div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2]
      });
      const marker = L.marker([st.lat, st.lng], { icon: icon, interactive: true });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        if (this.activeTool === "create-line") { this.handleStationLineDraft(st); }
        else { this.selectedEntity = { type: "station", data: st }; this.renderStations(); this.renderODFlows(); this.updateInspector(); }
      });
      this.layers.stations.addLayer(marker);
    });
  }

  renderLines() {
    this.layers.lines.clearLayers();
    this.lines.forEach(line => {
      if (!line.geometry || line.geometry.length < 2) return;
      const weight = line.type === "metro" ? 6 : (line.type === "tram" ? 4.5 : 3.5);
      const polyline = L.polyline(line.geometry, { color: line.color, weight: weight, opacity: 0.92, lineCap: "round", lineJoin: "round" });
      polyline.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        this.selectedEntity = { type: "line", data: line };
        this.renderODFlows(); this.updateInspector();
      });
      this.layers.lines.addLayer(polyline);
    });
  }

  renderDraft() {
    this.layers.draft.clearLayers();
    if (this.activeTool !== "create-line" || this.draftLine.stations.length === 0) return;
    const latlngs = this.draftLine.stations.map(id => {
      const s = this.stations.find(st => st.id === id);
      return s ? [s.lat, s.lng] : null;
    }).filter(Boolean);
    if (latlngs.length >= 1) {
      const draftPolyline = L.polyline(latlngs, { color: TRANSIT_SPECS[this.draftLine.type].color, weight: 3, dashArray: "6, 8", opacity: 0.85 });
      this.layers.draft.addLayer(draftPolyline);
    }
  }

  handleMapClick(e) {
    if (this.activeTool.startsWith("station-")) { this.buildStationAt(e.latlng.lat, e.latlng.lng); }
    else { this.selectedEntity = null; this.renderStations(); this.renderODFlows(); this.updateInspector(); }
  }

  async buildStationAt(lat, lng) {
    const type = this.activeTool.replace("station-", "");
    const spec = TRANSIT_SPECS[type];
    if (this.treasury < spec.stationCost) { this.showToast("Budget insuffisant !"); return; }
    
    this.showToast("Analyse géospatiale...");
    let matchedPOI = null;
    for (let p of this.pois) {
      if (Math.hypot(p.lat - lat, p.lng - lng) * 111000 <= 320) { matchedPOI = p; break; }
    }

    let isRoad = false; let candidateName = ""; let secondaryCrossName = "";
    if (matchedPOI) { candidateName = matchedPOI.nom; isRoad = true; }
    else {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`);
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          const rawStreet = addr.road || addr.pedestrian || addr.street || addr.footway || addr.path || addr.avenue || addr.boulevard || addr.place;
          const districtOrSub = addr.neighbourhood || addr.suburb || addr.city_district || addr.quarter || addr.village;
          if (rawStreet) { isRoad = true; candidateName = cleanFrenchStreetName(rawStreet); if (districtOrSub) secondaryCrossName = districtOrSub; }
          else if (districtOrSub) { candidateName = districtOrSub; }
        }
      } catch (err) { isRoad = true; }
    }

    if (spec.requiresRoad && !isRoad && !candidateName) {
      this.showToast("Emplacement invalide : bus et tramway doivent longer une voie de circulation.");
      return;
    }

    if (!candidateName) {
      let nearestDist = this.districts[0]; let minD = 999999;
      this.districts.forEach(d => {
        const dist = Math.hypot(d.lat - lat, d.lng - lng);
        if (dist < minD) { minD = dist; nearestDist = d; }
      });
      candidateName = `${nearestDist.name.split(" ")[0]} - Arrêt ${this.stations.length + 1}`;
    }

    const existingSameName = this.stations.filter(s => s.name.toLowerCase() === candidateName.toLowerCase());
    if (existingSameName.length > 0) {
      candidateName = secondaryCrossName ? `${candidateName} - ${secondaryCrossName}` : `${candidateName} (${existingSameName.length + 1})`;
    }

    const newStation = { id: `st_${Date.now()}_${Math.floor(Math.random() * 1000)}`, name: candidateName, type: type, lat: lat, lng: lng, waiting: 0 };
    this.treasury -= spec.stationCost;
    this.stations.push(newStation);
    this.renderStations();
    this.showToast(`Arrêt « ${newStation.name} » implanté`);
    this.updateHUD();
  }

  upgradeStation(stId, newType, cost) {
    if (this.treasury < cost) { this.showToast("Budget insuffisant !"); return; }
    const st = this.stations.find(s => s.id === stId);
    if (!st) return;

    this.treasury -= cost;
    st.type = newType;
    this.renderStations();
    this.updateHUD();
    this.updateInspector();
    this.showToast(`Station modifiée : + ${TRANSIT_SPECS[newType].name}`);
  }

  renameStation(stId, newName) {
    const st = this.stations.find(s => s.id === stId);
    const trimmed = newName.trim();
    if (st && trimmed) {
      st.name = trimmed;
      this.renderStations();
      this.showToast(`Arrêt renommé : « ${st.name} »`);
    }
  }

  handleStationLineDraft(st) {
    const idx = this.draftLine.stations.indexOf(st.id);
    if (idx !== -1) {
      this.draftLine.stations.splice(idx, 1);
      this.showToast("Arrêt retiré du tracé.");
    } else {
      if (this.draftLine.stations.length > 0) {
        const firstSt = this.stations.find(s => s.id === this.draftLine.stations[0]);
        const lastSt = this.stations.find(s => s.id === this.draftLine.stations[this.draftLine.stations.length - 1]);
        const distToFirst = Math.hypot(firstSt.lat - st.lat, firstSt.lng - st.lng);
        const distToLast = Math.hypot(lastSt.lat - st.lat, lastSt.lng - st.lng);
        if (distToFirst < distToLast) { this.draftLine.stations.unshift(st.id); } 
        else { this.draftLine.stations.push(st.id); }
      } else {
        this.draftLine.stations.push(st.id);
      }
    }

    const selectedStationObjects = this.draftLine.stations.map(id => this.stations.find(s => s.id === id)).filter(Boolean);
    const typeCounts = { metro: 0, tram: 0, bus: 0 };
    selectedStationObjects.forEach(s => typeCounts[s.type]++);

    if (typeCounts.metro >= typeCounts.tram && typeCounts.metro >= typeCounts.bus && typeCounts.metro > 0) this.draftLine.type = "metro";
    else if (typeCounts.tram >= typeCounts.bus && typeCounts.tram > 0) this.draftLine.type = "tram";
    else this.draftLine.type = "bus";

    const badge = document.getElementById("build-mode-badge");
    const spec = TRANSIT_SPECS[this.draftLine.type];
    badge.textContent = spec.name.toUpperCase();
    badge.style.background = this.draftLine.type === "metro" ? "#581c87" : (this.draftLine.type === "tram" ? "#14532d" : "#1e3a8a");
    badge.style.color = this.draftLine.type === "metro" ? "#d8b4fe" : (this.draftLine.type === "tram" ? "#86efac" : "#93c5fd");
    document.getElementById("build-status-text").textContent = `${this.draftLine.stations.length} arrêts sélectionnés`;
    this.renderDraft();
  }

  popLastStationFromDraft() {
    if (this.draftLine.stations.length === 0) return;
    const removedId = this.draftLine.stations.pop();
    const st = this.stations.find(s => s.id === removedId);
    this.showToast(`Arrêt retiré : ${st ? st.name : ''}`);
    document.getElementById("build-status-text").textContent = `${this.draftLine.stations.length} arrêts sélectionnés`;
    this.renderDraft();
  }

  async calculateLineGeometry(stationIds, followRoads) {
    const coords = stationIds.map(id => {
      const st = this.stations.find(s => s.id === id);
      return st ? [st.lat, st.lng] : null;
    }).filter(Boolean);
    if (coords.length < 2) return coords;
    if (!followRoads) return coords;

    try {
      const locString = coords.map(c => `${c[1]},${c[0]}`).join(";");
      const url = `https://router.project-osrm.org/route/v1/driving/${locString}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.routes && json.routes.length > 0) {
          return json.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        }
      }
    } catch (e) { console.warn("OSRM direct", e); }
    return coords;
  }

  getLineMetrics(line) {
    if (!line || !line.geometry || line.geometry.length < 2) return { distanceKm: 0, oneWayTimeMin: 0, headwayMin: 15 };
    let totalDistMeters = 0;
    for (let i = 0; i < line.geometry.length - 1; i++) {
      const p1 = line.geometry[i]; const p2 = line.geometry[i+1];
      totalDistMeters += Math.hypot((p2[0] - p1[0]) * 111000, (p2[1] - p1[1]) * 111000 * Math.cos(p1[0] * Math.PI / 180));
    }
    const distanceKm = totalDistMeters / 1000;
    const spec = TRANSIT_SPECS[line.type];
    const travelTimeHours = distanceKm / spec.speedKmH;
    const oneWayTimeMin = Math.max(2, Math.round((travelTimeHours * 60) + (line.stationIds.length * 0.45)));
    const roundTripMin = (oneWayTimeMin * 2) + 3;
    const vehicleCount = Math.max(1, line.vehicles.length);
    const headwayMin = Math.max(1, Math.round(roundTripMin / vehicleCount));
    return { distanceKm: distanceKm.toFixed(1), oneWayTimeMin, headwayMin };
  }

  openLineCustomizer(isEditing = false, lineData = null) {
    if (!isEditing && this.draftLine.stations.length < 2) { this.showToast("Une ligne nécessite au moins 2 stations."); return; }
    this.draftLine.isEditingExisting = isEditing;
    this.draftLine.editingLineId = isEditing ? lineData.id : null;

    if (isEditing) {
      this.draftLine.code = lineData.code || "1";
      this.draftLine.name = lineData.name || "Ligne";
      this.draftLine.shape = lineData.shape || "carre";
      this.draftLine.color = lineData.color || "#38bdf8";
      this.draftLine.type = lineData.type;
      if (this.draftLine.stations.length === 0) this.draftLine.stations = [...lineData.stationIds];
      document.getElementById("customizer-title").textContent = `Modifier ${lineData.name}`;
      document.getElementById("btn-save-customizer").textContent = "Enregistrer les modifications";
    } else {
      const nextNum = this.lines.length + 1;
      const typePrefix = this.draftLine.type === "tram" ? "T" : (this.draftLine.type === "metro" ? "M" : "");
      this.draftLine.code = `${typePrefix}${nextNum}`;
      this.draftLine.name = `Ligne ${this.draftLine.code}`;
      this.draftLine.shape = "carre";
      this.draftLine.color = SWATCH_PALETTE[this.lines.length % SWATCH_PALETTE.length];
      document.getElementById("customizer-title").textContent = "Mise en service d'une nouvelle ligne";
      document.getElementById("btn-save-customizer").textContent = "Mettre en service";
    }

    document.getElementById("preview-mode-desc").textContent = TRANSIT_SPECS[this.draftLine.type].name;
    document.getElementById("cust-line-code").value = this.draftLine.code;
    document.getElementById("cust-line-name").value = this.draftLine.name;

    const swatchCont = document.getElementById("swatches-container");
    swatchCont.innerHTML = "";
    SWATCH_PALETTE.forEach(c => {
      const sw = document.createElement("div"); sw.className = `swatch ${c === this.draftLine.color ? 'selected' : ''}`; sw.style.background = c;
      sw.onclick = () => { document.querySelectorAll("#swatches-container .swatch").forEach(s => s.classList.remove("selected")); sw.classList.add("selected"); this.draftLine.color = c; this.updateCustomizerPreview(); };
      swatchCont.appendChild(sw);
    });

    document.querySelectorAll("#line-customizer-modal .shape-options .shape-btn").forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.shape === this.draftLine.shape);
      btn.onclick = () => { document.querySelectorAll("#line-customizer-modal .shape-options .shape-btn").forEach(b => b.classList.remove("selected")); btn.classList.add("selected"); this.draftLine.shape = btn.dataset.shape; this.updateCustomizerPreview(); };
    });

    this.updateCustomizerPreview();
    document.getElementById("line-customizer-modal").style.display = "flex";
  }

  updateCustomizerPreview() {
    const code = document.getElementById("cust-line-code").value.trim() || "1";
    const name = document.getElementById("cust-line-name").value.trim() || "Ligne";
    const badge = document.getElementById("preview-badge");
    badge.className = `line-badge-render shape-${this.draftLine.shape}`;
    badge.style.background = this.draftLine.color;
    badge.textContent = code;
    document.getElementById("preview-full-title").textContent = name;
  }

  async commitCustomizedLine() {
    const code = document.getElementById("cust-line-code").value.trim() || "1";
    const name = document.getElementById("cust-line-name").value.trim() || `Ligne ${code}`;
    const spec = TRANSIT_SPECS[this.draftLine.type];

    this.showToast("Calcul et application du tracé...");
    const geom = await this.calculateLineGeometry(this.draftLine.stations, spec.followRoads);

    if (this.draftLine.isEditingExisting) {
      const line = this.lines.find(l => l.id === this.draftLine.editingLineId);
      if (line) {
        line.code = code; line.name = name; line.type = this.draftLine.type; line.color = this.draftLine.color; line.shape = this.draftLine.shape; line.stationIds = [...this.draftLine.stations]; line.geometry = geom;
        line.vehicles.forEach((veh, vIdx) => {
          if (veh.geomIdx >= geom.length) veh.geomIdx = Math.min(vIdx * Math.floor(geom.length / line.vehicles.length), geom.length - 1);
          veh.lat = geom[veh.geomIdx][0]; veh.lng = geom[veh.geomIdx][1]; veh.progress = 0;
        });
        if (this.selectedEntity && this.selectedEntity.type === "line" && this.selectedEntity.data.id === line.id) {
          this.selectedEntity.data = line;
        }
      }
      this.showToast(`Ligne « ${name} » mise à jour`);
    } else {
      const fleetCost = spec.vehicleCost * 2;
      if (this.treasury < fleetCost) { this.showToast("Budget insuffisant pour la flotte initiale !"); return; }
      this.treasury -= fleetCost;
      const newLine = {
        id: `line_${Date.now()}`, code: code, name: name, type: this.draftLine.type, color: this.draftLine.color, shape: this.draftLine.shape, stationIds: [...this.draftLine.stations], geometry: geom, totalPassengers: 0,
        vehicles: [
          { geomIdx: 0, progress: 0, direction: 1, passengers: 0, capacity: spec.vehicleCapacity, lat: geom[0][0], lng: geom[0][1] },
          { geomIdx: Math.floor(geom.length / 2), progress: 0, direction: -1, passengers: 0, capacity: spec.vehicleCapacity, lat: geom[Math.floor(geom.length/2)][0], lng: geom[Math.floor(geom.length/2)][1] }
        ]
      };
      this.lines.push(newLine);
      this.selectedEntity = { type: "line-list" };
      this.showToast(`Mise en service de la ${newLine.name}`);
    }

    this.draftLine.stations = []; this.draftLine.isEditingExisting = false; this.draftLine.editingLineId = null;
    document.getElementById("line-customizer-modal").style.display = "none";
    document.querySelector(".dock-btn[data-tool='manage-lines']").click();
    this.renderLines(); this.renderDraft(); this.renderStations(); this.renderODFlows(); this.updateHUD();
  }

  deleteStation(stId) {
    this.lines.forEach(l => { l.stationIds = l.stationIds.filter(id => id !== stId); });
    this.stations = this.stations.filter(s => s.id !== stId);
    this.selectedEntity = null;
    this.renderStations(); this.renderLines(); this.renderODFlows(); this.updateHUD();
    this.showToast("Station démantelée.");
  }

  deleteLine(lineId) {
    this.lines = this.lines.filter(l => l.id !== lineId);
    this.selectedEntity = { type: "line-list" };
    this.renderLines(); this.renderODFlows(); this.updateHUD();
    this.showToast("Ligne supprimée.");
  }

  addVehicle(line) {
    const spec = TRANSIT_SPECS[line.type];
    if (this.treasury < spec.vehicleCost) { this.showToast("Budget insuffisant !"); return; }
    this.treasury -= spec.vehicleCost;
    line.vehicles.push({ geomIdx: 0, progress: 0, direction: 1, passengers: 0, capacity: spec.vehicleCapacity, lat: line.geometry[0][0], lng: line.geometry[0][1] });
    this.showToast("Nouvelle rame injectée sur la ligne.");
    this.updateHUD();
    if (this.selectedEntity && this.selectedEntity.type === 'line' && this.selectedEntity.data.id === line.id) { this.updateInspector(); }
  }

  removeVehicle(line) {
    if (line.vehicles.length <= 1) { this.showToast("Minimum 1 véhicule requis par ligne."); return; }
    line.vehicles.pop();
    this.showToast("Véhicule retiré du service.");
    this.updateHUD();
    if (this.selectedEntity && this.selectedEntity.type === 'line' && this.selectedEntity.data.id === line.id) { this.updateInspector(); }
  }

  startEditingLineRoute(line) {
    this.draftLine.isEditingExisting = true;
    this.draftLine.editingLineId = line.id;
    this.draftLine.type = line.type;
    this.draftLine.code = line.code;
    this.draftLine.name = line.name;
    this.draftLine.color = line.color;
    this.draftLine.shape = line.shape;
    this.draftLine.stations = [...line.stationIds];

    document.querySelector(".dock-btn[data-tool='create-line']").click();
    const badge = document.getElementById("build-mode-badge");
    badge.textContent = `MODIF. ${line.code}`;
    badge.style.background = line.color;
    badge.style.color = "#fff";
    document.getElementById("build-status-text").textContent = `${this.draftLine.stations.length} arrêts dans le tracé`;
    this.renderDraft();
  }

  showToast(msg) {
    const toast = document.getElementById("notif-toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
  }
}