document.addEventListener("DOMContentLoaded", () => {
    // HASŁO ADMINA - Możesz je zmienić poniżej
    const ADMIN_PASSWORD = "boss";
    let isAdmin = false;

    // 1. Definicja pola mapy
    const mapBounds = [[0, 0], [8192, 8192]];

    // 2. Inicjalizacja Leaflet
    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 3,
        zoomSnap: 0.5,
        maxBounds: mapBounds,
        maxBoundsViscosity: 0.8,
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
    let editingBlipData = null; // Przechowuje dane edytowanego blipa
    const allBlips = [];

    // 4. Obsługa Logowania Admina
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

    // 5. Funkcja renderowania listy w panelu
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
                map.flyTo(blip.coords, 2);
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

    // 6. Funkcja dodawania/aktualizacji blipa
    function createOrUpdateBlip(name, desc, coords, markerToUpdate = null) {
        if (markerToUpdate) {
            // Aktualizacja istniejącego
            markerToUpdate.bindPopup(`<b>${name}</b><br>${desc || 'Brak opisu'}`);
        } else {
            // Tworzenie nowego
            const marker = L.marker(coords).addTo(map);
            marker.bindPopup(`<b>${name}</b><br>${desc || 'Brak opisu'}`);
            allBlips.push({ name, desc, coords, marker });
        }
        renderBlipList();
    }

    // Domyślny blip na start
    createOrUpdateBlip("Siedziba Główna", "Baza operacyjna The Lost MC", [512, 512]);

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
    function openEditModal(blip, index) {
        editingBlipData = { blip, index };

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
            // Edycja istniejącego blipa
            const { blip } = editingBlipData;
            blip.name = title;
            blip.desc = desc;
            createOrUpdateBlip(title, desc, blip.coords, blip.marker);
        } else if (clickedCoords) {
            // Dodawanie nowego blipa
            createOrUpdateBlip(title, desc, clickedCoords);
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
