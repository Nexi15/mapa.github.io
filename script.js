document.addEventListener("DOMContentLoaded", () => {
    const ADMIN_PASSWORD = "boss";
    let isAdmin = false;

    const FIREBASE_URL = "https://mapa-59c13-default-rtdb.europe-west1.firebasedatabase.app/blips";

    // Awaryjne ikony SVG (wyświetlą się zawsze, jeśli zabraknie pliku PNG)
    const FALLBACK_SVG = {
        wrak: `<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4h14v4z"/></svg>`,
        npc: `<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
        corner: `<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 2L9 9H2l6 4.5L5.5 21 12 16.5 18.5 21 16 13.5 22 9h-7z"/></svg>`,
        taxidriver: `<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/></svg>`,
        flara: `<svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`
    };

    const CATEGORIES = {
        wrak:       { name: "Wrak", sub: "Wrak pojazdu", icon: "wrak.png", visible: true, currentIndex: 0 },
        npc:        { name: "NPC", sub: "NPC", icon: "npc.png", visible: true, currentIndex: 0 },
        corner:     { name: "Corner", sub: "Corner", icon: "corner.png", visible: true, currentIndex: 0 },
        taxidriver: { name: "Drug Delivery", sub: "Drug Delivery Sandy...", icon: "taxidriver.png", visible: true, currentIndex: 0 },
        flara:      { name: "Flara", sub: "Flara", icon: "flara.png", visible: true, currentIndex: 0 }
    };

    const mapBounds = [[0, 0], [8192, 8192]];

    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 3,
        zoomSnap: 0.25,
        maxBounds: mapBounds,
        maxBoundsViscosity: 0.2,
        attributionControl: false
    });

    L.imageOverlay('map.png', mapBounds).addTo(map);
    map.fitBounds(mapBounds);

    // Pobieranie elementów interfejsu
    const categoriesContainer = document.getElementById('categoriesContainer');
    const blipListContainer = document.getElementById('sidebarBlipsList');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    
    const modalOverlay = document.getElementById('modalOverlay');
    const blipModal = document.getElementById('blipModal');
    const cancelBtn = document.getElementById('cancelBlipBtn');
    const saveBtn = document.getElementById('saveBlipBtn');
    const blipTitleInput = document.getElementById('blipTitle');
    const blipCategorySelect = document.getElementById('blipCategory');
    const blipDescInput = document.getElementById('blipDesc');
    const modalTitle = document.getElementById('modalTitle');

    let clickedCoords = null;
    let editingBlipData = null;
    let allBlips = [];

    // Generowanie odpornej na błędy ikony
    function createGtaMarkerIcon(categoryKey) {
        const catKey = CATEGORIES[categoryKey] ? categoryKey : 'wrak';
        const cat = CATEGORIES[catKey];
        const svgFallback = FALLBACK_SVG[catKey] || FALLBACK_SVG.wrak;

        return L.divIcon({
            className: 'clean-gta-blip',
            html: `<img src="${cat.icon}" alt="blip" onerror="this.outerHTML='${svgFallback.replace(/'/g, "\\'")}';" />`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    }

    async function loadBlipsFromFirebase() {
        try {
            const res = await fetch(`${FIREBASE_URL}.json`);
            const data = await res.json();
            
            allBlips.forEach(b => map.removeLayer(b.marker));
            allBlips = [];

            if (data) {
                Object.keys(data).forEach(id => {
                    const item = data[id];
                    const catKey = item.category && CATEGORIES[item.category] ? item.category : 'wrak';
                    
                    const marker = L.marker(item.coords, { icon: createGtaMarkerIcon(catKey) });
                    const catInfo = CATEGORIES[catKey] || CATEGORIES.wrak;
                    
                    marker.bindPopup(`<b>${item.name}</b><br><i>${catInfo.name}</i><br><br>${item.desc || 'Brak opisu'}`);
                    
                    allBlips.push({ id, name: item.name, category: catKey, desc: item.desc, coords: item.coords, marker });
                });
            }
        } catch (err) {
            console.error("Błąd wczytywania Firebase:", err);
        } finally {
            renderCategories();
            renderBlipList();
        }
    }

    async function saveBlipToFirebase(name, category, desc, coords) {
        await fetch(`${FIREBASE_URL}.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category, desc, coords })
        });
        loadBlipsFromFirebase();
    }

    async function updateBlipInFirebase(id, name, category, desc) {
        await fetch(`${FIREBASE_URL}/${id}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category, desc })
        });
        loadBlipsFromFirebase();
    }

    async function deleteBlipFromFirebase(id) {
        await fetch(`${FIREBASE_URL}/${id}.json`, { method: 'DELETE' });
        loadBlipsFromFirebase();
    }

    // KLIKNIĘCIE W MAPĘ - POWIĄZANIE
    map.on('click', (e) => {
        if (!isAdmin) {
            alert("Najpierw zaloguj się jako Admin!");
            return;
        }
        clickedCoords = [e.latlng.lat, e.latlng.lng];
        editingBlipData = null;

        modalTitle.textContent = "Nowy punkt";
        blipTitleInput.value = '';
        blipCategorySelect.value = 'wrak';
        blipDescInput.value = '';

        modalOverlay.style.display = 'block';
        blipModal.style.display = 'block';
        blipTitleInput.focus();
    });

    function openEditModal(blip) {
        editingBlipData = blip;

        modalTitle.textContent = "Edytuj punkt";
        blipTitleInput.value = blip.name;
        blipCategorySelect.value = blip.category || 'wrak';
        blipDescInput.value = blip.desc || '';

        modalOverlay.style.display = 'block';
        blipModal.style.display = 'block';
        blipTitleInput.focus();
    }

    function closeModal() {
        modalOverlay.style.display = 'none';
        blipModal.style.display = 'none';
        clickedCoords = null;
        editingBlipData = null;
    }

    if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if(modalOverlay) modalOverlay.addEventListener('click', closeModal);

    if(saveBtn) {
        saveBtn.addEventListener('click', () => {
            const title = blipTitleInput.value.trim();
            const category = blipCategorySelect.value;
            const desc = blipDescInput.value.trim();

            if (!title) return alert("Podaj nazwę blipa!");

            if (editingBlipData) {
                updateBlipInFirebase(editingBlipData.id, title, category, desc);
            } else if (clickedCoords) {
                saveBlipToFirebase(title, category, desc, clickedCoords);
            }

            closeModal();
        });
    }

    function renderCategories() {
        if (!categoriesContainer) return;
        categoriesContainer.innerHTML = '';

        Object.keys(CATEGORIES).forEach(key => {
            const cat = CATEGORIES[key];
            const catBlips = allBlips.filter(b => b.category === key);
            const totalCount = catBlips.length;
            const displayIndex = totalCount > 0 ? (cat.currentIndex % totalCount) + 1 : 0;
            const svgFallback = FALLBACK_SVG[key] || FALLBACK_SVG.wrak;

            const row = document.createElement('div');
            row.className = `category-row ${cat.visible ? 'active' : 'inactive'}`;
            
            row.innerHTML = `
                <div class="category-info">
                    <img src="${cat.icon}" class="category-icon-img" alt="${cat.name}" onerror="this.outerHTML='${svgFallback.replace(/'/g, "\\'")}';">
                    <div class="category-name-group">
                        <span class="category-title">${cat.name}</span>
                        <span class="category-subtitle">${cat.sub}</span>
                    </div>
                </div>
                <div class="category-toggle">
                    <span class="nav-arrow prev-arrow">&lt;</span>
                    <span>${displayIndex}/${totalCount}</span>
                    <span class="nav-arrow next-arrow">&gt;</span>
                </div>
            `;

            row.querySelector('.category-info').addEventListener('click', () => {
                cat.visible = !cat.visible;
                renderCategories();
                renderBlipList();
            });

            row.querySelector('.prev-arrow').addEventListener('click', (e) => {
                e.stopPropagation();
                navigateCategoryBlip(key, 'prev');
            });

            row.querySelector('.next-arrow').addEventListener('click', (e) => {
                e.stopPropagation();
                navigateCategoryBlip(key, 'next');
            });

            categoriesContainer.appendChild(row);
        });
    }

    function navigateCategoryBlip(catKey, direction) {
        const catBlips = allBlips.filter(b => b.category === catKey);
        if (catBlips.length === 0) return;

        const cat = CATEGORIES[catKey];
        if (!cat.visible) {
            cat.visible = true;
            renderCategories();
            renderBlipList();
        }

        if (direction === 'next') {
            cat.currentIndex = (cat.currentIndex + 1) % catBlips.length;
        } else if (direction === 'prev') {
            cat.currentIndex = (cat.currentIndex - 1 + catBlips.length) % catBlips.length;
        }

        const targetBlip = catBlips[cat.currentIndex];
        if (targetBlip) {
            map.flyTo(targetBlip.coords, 1, { duration: 0.8 });
            targetBlip.marker.openPopup();
        }

        renderCategories();
    }

    function renderBlipList() {
        if (!blipListContainer) return;
        blipListContainer.innerHTML = '';

        allBlips.forEach(blip => {
            const cat = CATEGORIES[blip.category] || CATEGORIES.wrak;

            if (cat && cat.visible) {
                blip.marker.addTo(map);
            } else {
                map.removeLayer(blip.marker);
            }

            if (isAdmin) {
                const li = document.createElement('li');
                li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:4px;';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = blip.name;
                nameSpan.style.cursor = 'pointer';
                nameSpan.addEventListener('click', () => {
                    map.flyTo(blip.coords, 1);
                    blip.marker.openPopup();
                });

                const actionDiv = document.createElement('div');
                
                const editBtn = document.createElement('button');
                editBtn.textContent = '✏️';
                editBtn.style.cssText = 'background:none; border:none; cursor:pointer; margin-right:6px;';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(blip);
                });

                const delBtn = document.createElement('button');
                delBtn.textContent = '❌';
                delBtn.style.cssText = 'background:none; border:none; cursor:pointer;';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Usunąć blip "${blip.name}"?`)) {
                        deleteBlipFromFirebase(blip.id);
                    }
                });

                actionDiv.appendChild(editBtn);
                actionDiv.appendChild(delBtn);
                li.appendChild(nameSpan);
                li.appendChild(actionDiv);
                blipListContainer.appendChild(li);
            }
        });
    }

    // Obsługa Przycisku Admina
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            if (isAdmin) {
                isAdmin = false;
                adminLoginBtn.textContent = "🔑 Logowanie Admina";
                renderBlipList();
            } else {
                const password = prompt("Podaj hasło administratora:");
                if (password === ADMIN_PASSWORD) {
                    isAdmin = true;
                    adminLoginBtn.textContent = "🔓 Zalogowano (Admin)";
                    renderBlipList();
                } else if (password !== null) {
                    alert("Błędne hasło!");
                }
            }
        });
    }

    loadBlipsFromFirebase();
});
