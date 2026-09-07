document.addEventListener("DOMContentLoaded", () => {
    // HASŁO ADMINA
    const ADMIN_PASSWORD = "boss";
    let isAdmin = false;

    // ADRES TWOJEJ BAZY FIREBASE
    const FIREBASE_URL = "https://mapa-59c13-default-rtdb.europe-west1.firebasedatabase.app/blips";

    // 1. Definicja pola mapy (8192 x 8192)
    const mapBounds = [[0, 0], [8192, 8192]];

    // 2. Inicjalizacja Leaflet
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

    // 3. Elementy UI
    const blipModal = document.getElementById('blipModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const cancelBtn = document.getElementById('cancelBlipBtn');
    const saveBtn = document.getElementById('saveBlipBtn');
    const blipTitleInput = document.getElementById('blipTitle');
    const blipDescInput = document.getElementById('blipDesc');
    const blipListContainer = document.getElementById('sidebarBlipsList');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const modalTitle = document.getElementById('modalTitle');

    let clickedCoords = null;
    let editingBlipData = null;
    let allBlips = [];

    // 4. OBSŁUGA BAZY DANYCH FIREBASE (REST API)
    async function loadBlipsFromFirebase() {
        try {
            const res = await fetch(`${FIREBASE_URL}.json`);
            const data = await res.json();
            
            // Wyszczyszczenie starych markerów z mapy
            allBlips.forEach(b => map.removeLayer(b.marker));
            allBlips = [];

            if (data) {
                Object.keys(data).forEach(id => {
                    const item = data[id];
                    const marker = L.marker(item.coords).addTo(map);
                    marker.bindPopup(`<b>${item.name}</b><br>${item.desc || 'Brak opisu'}`);
                    allBlips.push({ id, name: item.name, desc: item.desc, coords: item.coords, marker });
                });
            }
            renderBlipList();
        } catch (err) {
            console.error("Błąd podczas wczytywania danych z Firebase:", err);
        }
    }

    async function saveBlipToFirebase(name, desc, coords) {
        try {
            await fetch(`${FIREBASE_URL}.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, desc, coords })
            });
            loadBlipsFromFirebase();
        } catch (err) {
            console.error("Błąd zapisu w Firebase:", err);
        }
    }

    async function updateBlipInFirebase(id, name, desc) {
        try {
            await fetch(`${FIREBASE_URL}/${id}.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, desc })
            });
            loadBlipsFromFirebase();
        } catch (err) {
            console.error("Błąd edycji w Firebase:", err);
        }
    }

    async function deleteBlipFromFirebase(id) {
        try {
            await fetch(`${FIREBASE_URL}/${id}.json`, {
                method: 'DELETE'
            });
            loadBlipsFromFirebase();
        } catch (err) {
            console.error("Błąd usuwania z Firebase:", err);
        }
    }

    // 5. Obsługa Logowania Admina
    adminLoginBtn.addEventListener('click', () => {
        if (isAdmin) {
            isAdmin = false;
            adminLoginBtn.textContent = "🔑 Logowanie Admina";
            adminLoginBtn.style.borderColor = "rgba(176, 141, 87, 0.4)";
            alert("Wylogowano z trybu Admina.");
            renderBlipList();
            return;
        }

        const password = prompt("Podaj hasło administratora:");
        if (password === ADMIN_PASSWORD) {
            isAdmin = true;
            adminLoginBtn.textContent = "🔓 Zalogowano (Admin)";
            adminLoginBtn.style.borderColor = "#4CAF50";
            alert("Zalogowano pomyślnie jako Admin!");
            renderBlipList();
        } else if (password !== null) {
            alert("Nieprawidłowe hasło!");
        }
    });

    // 6. Funkcja renderowania listy w panelu
    function renderBlipList() {
        blipListContainer.innerHTML = '';

        allBlips.forEach((blip) => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justify = 'space-between';
            li.style.alignItems = 'center';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = `📍 ${blip.name}`;
            nameSpan.style.cursor = 'pointer';
            nameSpan.addEventListener('click', () => {
                map.flyTo(blip.coords, 0);
                blip.marker.openPopup();
            });

            li.appendChild(nameSpan);

            if (isAdmin) {
                const actionContainer = document.createElement('div');
                
                const editBtn = document.createElement('button');
                editBtn.textContent = '✏️';
                editBtn.title = 'Edytuj';
                editBtn.style.cssText = 'background:none; border:none; cursor:pointer; margin-right:5px;';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(blip);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '❌';
                deleteBtn.title = 'Usuń';
                deleteBtn.style.cssText = 'background:none; border:none; cursor:pointer;';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Czy na pewno chcesz usunąć punkt "${blip.name}"?`)) {
                        deleteBlipFromFirebase(blip.id);
                    }
                });

                actionContainer.appendChild(editBtn);
                actionContainer.appendChild(deleteBtn);
                li.appendChild(actionContainer);
            }

            blipListContainer.appendChild(li);
        });
    }

    // Pierwsze wczytanie danych z chmury
    loadBlipsFromFirebase();

    // 7. Otwieranie Modala dla NOWEGO punktu
    map.on('click', (e) => {
        clickedCoords = [e.latlng.lat, e.latlng.lng];
        editingBlipData = null;

        modalTitle.textContent = "Nowy punkt";
        blipTitleInput.value = '';
        blipDescInput.value = '';

        modalOverlay.style.display = 'block';
        blipModal.style.display = 'block';
        blipTitleInput.focus();
    });

    // 8. Otwieranie Modala dla EDYCJI punktu
    function openEditModal(blip) {
        editingBlipData = blip;

        modalTitle.textContent = "Edytuj punkt";
        blipTitleInput.value = blip.name;
        blipDescInput.value = blip.desc;

        modalOverlay.style.display = 'block';
        blipModal.style.display = 'block';
        blipTitleInput.focus();
    }

    // 9. Zamykanie okna
    function closeModal() {
        modalOverlay.style.display = 'none';
        blipModal.style.display = 'none';
        clickedCoords = null;
        editingBlipData = null;
    }

    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // 10. Zapisywanie (Nowy lub Edycja)
    saveBtn.addEventListener('click', () => {
        const title = blipTitleInput.value.trim();
        const desc = blipDescInput.value.trim();

        if (!title) {
            alert("Podaj nazwę blipa!");
            return;
        }

        if (editingBlipData) {
            updateBlipInFirebase(editingBlipData.id, title, desc);
        } else if (clickedCoords) {
            saveBlipToFirebase(title, desc, clickedCoords);
        }

        closeModal();
    });

    // 11. Wyszukiwarka
    const searchInput = document.getElementById('blipSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            const items = blipListContainer.querySelectorAll('li');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(value) ? 'flex' : 'none';
            });
        });
    }
});
