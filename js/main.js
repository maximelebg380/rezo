let game;

document.addEventListener("DOMContentLoaded", () => {
  game = new TransitAggloGame();
  game.initMap();

  let lastFrameTime = performance.now();

  function animateVehicles(timestamp) {
    const dt = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    if (game.simSpeed > 0) {
      const activeVehKeys = new Set();

      game.lines.forEach(line => {
        if (!line.geometry || line.geometry.length < 2) return;
        const spec = TRANSIT_SPECS[line.type];
        const speedDegPerSec = (spec.speedKmH / 111) * 0.015 * game.simSpeed;

        line.vehicles.forEach((veh, vIdx) => {
          const totalPoints = line.geometry.length;
          const nextIdx = veh.direction === 1 ? Math.min(veh.geomIdx + 1, totalPoints - 1) : Math.max(veh.geomIdx - 1, 0);

          const curPt = line.geometry[veh.geomIdx];
          const targetPt = line.geometry[nextIdx];
          const dLat = targetPt[0] - curPt[0];
          const dLng = targetPt[1] - curPt[1];
          const dist = Math.hypot(dLat, dLng);

          if (dist > 0.000001) {
            veh.progress += (speedDegPerSec * dt) / dist;
            veh.lat = curPt[0] + dLat * veh.progress;
            veh.lng = curPt[1] + dLng * veh.progress;
          } else {
            veh.progress = 1;
          }

          if (veh.progress >= 1) {
            veh.progress = 0;
            veh.geomIdx = nextIdx;
            veh.lat = targetPt[0];
            veh.lng = targetPt[1];

            const nearbyStation = game.stations.find(st => line.stationIds.includes(st.id) && Math.hypot(st.lat - veh.lat, st.lng - veh.lng) * 111000 < 45);

            if (nearbyStation) {
              const drop = Math.floor(veh.passengers * (0.25 + Math.random() * 0.35));
              veh.passengers -= drop;
              
              const space = veh.capacity - veh.passengers;
              const board = Math.min(nearbyStation.waiting, space);
              nearbyStation.waiting -= board;
              veh.passengers += board;

              game.stats.passengersThisHour += board;
              game.stats.passengersTotal += board;
              if (!line.totalPassengers) line.totalPassengers = 0;
              line.totalPassengers += board;
            }

            if (veh.geomIdx >= totalPoints - 1) {
              veh.direction = -1;
            } else if (veh.geomIdx <= 0) {
              veh.direction = 1;
            }
          }

          const vehKey = `${line.id}_veh_${vIdx}`;
          activeVehKeys.add(vehKey);

          let marker = game.vehicleMarkers.get(vehKey);
          if (!marker) {
            const isMetro = line.type === "metro";
            const iconSize = isMetro ? 14 : 10;
            const vIcon = L.divIcon({
              className: "vehicle-custom-wrap",
              html: `<div class="vehicle-hud-marker ${isMetro ? 'vehicle-metro-marker' : ''}" style="background:${line.color}; width:${iconSize}px; height:${iconSize}px;"></div>`,
              iconSize: [iconSize, iconSize],
              iconAnchor: [iconSize / 2, iconSize / 2]
            });
            marker = L.marker([veh.lat, veh.lng], { icon: vIcon, interactive: false });
            game.layers.vehicles.addLayer(marker);
            game.vehicleMarkers.set(vehKey, marker);
          } else {
            marker.setLatLng([veh.lat, veh.lng]);
          }
        });
      });

      for (let [key, m] of game.vehicleMarkers.entries()) {
        if (!activeVehKeys.has(key)) {
          game.layers.vehicles.removeLayer(m);
          game.vehicleMarkers.delete(key);
        }
      }
    }

    requestAnimationFrame(animateVehicles);
  }
  requestAnimationFrame(animateVehicles);

  setInterval(() => {
    if (!game || game.simSpeed === 0) return;

    game.minute += 0.5 * game.simSpeed;
    if (game.minute >= 60) {
      game.minute = 0;
      game.hour++;
      
      const diffPreset = DIFFICULTY_PRESETS[game.difficulty] || DIFFICULTY_PRESETS.moyen;

      // Gestion des événements aléatoires
      if (game.randomEventsEnabled) {
        if (game.activeEvent) {
          game.activeEvent.hoursLeft--;
          if (game.activeEvent.hoursLeft <= 0) {
            game.showToast(`Fin de l'événement : ${game.activeEvent.name}`);
            game.activeEvent = null;
            game.renderPOIs();
          }
        } else {
          game.eventCooldownHours--;
          if (game.eventCooldownHours <= 0 && Math.random() < 0.15) {
            game.triggerRandomEvent();
            game.eventCooldownHours = 18 + Math.floor(Math.random() * 18);
          }
        }
      }

      let hourlyMaint = 0;
      game.lines.forEach(line => {
        const spec = TRANSIT_SPECS[line.type];
        hourlyMaint += line.vehicles.length * spec.hourlyMaint;
        hourlyMaint += line.stationIds.length * 15;
      });

      if (game.activeEvent && game.activeEvent.type === "maint_penalty") {
        hourlyMaint = Math.round(hourlyMaint * game.activeEvent.penaltyFactor);
      }

      game.stats.passengersHistory.push(game.stats.passengersThisHour);
      if (game.stats.passengersHistory.length > 24) game.stats.passengersHistory.shift();

      const ticketRevenue = Math.round(game.stats.passengersThisHour * 1.90);
      
      // Aucune subvention si aucune ligne n'est en service
      const subvention = game.lines.length > 0 
        ? Math.round((2500 * game.lines.length) + (100 - game.stats.globalCongestion) * 90)
        : 0;
      
      game.stats.hourlyExpenses = hourlyMaint;
      game.stats.hourlyRevenue = subvention + ticketRevenue;
      game.treasury += (game.stats.hourlyRevenue - game.stats.hourlyExpenses);
      
      game.stats.passengersThisHour = 0;

      game.renderDistricts();
      game.updateHUD();
      if (game.selectedEntity && game.selectedEntity.type === 'statistics') game.updateInspector();
    }
    
    if (game.hour >= 24) {
      game.hour = 0;
      game.day++;
      
      const readyExpansions = game.pendingExpansions.filter(exp => exp.spawnDay <= game.day);
      readyExpansions.forEach(exp => {
        game.districts.push({
          id: exp.id, name: exp.name, lat: exp.lat, lng: exp.lng, pop: exp.pop, jobs: exp.jobs,
          type: exp.type, radius: exp.radius, congestion: 82, currentTransitShare: 6
        });
        game.showToast(`Nouveau pôle urbain : « ${exp.name} » !`);
      });
      game.pendingExpansions = game.pendingExpansions.filter(exp => exp.spawnDay > game.day);
      if (readyExpansions.length > 0) {
        game.renderDistricts();
        game.renderODFlows();
      }
    }

    const isPeak = (game.hour >= 7 && game.hour <= 9) || (game.hour >= 17 && game.hour <= 19);
    const peakMultiplier = isPeak ? 2.6 : 0.8;
    const diffPreset = DIFFICULTY_PRESETS[game.difficulty] || DIFFICULTY_PRESETS.moyen;

    game.districts.forEach(orig => {
      const flows = game.getCommuteDemandMatrix(orig);
      let totalDemand = 0;
      let totalCaptured = 0;

      flows.forEach(f => {
        totalDemand += f.rawCommuters;
        totalCaptured += f.capturedTransit;

        if (f.isConnected && f.connectingLine) {
          const originStation = game.stations.find(st => f.connectingLine.stationIds.includes(st.id) && Math.hypot(st.lat - orig.lat, st.lng - orig.lng) * 111000 <= TRANSIT_SPECS[st.type].coverageMeters);
          if (originStation) {
            originStation.waiting += Math.floor((f.capturedTransit * 0.008) * peakMultiplier);
          }
        }
      });

      const realTransitShare = totalDemand > 0 ? (totalCaptured / totalDemand) * 100 : 5;
      orig.currentTransitShare = orig.currentTransitShare * 0.95 + realTransitShare * 0.05;

      const targetCongestion = Math.max(12, 95 - (orig.currentTransitShare * 1.05 * diffPreset.reliefFactor));
      orig.congestion += (targetCongestion - orig.congestion) * diffPreset.congestionGrowth * game.simSpeed;
    });

    game.updateAggloStats();

  }, 100);

  // Menus et Paramètres
  let tempChosenCity = "grenoble";
  let tempChosenDiff = "moyen";
  let tempOperatorConfig = {
    isOfficial: true,
    name: "M RÉSO",
    fullName: "M RÉSO (SMMAG)",
    logoFile: "images/mreso.png",
    color: "#00a3e0",
    shape: "carre"
  };

  const btnNewGame = document.getElementById("btn-menu-new-game");
  if (btnNewGame) {
    btnNewGame.onclick = () => {
      document.getElementById("start-menu-modal").style.display = "none";
      document.getElementById("city-picker-modal").style.display = "flex";
    };
  }

  const btnLoadFile = document.getElementById("btn-menu-load-file");
  if (btnLoadFile) {
    btnLoadFile.onclick = () => {
      document.getElementById("start-menu-modal").style.display = "none";
      openSaveManager(false);
    };
  }

  const btnOpenSavesHud = document.getElementById("btn-open-saves-hud");
  if (btnOpenSavesHud) {
    btnOpenSavesHud.onclick = () => {
      openSaveManager(true);
    };
  }

  function openSaveManager(isIngame = false) {
    const modal = document.getElementById("save-manager-modal");
    const container = document.getElementById("saves-list-container");
    const createBtn = document.getElementById("btn-create-new-save");
    
    if (createBtn) createBtn.style.display = isIngame ? "inline-flex" : "none";
    
    container.innerHTML = "";
    const saves = game.getAllSaves();

    if (saves.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:30px 0;">Aucune sauvegarde détectée dans <b>saves/</b>.<br>Créez votre première partie ou importez un fichier .json.</div>`;
    } else {
      saves.forEach(s => {
        const card = document.createElement("div");
        card.className = "save-slot-card";
        card.innerHTML = `
          <div class="save-slot-header">
            <div>
              <div class="save-slot-title">${s.slotName || s.cityName}</div>
              <div class="save-slot-date">${s.folderPath} • ${s.savedDateFormatted}</div>
            </div>
            <span class="mode-tag-pill" style="background:#1e293b; color:#38bdf8;">${(s.difficulty || "moyen").toUpperCase()}</span>
          </div>
          <div class="save-slot-metrics">
            <div class="save-chip"><span class="save-chip-label">Agglo</span><span class="save-chip-val">${s.cityName || s.cityKey}</span></div>
            <div class="save-chip"><span class="save-chip-label">Date In-Game</span><span class="save-chip-val">J${s.day} - ${s.hour}h</span></div>
            <div class="save-chip"><span class="save-chip-label">Lignes & Rames</span><span class="save-chip-val">${s.linesCount || 0} lig.</span></div>
            <div class="save-chip"><span class="save-chip-label">Trésorerie</span><span class="save-chip-val">${(s.treasury || 0).toLocaleString("fr-FR")} €</span></div>
          </div>
          <div class="save-slot-actions">
            <button type="button" class="btn-action btn-export-slot" data-id="${s.id}">Exporter .json</button>
            <button type="button" class="btn-action btn-del-slot" data-id="${s.id}" style="border-color:var(--accent-red); color:var(--accent-red);">Supprimer</button>
            ${isIngame ? `<button type="button" class="btn-action btn-overwrite-slot" data-id="${s.id}">Écraser</button>` : ''}
            <button type="button" class="btn-action btn-primary btn-load-slot" data-id="${s.id}">Charger la partie</button>
          </div>
        `;

        card.querySelector(".btn-load-slot").onclick = () => {
          game.loadGameSlot(s.id);
          modal.style.display = "none";
          document.getElementById("start-menu-modal").style.display = "none";
        };

        const overwriteBtn = card.querySelector(".btn-overwrite-slot");
        if (overwriteBtn) {
          overwriteBtn.onclick = () => {
            game.currentSaveId = s.id;
            game.saveGameSlot(s.slotName);
            openSaveManager(true);
          };
        }

        card.querySelector(".btn-del-slot").onclick = () => {
          if (confirm(`Supprimer définitivement la sauvegarde « ${s.slotName} » ?`)) {
            game.deleteGameSlot(s.id);
            openSaveManager(isIngame);
          }
        };

        card.querySelector(".btn-export-slot").onclick = () => {
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(s, null, 2));
          const dlAnchor = document.createElement("a");
          dlAnchor.setAttribute("href", dataStr);
          dlAnchor.setAttribute("download", `save_${s.cityKey}_J${s.day}.json`);
          document.body.appendChild(dlAnchor);
          dlAnchor.click();
          dlAnchor.remove();
        };

        container.appendChild(card);
      });
    }

    modal.style.display = "flex";
  }

  const btnCreateNewSave = document.getElementById("btn-create-new-save");
  if (btnCreateNewSave) {
    btnCreateNewSave.onclick = () => {
      game.currentSaveId = `save_${game.cityKey}_${Date.now()}`;
      game.saveGameSlot();
      openSaveManager(true);
    };
  }

  const btnCloseSaveMgr = document.getElementById("btn-close-save-manager");
  if (btnCloseSaveMgr) {
    btnCloseSaveMgr.onclick = () => {
      document.getElementById("save-manager-modal").style.display = "none";
    };
  }

  const btnImportFile = document.getElementById("btn-import-file-json");
  if (btnImportFile) {
    btnImportFile.onclick = () => {
      document.getElementById("file-load-input").click();
    };
  }

  const fileInput = document.getElementById("file-load-input");
  if (fileInput) {
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (!data.cityKey || !data.districts) throw new Error("Format invalide");

            game.applySaveData(data);
            game.saveGameSlot(`Import - ${data.cityName || data.cityKey}`);

            document.getElementById("save-manager-modal").style.display = "none";
            document.getElementById("start-menu-modal").style.display = "none";
            document.getElementById("city-picker-modal").style.display = "none";
            document.getElementById("operator-picker-modal").style.display = "none";

            game.showToast("Partie importée et chargée !");
          } catch (err) {
            alert("Erreur lors de la lecture du fichier : " + err.message);
          }
        };
        reader.readAsText(e.target.files[0]);
      }
    };
  }

  const btnBackMain = document.getElementById("btn-back-to-main-menu");
  if (btnBackMain) {
    btnBackMain.onclick = () => {
      document.getElementById("city-picker-modal").style.display = "none";
      document.getElementById("start-menu-modal").style.display = "flex";
    };
  }

  const btnOpenMenu = document.getElementById("btn-open-menu");
  if (btnOpenMenu) {
    btnOpenMenu.onclick = () => {
      document.getElementById("start-menu-modal").style.display = "flex";
    };
  }

  document.querySelectorAll(".city-choice-card").forEach(card => {
    card.onclick = () => {
      tempChosenCity = card.dataset.city;
      const cityData = CITIES_DATA[tempChosenCity];
      const off = cityData.officialOperator;
      document.getElementById("img-official-logo").src = off.logoFile;
      document.getElementById("txt-official-name").textContent = off.name;
      optOfficial.click();
      document.getElementById("city-picker-modal").style.display = "none";
      document.getElementById("operator-picker-modal").style.display = "flex";
    };
  });

  document.querySelectorAll(".diff-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      tempChosenDiff = btn.dataset.diff;
    };
  });

  const btnBackCities = document.getElementById("btn-back-to-cities");
  if (btnBackCities) {
    btnBackCities.onclick = () => {
      document.getElementById("operator-picker-modal").style.display = "none";
      document.getElementById("city-picker-modal").style.display = "flex";
    };
  }

  const optOfficial = document.getElementById("opt-official-operator");
  const optCustom = document.getElementById("opt-custom-operator");
  const customFields = document.getElementById("custom-operator-fields");

  if (optOfficial) {
    optOfficial.onclick = () => {
      optOfficial.classList.add("selected");
      optCustom.classList.remove("selected");
      customFields.style.display = "none";
      const off = CITIES_DATA[tempChosenCity].officialOperator;
      tempOperatorConfig = {
        isOfficial: true,
        name: off.name,
        fullName: off.fullName,
        logoFile: off.logoFile,
        color: off.color,
        shape: off.shape
      };
    };
  }

  if (optCustom) {
    optCustom.onclick = () => {
      optCustom.classList.add("selected");
      optOfficial.classList.remove("selected");
      customFields.style.display = "flex";
      updateCustomOpPreview();
    };
  }

  function updateCustomOpPreview() {
    const acronym = document.getElementById("cust-op-acronym").value.trim() || "AOM";
    const name = document.getElementById("cust-op-name").value.trim() || "Régie";
    const selectedShape = document.querySelector("#custom-operator-fields .shape-options button.selected[data-op-shape]")?.dataset.opShape || "rectangle";
    const selectedColor = tempOperatorConfig.color || "#38bdf8";

    const badge = document.getElementById("preview-custom-op-badge");
    badge.className = `operator-logo-custom shape-${selectedShape}`;
    badge.style.background = selectedColor;
    badge.textContent = acronym;

    tempOperatorConfig = {
      isOfficial: false,
      name: acronym,
      fullName: name,
      logoFile: "",
      color: selectedColor,
      shape: selectedShape
    };
  }

  const custAcronym = document.getElementById("cust-op-acronym");
  if (custAcronym) custAcronym.oninput = updateCustomOpPreview;

  const custName = document.getElementById("cust-op-name");
  if (custName) custName.oninput = updateCustomOpPreview;

  const opSwatchCont = document.getElementById("op-swatches-container");
  if (opSwatchCont) {
    SWATCH_PALETTE.forEach(c => {
      const sw = document.createElement("div");
      sw.className = `swatch ${c === "#38bdf8" ? 'selected' : ''}`;
      sw.style.background = c;
      sw.onclick = () => {
        document.querySelectorAll("#op-swatches-container .swatch").forEach(s => s.classList.remove("selected"));
        sw.classList.add("selected");
        tempOperatorConfig.color = c;
        updateCustomOpPreview();
      };
      opSwatchCont.appendChild(sw);
    });
  }

  document.querySelectorAll("#custom-operator-fields .shape-options button").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll("#custom-operator-fields .shape-options button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      updateCustomOpPreview();
    };
  });

  const btnConfirmOp = document.getElementById("btn-confirm-operator");
  if (btnConfirmOp) {
    btnConfirmOp.onclick = () => {
      const randomEventsChecked = document.getElementById("chk-random-events") ? document.getElementById("chk-random-events").checked : true;
      document.getElementById("operator-picker-modal").style.display = "none";
      game.startNewGame(tempChosenCity, tempOperatorConfig, tempChosenDiff, randomEventsChecked);
    };
  }

  // Outils Dock
  function setTool(toolName) {
    game.activeTool = toolName;
    document.querySelectorAll(".dock-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tool === toolName);
    });

    const toolbar = document.getElementById("build-toolbar");
    if (toolName === "create-line") {
      toolbar.style.display = "flex";
      if (!game.draftLine.isEditingExisting) {
        game.draftLine.stations = [];
        game.draftLine.type = "bus";
        document.getElementById("build-mode-badge").textContent = "CHOISIR ARRÊTS";
        document.getElementById("build-mode-badge").style.background = "#1e3a8a";
        document.getElementById("build-mode-badge").style.color = "#93c5fd";
        document.getElementById("build-status-text").textContent = "Sélectionnez les arrêts dans l'ordre";
      }
    } else {
      toolbar.style.display = "none";
      game.draftLine.stations = [];
      game.draftLine.isEditingExisting = false;
      game.renderDraft();
    }

    if (toolName === "manage-lines") {
      game.selectedEntity = { type: "line-list" };
      game.renderODFlows();
      game.updateInspector();
    } else if (toolName === "view-od-flows") {
      game.selectedEntity = null;
      game.renderODFlows();
      game.updateInspector();
      game.showToast("Visualisation des flux de navetteurs activée");
    } else if (toolName === "statistics") {
      game.selectedEntity = { type: "statistics" };
      game.renderODFlows();
      game.updateInspector();
    } else {
      if (toolName.startsWith("station-")) {
        game.draftLine.type = toolName.replace("station-", "");
      }
      game.selectedEntity = null;
      game.renderODFlows();
      game.updateInspector();
    }
  }

  document.querySelectorAll(".dock-btn").forEach(btn => {
    btn.onclick = () => {
      setTool(btn.dataset.tool);
    };
  });

  const btnPopStation = document.getElementById("btn-pop-station");
  if (btnPopStation) {
    btnPopStation.onclick = () => game.popLastStationFromDraft();
  }

  const btnCancelBuild = document.getElementById("btn-cancel-build");
  if (btnCancelBuild) {
    btnCancelBuild.onclick = () => {
      setTool("inspect");
    };
  }

  const btnFinishBuild = document.getElementById("btn-finish-build");
  if (btnFinishBuild) {
    btnFinishBuild.onclick = () => {
      game.openLineCustomizer(game.draftLine.isEditingExisting, game.draftLine.isEditingExisting ? game.lines.find(l => l.id === game.draftLine.editingLineId) : null);
    };
  }

  // Modal Lignes
  const custLineCode = document.getElementById("cust-line-code");
  if (custLineCode) custLineCode.oninput = () => game.updateCustomizerPreview();

  const custLineName = document.getElementById("cust-line-name");
  if (custLineName) custLineName.oninput = () => game.updateCustomizerPreview();

  const btnCancelCustomizer = document.getElementById("btn-cancel-customizer");
  if (btnCancelCustomizer) {
    btnCancelCustomizer.onclick = () => {
      document.getElementById("line-customizer-modal").style.display = "none";
    };
  }

  const btnSaveCustomizer = document.getElementById("btn-save-customizer");
  if (btnSaveCustomizer) {
    btnSaveCustomizer.onclick = () => game.commitCustomizedLine();
  }

  document.querySelectorAll(".btn-speed").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".btn-speed").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      game.simSpeed = parseInt(btn.dataset.speed, 10);
    };
  });

  // Filtres
  const filterMapping = [
    { id: "filter-chk-transport", layer: "pois_transport" },
    { id: "filter-chk-sante", layer: "pois_sante" },
    { id: "filter-chk-commerce", layer: "pois_commerce" },
    { id: "filter-chk-culture", layer: "pois_culture" },
    { id: "filter-chk-parcs", layer: "pois_parc" },
    { id: "filter-chk-sport", layer: "pois_sport" },
    { id: "filter-chk-enseignement", layer: "pois_enseignement" },
    { id: "filter-chk-admin", layer: "pois_admin" }
  ];

  filterMapping.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.addEventListener("change", (e) => {
        if (e.target.checked) game.map.addLayer(game.layers[item.layer]);
        else game.map.removeLayer(game.layers[item.layer]);
      });
    }
  });

  const filterDistricts = document.getElementById("filter-chk-districts");
  if (filterDistricts) {
    filterDistricts.onchange = (e) => {
      if (e.target.checked) game.map.addLayer(game.layers.districts);
      else game.map.removeLayer(game.layers.districts);
    };
  }

  const filterTransit = document.getElementById("filter-chk-transit");
  if (filterTransit) {
    filterTransit.onchange = (e) => {
      if (e.target.checked) {
        game.map.addLayer(game.layers.stations);
        game.map.addLayer(game.layers.lines);
        game.map.addLayer(game.layers.vehicles);
      } else {
        game.map.removeLayer(game.layers.stations);
        game.map.removeLayer(game.layers.lines);
        game.map.removeLayer(game.layers.vehicles);
      }
    };
  }

  let allFiltersChecked = true;
  const btnToggleFilters = document.getElementById("btn-toggle-all-filters");
  if (btnToggleFilters) {
    btnToggleFilters.onclick = () => {
      allFiltersChecked = !allFiltersChecked;
      document.querySelectorAll("#layer-filter-panel input[type='checkbox']").forEach(chk => {
        chk.checked = allFiltersChecked;
        chk.dispatchEvent(new Event("change"));
      });
    };
  }
});