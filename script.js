document.addEventListener("DOMContentLoaded", () => {
    const ADMIN_PASSWORD = "boss";
    let isAdmin = false;

    const FIREBASE_URL = "https://mapa-59c13-default-rtdb.europe-west1.firebasedatabase.app/blips";

    // Konfiguracja kategorii
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

    // Pobieranie elementów z DOM
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

    // Bezpieczny generator ikony (bez fallbacku do standardowej szarej ikonki Leafleta)
    function createGtaMarkerIcon(categoryKey) {
        const cat = CATEGORIES[categoryKey] || CATEGORIES.flara || { icon: "wrak.png" };
        return L.divIcon({
            className: 'clean-gta-blip',
            html: `<img src="${cat.icon}" alt="blip" />`,
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
                    const catInfo = CATEGORIES[catKey];
                    
                    marker.bindPopup(`<b>${item.name}</b><br><i>${catInfo ? catInfo.name : 'Punkt'}</i><br><br>${item.desc || 'Brak opisu'}`);
                    
                    allBlips.push({ id, name: item.name, category: catKey, desc: item.desc, coords: item.coords, marker });
                });
            }
        } catch (err) {
            console.error("Błąd wczytywania z Firebase:", err);
        } finally {
            renderCategories();
            renderBlipList();
        }
    }

    function renderCategories() {
        if (!categoriesContainer) return;
        categoriesContainer.innerHTML = '';

        Object.keys(CATEGORIES).forEach(key => {
            const cat = CATEGORIES[key];
            const catBlips = allBlips.filter(b => b.category === key);
            const totalCount = catBlips.length;
            const displayIndex = totalCount > 0 ? (cat.currentIndex % totalCount) + 1 : 0;

            const row = document.createElement('div');
            row.className = `category-row ${cat.visible ? 'active' : 'inactive'}`;
            
            row.innerHTML = `
                <div class="category-info">
                    <img src="${cat.icon}" class="category-icon-img" alt="${cat.name}">
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
        });
    }

    // Logowanie Admina
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            if (isAdmin) {
                isAdmin = false;
                adminLoginBtn.textContent = "🔑 Logowanie Admina";
            } else {
                const password = prompt("Podaj hasło administratora:");
                if (password === ADMIN_PASSWORD) {
                    isAdmin = true;
                    adminLoginBtn.textContent = "🔓 Zalogowano (Admin)";
                } else if (password !== null) {
                    alert("Błędne hasło!");
                }
            }
        });
    }

    loadBlipsFromFirebase();
});
