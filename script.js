document.addEventListener("DOMContentLoaded", () => {
    // 1. Definicja pola mapy (dla pliku map.png)
    const mapBounds = [[0, 0], [8192, 8192]];

    // 2. Inicjalizacja Leaflet
    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -1,
        maxZoom: 3,
        zoomSnap: 0.5,
        maxBounds: mapBounds,
        maxBoundsViscosity: 0.8,
        attributionControl: false
    });

    // 3. Wczytanie obrazka map.png z repozytorium
    L.imageOverlay('map.png', mapBounds).addTo(map);
    map.fitBounds(mapBounds);

    // 4. Elementy UI
    const blipModal = document.getElementById('blipModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const cancelBtn = document.getElementById('cancelBlipBtn');
    const saveBtn = document.getElementById('saveBlipBtn');
    const blipTitleInput = document.getElementById('blipTitle');
    const blipDescInput = document.getElementById('blipDesc');
    const blipListContainer = document.getElementById('sidebarBlipsList');

    let clickedCoords = null;

    // 5. Dodawanie punktu
    function addBlip(name, desc, coords) {
        const marker = L.marker(coords).addTo(map);
        marker.bindPopup(`<b>${name}</b><br>${desc || 'Brak opisu'}`);

        const li = document.createElement('li');
        li.textContent = `📍 ${name}`;
        li.addEventListener('click', () => {
            map.flyTo(coords, 2);
            marker.openPopup();
        });
        blipListContainer.appendChild(li);
    }

    // Punkt początkowy
    addBlip("Siedziba Główna", "Baza operacyjna The Lost MC", [512, 512]);

    // 6. Otwieranie modala po kliknięciu na mapę
    map.on('click', (e) => {
        clickedCoords = [e.latlng.lat, e.latlng.lng];
        
        blipTitleInput.value = '';
        blipDescInput.value = '';

        modalOverlay.style.display = 'block';
        blipModal.style.display = 'block';
        blipTitleInput.focus();
    });

    // 7. Zamykanie okna
    function closeModal() {
        modalOverlay.style.display = 'none';
        blipModal.style.display = 'none';
        clickedCoords = null;
    }

    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // 8. Zapis punktu
    saveBtn.addEventListener('click', () => {
        const title = blipTitleInput.value.trim();
        const desc = blipDescInput.value.trim();

        if (!title) {
            alert("Podaj nazwę blipa!");
            return;
        }

        if (clickedCoords) {
            addBlip(title, desc, clickedCoords);
            closeModal();
        }
    });

    // 9. Szukajka
    const searchInput = document.getElementById('blipSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            const items = blipListContainer.querySelectorAll('li');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(value) ? 'block' : 'none';
            });
        });
    }
});
