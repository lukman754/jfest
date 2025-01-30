// Configuration
const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1RQ2PZMRKjBVHpG0ettmuiDjjxzpF7OfFDfXlJDT0ElE/gviz/tq";
const ITEMS_PER_PAGE = 9;

// Global state
let allEvents = [];
let currentPage = 1;

// Initialize Google Visualization API
window.google = {
  visualization: {
    Query: {
      setResponse: function (data) {
        processSheetData(data);
      },
    },
  },
};

// Fetch data from Google Sheets
function fetchGoogleSheetData() {
  const script = document.createElement("script");
  script.src = SPREADSHEET_URL;
  document.body.appendChild(script);
}

// Extract month from date string
function extractMonthFromDate(dateString) {
  if (!dateString || dateString === "-") return null;
  const parts = dateString.split(" ");
  return parts.length > 1 ? parts[1] : null;
}

// Process sheet data
function processSheetData(response) {
  const cardContainer = document.getElementById("card-container");
  const areaFilter = document.getElementById("areaFilter");
  const monthFilter = document.getElementById("monthFilter");

  // Clear existing content
  cardContainer.innerHTML = "";
  areaFilter.innerHTML = '<option value="">Semua Area</option>';
  monthFilter.innerHTML = '<option value="">Semua Bulan</option>';

  // Initialize counters
  const allMonthCounts = new Map();
  const allAreaCounts = new Map();
  const monthAreaCounts = new Map();

  // Reset events array
  allEvents = [];

  // Process each row
  response.table.rows.forEach((row) => {
    const event = {
      tanggal: row.c[0] ? row.c[0].f : "-",
      jam: row.c[1] ? row.c[1].f || "-" : "-",
      lokasi: row.c[2] ? row.c[2].v : "-",
      area: row.c[3] ? row.c[3].v : "-",
      namaAcara: row.c[4] ? row.c[4].v : "-",
      lastUpdate: row.c[5] ? row.c[5].f : "-",
      linkAcara: row.c[6] ? row.c[6].v : "#",
    };

    // Extract and add month
    event.month = extractMonthFromDate(event.tanggal);

    // Update counters
    if (event.area !== "-") {
      allAreaCounts.set(event.area, (allAreaCounts.get(event.area) || 0) + 1);
    }

    if (event.month) {
      allMonthCounts.set(
        event.month,
        (allMonthCounts.get(event.month) || 0) + 1
      );
      const key = `${event.month}-${event.area}`;
      monthAreaCounts.set(key, (monthAreaCounts.get(key) || 0) + 1);
    }

    // Store event
    allEvents.push(event);
  });

  // Populate month filter
  const monthOrder = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  monthOrder.forEach((month) => {
    const count = allMonthCounts.get(month) || 0;
    if (count > 0) {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = `${month} (${count} event)`;
      monthFilter.appendChild(option);
    }
  });

  // Initialize filters and display
  updateAreaFilterOptions();
  filterEvents();

  // Add event listeners
  monthFilter.addEventListener("change", () => {
    currentPage = 1;
    updateAreaFilterOptions();
    filterEvents();
  });

  areaFilter.addEventListener("change", () => {
    currentPage = 1;
    filterEvents();
  });

  document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1;
    filterEvents();
  });
}

// Update area filter options based on selected month
function updateAreaFilterOptions() {
  const monthFilter = document.getElementById("monthFilter");
  const areaFilter = document.getElementById("areaFilter");
  const selectedMonth = monthFilter.value;

  areaFilter.innerHTML = '<option value="">Semua Area</option>';

  const areas = new Map();

  if (selectedMonth) {
    // Filter areas for selected month
    allEvents.forEach((event) => {
      if (event.month === selectedMonth) {
        areas.set(event.area, (areas.get(event.area) || 0) + 1);
      }
    });
  } else {
    // Show all areas
    allEvents.forEach((event) => {
      areas.set(event.area, (areas.get(event.area) || 0) + 1);
    });
  }

  // Add area options
  Array.from(areas.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([area, count]) => {
      if (area !== "-") {
        const option = document.createElement("option");
        option.value = area;
        option.textContent = `${area} (${count} event)`;
        areaFilter.appendChild(option);
      }
    });
}

// Create event card
function createEventCard(event) {
  const card = document.createElement("div");
  card.className = "col-md-6 col-lg-4";

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    event.lokasi
  )}`;

  card.innerHTML = `
        <div class="card event-card h-100">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h5 class="card-title mb-0">${event.namaAcara}</h5>
                    <span class="badge bg-success">${event.area}</span>
                </div>
                <p class="card-text text-muted small mb-1">
                    <i class="fas fa-calendar me-1"></i>
                    ${event.tanggal}
                </p>
                <p class="card-text text-muted small mb-3">
                    <i class="fas fa-map-marker-alt me-1"></i>
                    ${event.lokasi}
                </p>
                <div class="d-flex gap-2 mb-2">
                    <a href="${event.linkAcara}" class="btn btn-primary btn-sm" target="_blank">
                        <i class="fas fa-calendar-check me-1"></i>
                        Lihat Acara
                    </a>
                    <button onclick="window.open('${mapsUrl}', '_blank')" class="btn btn-outline-secondary btn-sm">
                        <img src="https://img.icons8.com/?size=100&id=DcygmpZqBEd9&format=png&color=000000" width="20">
                        Lihat Lokasi
                    </button>
                </div>
            </div>
        </div>
    `;

  return card;
}

// Create pagination UI

// Update the HTML structure first
function updateTotalEvents(totalItems) {
  const totalEventsContainer = document.getElementById(
    "total-events-container"
  );
  totalEventsContainer.innerHTML = `
        <div class="d-flex px-2 justify-content-between align-items-center mb-3">
            <small class="text-muted mb-0">
                Total Events: <strong>${totalItems}</strong>
            </small>
            <small class="text-muted">Showing page ${currentPage} of ${Math.ceil(
    totalItems / ITEMS_PER_PAGE
  )}</small>
        </div>
    `;
}

function createPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginationContainer = document.getElementById("pagination-container");
  paginationContainer.innerHTML = "";

  if (totalPages <= 1) return;

  const pagination = document.createElement("nav");
  pagination.setAttribute("aria-label", "Event pagination");

  let paginationHTML = `
        <ul class="pagination justify-content-center">
            <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
                <a class="page-link text-primary" href="#" data-page="1" title="First page">
                    <i class="fas fa-angle-double-left"></i>
                </a>
            </li>
            <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
                <a class="page-link text-primary" href="#" data-page="${
                  currentPage - 1
                }" title="Previous page">
                    <i class="fas fa-angle-left"></i>
                </a>
            </li>
    `;

  // Generate page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
        <li class="page-item ${currentPage === i ? "active" : ""}">
            <a class="page-link ${
              currentPage === i ? "text-white bg-primary" : "text-primary"
            }" href="#" data-page="${i}">${i}</a>
        </li>
    `;
  }

  paginationHTML += `
            <li class="page-item ${
              currentPage === totalPages ? "disabled" : ""
            }">
                <a class="page-link text-primary" href="#" data-page="${
                  currentPage + 1
                }" title="Next page">
                    <i class="fas fa-angle-right"></i>
                </a>
            </li>
            <li class="page-item ${
              currentPage === totalPages ? "disabled" : ""
            }">
                <a class="page-link text-primary" href="#" data-page="${totalPages}" title="Last page">
                    <i class="fas fa-angle-double-right"></i>
                </a>
            </li>
        </ul>
    `;

  pagination.innerHTML = paginationHTML;
  paginationContainer.appendChild(pagination);

  // Add click handlers
  pagination.querySelectorAll(".page-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const newPage = parseInt(e.target.closest(".page-link").dataset.page);
      if (
        !isNaN(newPage) &&
        newPage !== currentPage &&
        newPage > 0 &&
        newPage <= totalPages
      ) {
        currentPage = newPage;
        filterEvents();
        // Scroll to top of container
        document
          .getElementById("total-events-container")
          .scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

// Update the filterEvents function
function filterEvents() {
  const searchInput = document
    .getElementById("searchInput")
    .value.toLowerCase();
  const monthFilter = document.getElementById("monthFilter").value;
  const areaFilter = document.getElementById("areaFilter").value;
  const cardContainer = document.getElementById("card-container");

  // Clear container
  cardContainer.innerHTML = "";

  // Filter events
  const filteredEvents = allEvents.filter((event) => {
    const matchesSearch =
      event.namaAcara.toLowerCase().includes(searchInput) ||
      event.lokasi.toLowerCase().includes(searchInput) ||
      event.area.toLowerCase().includes(searchInput);

    const matchesMonth = monthFilter === "" || event.month === monthFilter;
    const matchesArea = areaFilter === "" || event.area === areaFilter;

    return matchesSearch && matchesMonth && matchesArea;
  });

  // Show no results message if needed
  if (filteredEvents.length === 0) {
    cardContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center" role="alert">
                    Tidak ada event yang ditemukan
                </div>
            </div>
        `;
    updateTotalEvents(0);
    createPagination(0);
    return;
  }

  // Paginate results
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredEvents.length);
  const eventsToShow = filteredEvents.slice(startIndex, endIndex);

  // Create and append cards
  eventsToShow.forEach((event) => {
    cardContainer.appendChild(createEventCard(event));
  });

  // Update total events and pagination
  updateTotalEvents(filteredEvents.length);
  createPagination(filteredEvents.length);
}
// Initialize
fetchGoogleSheetData();
