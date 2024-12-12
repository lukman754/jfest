const SPREADSHEET_URL =
    'https://docs.google.com/spreadsheets/d/1RQ2PZMRKjBVHpG0ettmuiDjjxzpF7OfFDfXlJDT0ElE/gviz/tq';

let allEvents = []; // Store all events globally

function createEventCard(event) {
    const cardContainer = document.getElementById('card-container');
    const card = document.createElement('div');
    card.className = 'col-md-4 mb-4';

    card.innerHTML = `
        <div class="card h-100 shadow-sm">
            <div class="card-body">
                <h5 class="card-title text-primary">${event.namaAcara}</h5>
                <div class="card-text">
                    <p>
                        <i class="bi bi-calendar me-2"></i><strong>Tanggal:</strong> ${event.tanggal}<br>
                        <i class="bi bi-clock me-2"></i><strong>Jam:</strong> ${event.jam}<br>
                        <i class="bi bi-geo-alt me-2"></i><strong>Lokasi:</strong> ${event.lokasi}<br>
                        <i class="bi bi-map me-2"></i><strong>Area:</strong> ${event.area}
                    </p>
                    <small class="text-muted">
                        <strong>Last Update:</strong> ${event.lastUpdate}
                    </small>
                </div>
                <div class="mt-3">
                    <a href="${event.linkAcara}" target="_blank" class="btn btn-outline-primary btn-sm card-link">
                        Lihat Detail
                    </a>
                </div>
            </div>
        </div>
    `;

    cardContainer.appendChild(card);
}

window.google = {
    visualization: {
        Query: {
            setResponse: function (data) {
                processSheetData(data);
            }
        }
    }
};

function fetchGoogleSheetData() {
    const script = document.createElement('script');
    script.src = SPREADSHEET_URL;
    document.body.appendChild(script);
}

function extractMonthFromDate(dateString) {
    if (!dateString || dateString === '-') return null;

    const parts = dateString.split(' ');
    return parts.length > 1 ? parts[1] : null;
}

function processSheetData(response) {
    const cardContainer = document.getElementById('card-container');
    const areaFilter = document.getElementById('areaFilter');
    const monthFilter = document.getElementById('monthFilter');

    cardContainer.innerHTML = ''; // Clear previous content
    areaFilter.innerHTML = '<option value="">Semua Area</option>'; // Reset area filter
    monthFilter.innerHTML = '<option value="">Semua Bulan</option>'; // Reset month filter

    // Tracking event counts
    const allMonthCounts = new Map();
    const allAreaCounts = new Map();
    const monthAreaCounts = new Map();

    // Parse rows
    const rows = response.table.rows;
    allEvents = []; // Reset global events array

    rows.forEach(row => {
        // Extract values from the row, handling potential null values
        const tanggal = row.c[0] ? row.c[0].f : '-';
        const jam = row.c[1] ? (row.c[1].f || '-') : '-';
        const lokasi = row.c[2] ? row.c[2].v : '-';
        const area = row.c[3] ? row.c[3].v : '-';
        const namaAcara = row.c[4] ? row.c[4].v : '-';
        const lastUpdate = row.c[5] ? row.c[5].f : '-';
        const linkAcara = row.c[6] ? row.c[6].v : '#';

        // Extract month
        const month = extractMonthFromDate(tanggal);

        // Count total events per area and month
        if (area !== '-') {
            allAreaCounts.set(area, (allAreaCounts.get(area) || 0) + 1);
        }

        if (month) {
            allMonthCounts.set(month, (allMonthCounts.get(month) || 0) + 1);

            // Count events per month-area combination
            const key = `${month}-${area}`;
            monthAreaCounts.set(key, (monthAreaCounts.get(key) || 0) + 1);
        }

        // Store event data
        allEvents.push({
            tanggal,
            jam,
            lokasi,
            area,
            namaAcara,
            lastUpdate,
            linkAcara,
            month
        });

        // Create Card
        createEventCard({
            tanggal,
            jam,
            lokasi,
            area,
            namaAcara,
            lastUpdate,
            linkAcara
        });
    });

    // Populate month filter dropdown
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    monthOrder.forEach(month => {
        const eventCount = allMonthCounts.get(month) || 0;
        if (eventCount > 0) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = `${month} (${eventCount} event)`;
            monthFilter.appendChild(option);
        }
    });

    // Initial dropdown setup
    updateAreaFilterOptions();

    // Add event listeners for filters
    monthFilter.addEventListener('change', () => {
        updateAreaFilterOptions();
        filterEvents();
    });

    areaFilter.addEventListener('change', filterEvents);
    document.getElementById('searchInput').addEventListener('input', filterEvents);

    function updateAreaFilterOptions() {
        const selectedMonth = monthFilter.value;
        areaFilter.innerHTML = '<option value="">Semua Area</option>';

        // If no month selected, show all areas with total counts
        if (!selectedMonth) {
            Array.from(allAreaCounts.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .forEach(([area, count]) => {
                    const option = document.createElement('option');
                    option.value = area;
                    option.textContent = `${area} (${count} event)`;
                    areaFilter.appendChild(option);
                });
            return;
        }

        // Filter areas based on selected month
        const areasInMonth = new Map();
        allEvents.forEach(event => {
            if (event.month === selectedMonth) {
                const count = areasInMonth.get(event.area) || 0;
                areasInMonth.set(event.area, count + 1);
            }
        });

        // Populate area dropdown for selected month
        Array.from(areasInMonth.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([area, count]) => {
                const option = document.createElement('option');
                option.value = area;
                option.textContent = `${area} (${count} event)`;
                areaFilter.appendChild(option);
            });
    }
}

function filterEvents() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const monthFilter = document.getElementById('monthFilter').value;
    const areaFilter = document.getElementById('areaFilter').value;

    const cardContainer = document.getElementById('card-container');
    cardContainer.innerHTML = ''; // Clear previous content

    // Filter events based on search, month, and area
    const filteredEvents = allEvents.filter(event => {
        const matchesSearch =
            event.namaAcara.toLowerCase().includes(searchInput) ||
            event.lokasi.toLowerCase().includes(searchInput) ||
            event.area.toLowerCase().includes(searchInput);

        const matchesMonth =
            monthFilter === '' ||
            event.month === monthFilter;

        const matchesArea =
            areaFilter === '' ||
            event.area === areaFilter;

        return matchesSearch && matchesMonth && matchesArea;
    });

    // Create cards for filtered events
    filteredEvents.forEach(createEventCard);

    // Show message if no events found
    if (filteredEvents.length === 0) {
        cardContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center" role="alert">
                    Tidak ada event yang ditemukan
                </div>
            </div>
        `;
    }
}

// Fetch the data
fetchGoogleSheetData();
