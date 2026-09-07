document.addEventListener("DOMContentLoaded", () => {
    const ADMIN_PASSWORD = "boss";
    let isAdmin = false;

    const FIREBASE_URL = "https://mapa-59c13-default-rtdb.europe-west1.firebasedatabase.app/blips";

    // Ikony z podfolderu icons/
    const ICONS = {
        wrak: `<img src="icons/wrak.png" alt="wrak">`,
        npc: `<img src="icons/npc.png" alt="npc">`,
        corner: `<img src="icons/corner.png" alt="corner">`,
        taxidriver: `<img src="icons/taxidriver.png" alt="drug delivery">`,
        flara: `<img src="icons/flara.png" alt="flara">`
    };

    const CATEGORIES = {
        wrak:       { name: "Wrak", sub: "Wrak pojazdu", visible: true, currentIndex: 0 },
        npc:        { name: "NPC", sub: "NPC", visible: true, currentIndex: 0 },
        corner:     { name: "Corner", sub: "Corner", visible: true, currentIndex: 0 },
        taxidriver: { name: "Drug Delivery", sub: "Dostawa Sandy...", visible: true, currentIndex: 0 },
        flara:      { name: "Flara", sub: "Flara", visible: true, currentIndex: 0 }
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

    function createGtaMarkerIcon(categoryKey) {
        const catKey = CATEGORIES[categoryKey] ? categoryKey : 'wrak';
        const imgContent = ICONS[catKey] || ICONS.wrak;

        return L.divIcon({
            className: 'clean-gta-blip',
            html: imgContent,
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

    // Kliknięcie w mapę (Dodawanie blipa)
    map.on('click', (e) => {
        if (!isAdmin) {
            alert("Zaloguj się jako Admin, aby dodawać punkty!");
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

    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    if (saveBtn) {
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
            const iconImg = ICONS[key] || ICONS.wrak;

            const row = document.createElement('div');
            row.className = `category-row ${cat.visible ? 'active' : 'inactive'}`;
            
            row.innerHTML = `
                <div class="category-info">
                    <div class="category-icon-box">${iconImg}</div>
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
