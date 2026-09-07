document.addEventListener("DOMContentLoaded", () => {
    // 1. Płaski układ współrzędnych dla mapy GTA V
    const mapExtent = [0.00000000, -8192.00000000, 8192.00000000, 0.00000000];
    const mapMinZoom = 2;
    const mapMaxZoom = 5;
    const mapMaxResolution = 1.00000000;
    const mapMinResolution = Math.pow(2, mapMaxZoom) * mapMaxResolution;
    
    const crs = L.CRS.Simple;
    crs.transformation = new L.Transformation(1, -mapExtent[1], -1, mapExtent[2]);
    crs.scale = function(zoom) {
        return Math.pow(2, zoom) / mapMinResolution;
    };
    crs.zoom = function(scale) {
        return Math.log(scale * mapMinResolution) / Math.LN2;
    };

    // 2. Inicjalizacja Mapy
    const map = L.map('map', {
        crs: crs,
        minZoom: mapMinZoom,
        maxZoom: mapMaxZoom,
        attributionControl: false
    });

    // 3. Wczytanie działających kafelków mapy GTA V (Atlas)
    L.tileLayer('https://map.bramstein.com/tiles/atlas/{z}/{x}/{y}.png', {
        minZoom: mapMinZoom,
        maxZoom: mapMaxZoom,
        noWrap: true,
        tms: true
    }).addTo(map);

    // Wyśrodkowanie na Los Santos
    map.setView([-4000, 4000], 3);

    // 4. Blipy
    const blips = [
        { name: "Siedziba Główna", coords: [-5500, 3800], desc: "Baza operacyjna" },
        { name: "Lotnisko Los Santos", coords: [-7000, 3000], desc: "Pas startowy" },
        { name: "Sandy Shores", coords: [-2000, 4500], desc: "Punkt zborny na pustyni" }
    ];

    const blipListContainer = document.getElementById('sidebarBlipsList');

    blips.forEach(blip => {
        const marker = L.marker(blip.coords).addTo(map);
        marker.bindPopup(`<b>${blip.name}</b><br>${blip.desc}`);

        const li = document.createElement('li');
        li.textContent = `📍 ${blip.name}`;
        li.addEventListener('click', () => {
            map.flyTo(blip.coords, 4);
            marker.openPopup();
        });
        blipListContainer.appendChild(li);
    });

    // Wyszukiwarka
    const searchInput = document.getElementById('blipSearchInput');
    searchInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        const items = blipListContainer.querySelectorAll('li');
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(value) ? 'block' : 'none';
        });
    });
});
