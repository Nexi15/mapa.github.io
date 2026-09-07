document.addEventListener("DOMContentLoaded", () => {
    // 1. Wymiary Twojej grafiki mapy (1024x1024 pikseli)
    const mapBounds = [[0, 0], [1024, 1024]];

    // 2. Inicjalizacja prostej mapy graficznej
    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -1,
        maxZoom: 3,
        zoomSnap: 0.5,
        maxBounds: mapBounds,
        maxBoundsViscosity: 0.8,
        attributionControl: false
    });

    // 3. Podpięcie Twojego pliku graficznego z repozytorium
    const image = L.imageOverlay('map.jpg', mapBounds).addTo(map);
    map.fitBounds(mapBounds); // Dopasowanie widoku do całej grafiki

    // 4. Elementy interfejsu
    const blipModal = document.getElementById('blipModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const cancelBtn = document.getElementById('cancelBlipBtn');
    const saveBtn = document.getElementById('saveBlipBtn');
    const blipTitleInput = document.getElementById('blipTitle');
    const blipDescInput = document.getElementById('blipDesc');
    const blipListContainer = document.getElementById('sidebarBlipsList');

    let clickedCoords = null;

    // 5. Funkcja dodawania blipa
    function addBlip(name, desc, coords) {
        // Dodanie znacznika do mapy
        const marker = L.marker(coords).addTo(map);
        marker.bindPopup(`<b>${name}</b><br>${desc || 'Brak opisu'}`);

        // Dodanie pozycji na liście w panelu bocznym
        const li = document.createElement('li');
        li.textContent = `📍 ${name}`;
        li.addEventListener('click', () => {
            map.flyTo(coords, 2);
            marker.openPopup();
        });
        blipListContainer.appendChild(li);
    }

    // Domyślny blip startowy na środku mapy
    addBlip("Siedziba Główna", "Baza operacyjna", [512, 512]);

    // 6. Dodawanie blipa po kliknięciu w dowolne miejsce na mapie
    map.on('click', (e) => {
        clickedCoords = [e.latlng.lat, e.latlng.lng];
        
        blipTitleInput.value = '';
        blipDescInput.value = '';

        modalOverlay.style.display = 'block';
        blipModal.style.display = 'block';
        blipTitleInput.focus();
    });

    // 7. Zamykanie okna formularza
    function closeModal() {
        modalOverlay.style.display = 'none';
        blipModal.style.display = 'none';
        clickedCoords = null;
    }

    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // 8. Zapisywanie blipa
    saveBtn.addEventListener('click', () => {
        const title = blipTitleInput.value.trim();
        const desc = blipDescInput.value.trim();

        if (!title) {
            alert("Wpisz nazwę punktu!");
            return;
        }

        if (clickedCoords) {
            addBlip(title, desc, clickedCoords);
            closeModal();
        }
    });

    // 9. Wyszukiwarka
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
