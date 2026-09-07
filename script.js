document.addEventListener("DOMContentLoaded", () => {
    // Inicjalizacja mapy Leaflet
    const map = L.map('map').setView([51.505, -0.09], 13);

    // Dodanie warstwy mapy (Dark mode OpenStreetMap)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Marker Cluster
    const markers = L.markerClusterGroup();
    map.addLayer(markers);

    // Przełączanie widoczności panelu filtrów
    const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
    const filtersContainer = document.getElementById('filtersContainer');

    toggleFiltersBtn.addEventListener('click', () => {
        const isHidden = filtersContainer.style.display === 'none' || filtersContainer.style.display === '';
        filtersContainer.style.display = isHidden ? 'block' : 'none';
    });

    // Obsługa Modala
    const modalOverlay = document.getElementById('modalOverlay');
    const blipModal = document.getElementById('blipModal');
    const cancelBtn = document.getElementById('cancelBlipBtn');

    function closeModal() {
        modalOverlay.style.display = 'none';
        blipModal.style.display = 'none';
    }

    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
});
