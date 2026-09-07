document.addEventListener("DOMContentLoaded", () => {
    // HASŁO ADMINA - Ustawione na "boss"
    const ADMIN_PASSWORD = "boss";
    let isAdmin = false;

    // 1. Definicja pola mapy (8192 x 8192)
    const mapBounds = [[0, 0], [8192, 8192]];

    // 2. Inicjalizacja Leaflet (umożliwia dalsze oddalanie)
    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -3,            // Pozwala bardzo mocno oddalić mapę
        maxZoom: 3,             // Maksymalne przybliżenie
        zoomSnap: 0.25,         // Płynniejsze przybliżanie/oddalanie
        maxBounds: mapBounds,
        maxBoundsViscosity: 0.2,// Elastyczne krawędzie ułatwiające oddalanie
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

    // 4. ZAPISYWANIE I WCZYTYWANIE Z LOCALSTORAGE
    function saveBlipsToStorage() {
        const blipsToSave = allBlips.map(b => ({
            name: b.name,
            desc: b.desc,
            coords: b.coords
        }));
        localStorage.setItem('lostmc_blips', JSON.stringify(blipsToSave));
    }

    function loadBlipsFromStorage() {
        const savedData = localStorage.getItem('lostmc_blips');
        if (savedData) {
            const parsedBlips = JSON.parse(savedData);
            parsedBlips.forEach(b => {
                createOrUpdateBlip(b.name, b.desc, b.coords, null, false);
            });
        } else {
            // Jeśli baza jest pusta, utwórz domyślny punkt początkowy
            createOrUpdateBlip("Siedziba Główna", "Baza operacyjna The Lost MC", [4096, 4096], null, true);
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
            alert("Zalogowano pomyślnie jako Admin! Masz dostęp do edycji i usuwania punktów.");
            renderBlipList();
        } else if (password !== null) {
            alert("Nieprawidłowe hasło!");
        }
    });

    // 6. Funkcja renderowania listy w panelu
    function renderBlipList() {
        blipListContainer.innerHTML = '';

        allBlips.forEach((blip, index) => {
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

            // Jeśli jest Adminem — dodaj przyciski Edytuj i Usuń
            if (isAdmin) {
                const actionContainer = document.createElement('div');
                
                const editBtn = document.createElement('button');
                editBtn.textContent = '✏️';
                editBtn.title = 'Edytuj';
                editBtn.style.cssText = 'background:none; border:none; cursor:pointer; margin-right:5px;';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(blip, index);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '❌';
                deleteBtn.title = 'Usuń';
                deleteBtn.style.cssText = 'background:none; border:none; cursor:pointer;';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Czy na pewno chcesz usunąć punkt "${blip.name}"?`)) {
                        map.removeLayer(blip.marker);
                        allBlips.splice(index, 1);
                        saveBlipsToStorage();
                        renderBlipList();
                    }
                });

                actionContainer.appendChild(editBtn);
                actionContainer.appendChild(deleteBtn);
                li.appendChild(actionContainer);
            }

            blipListContainer.appendChild(li);
        });
    }

    // 7. Funkcja dodawania/aktualizacji blipa
    function createOrUpdateBlip(name, desc, coords, markerToUpdate = null, shouldSave = true) {
        if (markerToUpdate) {
            // Aktualizacja istniejącego
            markerToUpdate.bindPopup(`<b>${name}</b><br>${desc || 'Brak opisu'}`);
        } else {
            // Tworzenie nowego
            const marker = L.marker(coords).addTo(map);
            marker.bindPopup(`<b>${name}</b><br>${desc || 'Brak opisu'}`);
            allBlips.push({ name, desc, coords, marker });
        }

        if (shouldSave) {
            saveBlipsToStorage();
        }
        renderBlipList();
    }

    // Wczytaj zapisane blipy przy uruchomieniu strony
    loadBlipsFromStorage();

    // 8. Otwieranie Modala dla NOWEGO punktu
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

    // 9. Otwieranie Modala dla EDYCJI punktu
    function openEditModal(blip, index) {
        editingBlipData = { blip, index };

        modalTitle.textContent = "Edytuj punkt";
        blipTitleInput.value = blip.name;
        blipDescInput.value = blip.desc;

        modalOverlay.style.display = 'block';
        blipModal.style.display = 'block';
        blipTitleInput.focus();
    }

    // 10. Zamykanie okna
    function closeModal() {
        modalOverlay.style.display = 'none';
        blipModal.style.display = 'none';
        clickedCoords = null;
        editingBlipData = null;
    }

    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // 11. Zapisywanie (Nowy lub Edycja)
    saveBtn.addEventListener('click', () => {
        const title = blipTitleInput.value.trim();
        const desc = blipDescInput.value.trim();

        if (!title) {
            alert("Podaj nazwę blipa!");
            return;
        }

        if (editingBlipData) {
            // Edycja istniejącego blipa
            const { blip } = editingBlipData;
            blip.name = title;
            blip.desc = desc;
            createOrUpdateBlip(title, desc, blip.coords, blip.marker, true);
        } else if (clickedCoords) {
            // Dodawanie nowego blipa
            createOrUpdateBlip(title, desc, clickedCoords, null, true);
        }

        closeModal();
    });

    // 12. Wyszukiwarka
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
