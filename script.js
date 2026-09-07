document.addEventListener("DOMContentLoaded", () => {
    const ADMIN_PASSWORD = "boss";
    let isAdmin = false;

    const FIREBASE_URL = "https://mapa-59c13-default-rtdb.europe-west1.firebasedatabase.app/blips";

    // Konfiguracja kategorii ze wskazaniem na Twoje grafiki PNG
    const CATEGORIES = {
        wrak:       { name: "Wrak", sub: "Wrak pojazdu", icon: "wrak.png", visible: true, currentIndex: 0 },
        flara:      { name: "Flara", sub: "Flara", icon: "flara.png", visible: true, currentIndex: 0 },
        npc:        { name: "NPC", sub: "NPC", icon: "npc.png", visible: true, currentIndex: 0 },
        corner:     { name: "Corner", sub: "Corner", icon: "corner.png", visible: true, currentIndex: 0 },
        stol:       { name: "Stół", sub: "Stół do wytwarzania...", icon: "stol.png", visible: true, currentIndex: 0 },
        grzyby:     { name: "Grzyby", sub: "Grzyby", icon: "grzyby.png", visible: true, currentIndex: 0 },
        taxidriver: { name: "Drug Delivery", sub: "Drug Delivery Sandy...", icon: "taxidriver.png", visible: true, currentIndex: 0 },
        napad:      { name: "Napad", sub: "Napad na ammunat...", icon: "napad.png", visible: true, currentIndex: 0 },
        weed:       { name: "Weedshop", sub: "Sklep z ziołem", icon: "weed.png", visible: true, currentIndex: 0 },
        kopalnia:   { name: "Kopalnia", sub: "Punkt wydobycia", icon: "kopalnia.png", visible: true, currentIndex: 0 },
        rabunek:    { name: "Rabunek kasetki", sub: "Kasetka sklepowa", icon: "rabunek.png", visible: true, currentIndex: 0 }
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

    // UI elements
    const blipModal = document.getElementById('blipModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const cancelBtn = document.getElementById('cancelBlipBtn');
    const saveBtn = document.getElementById('saveBlipBtn');
    const blipTitleInput = document.getElementById('blipTitle');
    const blipCategorySelect = document.getElementById('blipCategory');
    const blipDescInput = document.getElementById('blipDesc');
    const categoriesContainer = document.getElementById('categoriesContainer');
    const blipListContainer = document.getElementById('sidebarBlipsList');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const modalTitle = document.getElementById('modalTitle');

    let clickedCoords = null;
    let editingBlipData = null;
    let allBlips = [];

    // Funkcja generująca czysty znacznik Leaflet z pliku PNG
    function createGtaMarkerIcon(categoryKey) {
        const cat = CATEGORIES[categoryKey] || { icon: "flara.png" };
        return L.divIcon({
            className: 'clean-gta-blip',
            html: `<img src="${cat.icon}" alt="blip" onerror="this.src='flara.png';" />`,
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
                    const catKey = item.category || 'flara';
                    
                    const marker = L.marker(item.coords, { icon: createGtaMarkerIcon(catKey) });
                    const catInfo = CATEGORIES[catKey] || CATEGORIES.flara;
                    
                    marker.bindPopup(`<b>${item.name}</b><br><i>${catInfo.name}</i><br><br>${item.desc || 'Brak opisu'}`);
                    
                    allBlips.push({ id, name: item.name, category: catKey, desc: item.desc, coords: item.coords, marker });
                });
            }
            renderCategories();
            renderBlipList();
        } catch (err) {
            console.error("Błąd wczytywania danych z Firebase:", err);
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

    // Logowanie Admina
    adminLoginBtn.addEventListener('click', () => {
        if (isAdmin) {
            isAdmin = false;
            adminLoginBtn.textContent = "🔑 Logowanie Admina";
            renderBlipList();
            return;
        }

        const password = prompt("Podaj hasło administratora:");
        if (password === ADMIN_PASSWORD) {
            isAdmin = true;
            adminLoginBtn.textContent = "🔓 Zalogowano (Admin)";
            renderBlipList();
        } else if (password !== null) {
            alert("Błędne hasło!");
        }
    });

    // Przełączanie pozycji po kliknięciu strzałki < lub >
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

    // Generator interfejsu kafelków
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
                    <img src="${cat.icon}" class="category-icon-img" alt="${cat.name}" onerror="this.style.display='none';">
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

    function renderBlipList() {
        if (!blipListContainer) return;
        blipListContainer.innerHTML = '';

        allBlips.forEach(blip => {
            const cat = CATEGORIES[blip.category] || CATEGORIES.flara;

            if (cat.visible) {
                blip.marker.addTo(map);
            } else {
                map.removeLayer(blip.marker);
                return;
            }

            // Opcje panelu admina (edycja / usuwanie na liście poniżej)
            if (isAdmin) {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.justify = 'space-between';
                li.style.alignItems = 'center';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = blip.name;
                nameSpan.style.cursor = 'pointer';
                nameSpan.addEventListener('click', () => {
                    map.flyTo(blip.coords, 1);
                    blip.marker.openPopup();
                });

                const actionContainer = document.createElement('div');
                const editBtn = document.createElement('button');
                editBtn.textContent = '✏️';
                editBtn.style.cssText = 'background:none; border:none; cursor:pointer; margin-right:5px;';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(blip);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '❌';
                deleteBtn.style.cssText = 'background:none; border:none; cursor:pointer;';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Usunąć "${blip.name}"?`)) {
                        deleteBlipFromFirebase(blip.id);
                    }
                });

                actionContainer.appendChild(editBtn);
                actionContainer.appendChild(deleteBtn);
                li.appendChild(nameSpan);
                li.appendChild(actionContainer);
                blipListContainer.appendChild(li);
            }
        });
    }

    // Modal dodawania / edycji
    map.on('click', (e) => {
        if (!isAdmin) return; // Tylko zalogowany admin dodaje kliknięciem
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
        blipCategorySelect.value = blip.category || 'flara';
        blipDescInput.value = blip.desc;

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

    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', () => {
        const title = blipTitleInput.value.trim();
        const category = blipCategorySelect.value;
        const desc = blipDescInput.value.trim();

        if (!title) return alert("Podaj nazwę!");

        if (editingBlipData) {
            updateBlipInFirebase(editingBlipData.id, title, category, desc);
        } else if (clickedCoords) {
            saveBlipToFirebase(title, category, desc, clickedCoords);
        }

        closeModal();
    });

    // Wyszukiwarka
    const searchInput = document.getElementById('blipSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            const rows = categoriesContainer.querySelectorAll('.category-row');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(value) ? 'flex' : 'none';
            });
        });
    }

    loadBlipsFromFirebase();
});
