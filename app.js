/* ============================================================
   app.js — CUNYHousing JavaScript
   Handles all the logic for searching, filtering, and
   displaying housing results on the page.
   ============================================================ */

/* ============================================================
   HOUSING DATA — Fetched from NYC Open Data API (NYCHA)
   API Endpoint: data.cityofnewyork.us/resource/phvi-damg.json
   Each object = one NYCHA development with location and unit count
   ============================================================ */
let allData = [];  // Will be populated by fetchData() function

/* Fetch NYCHA data from Vercel serverless function
   The function handles fetching from NYC Open Data API server-side,
   bypassing CORS restrictions */
async function fetchData() {
  try {
    // Call the Vercel serverless function
    const response = await fetch('/api/housing');
    const result = await response.json();
    
    if (result.success && result.data) {
      allData = result.data;
      console.log('Loaded ' + allData.length + ' NYCHA developments from NYC Open Data API');
    } else {
      throw new Error(result.error || 'Failed to load data');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    // If data fails to load, show a message to the user
    document.getElementById('results-area').innerHTML = 
      '<div class="state-msg"><h3>Data temporarily unavailable</h3><p>Unable to load housing data from NYC Open Data. Please try again later.</p></div>';
  }
}

/* Load data when the page starts */
fetchData();

/* State variables */
let visibleCount = 12;   // How many cards to show at once
let currentResults = []; // Filtered results from last search


/* ============================================================
   NAVIGATION
   ============================================================ */

/* toggleMenu — opens/closes the mobile hamburger nav */
function toggleMenu() {
  document.getElementById('hamburger').classList.toggle('open');
  document.getElementById('nav-mobile').classList.toggle('open');
}

/* showPage — switches between Home, Resources, and About */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  ['home', 'resources', 'about'].forEach(p => {
    document.getElementById('nav-' + p + '-d').classList.remove('active');
    document.getElementById('nav-' + p + '-m').classList.remove('active');
  });
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById('nav-' + page + '-d').classList.add('active');
  document.getElementById('nav-' + page + '-m').classList.add('active');
  window.scrollTo(0, 0);
}


/* ============================================================
   FILTER INTERACTIONS
   Prevent campus and borough from both being selected at once
   ============================================================ */

/* When campus is chosen, clear the borough dropdown */
function onCampusChange() {
  if (document.getElementById('campus-select').value) {
    document.getElementById('borough-select').value = '';
  }
}

/* When borough is chosen, clear the campus dropdown */
function onBoroughChange() {
  if (document.getElementById('borough-select').value) {
    document.getElementById('campus-select').value = '';
  }
}


/* ============================================================
   SEARCH
   Reads filters, filters the data, updates the stats and results
   ============================================================ */
function search() {
  const campusEl = document.getElementById('campus-select');
  const campusBorough = campusEl.value.toUpperCase();

  // Use campus borough if selected, otherwise use borough dropdown
  const borough = campusBorough || document.getElementById('borough-select').value.toUpperCase();
  const price = document.getElementById('price-select').value;

  // Start with all data then filter down
  let results = [...allData];

  // Filter by borough
  if (borough) results = results.filter(d => d.borough === borough);

  // Filter by price range
  if (price) {
    results = results.filter(d => {
      if (price === '0-800')     return d.rent < 800;
      if (price === '800-1200')  return d.rent >= 800  && d.rent < 1200;
      if (price === '1200-1800') return d.rent >= 1200 && d.rent < 1800;
      if (price === '1800-2500') return d.rent >= 1800 && d.rent < 2500;
      if (price === '2500+')     return d.rent >= 2500;
      return true;
    });
  }

  currentResults = results;
  visibleCount = 12;

  // Calculate total units across all filtered results
  const totalUnits = results.reduce((sum, d) => sum + d.units, 0);

  // Label for the "Area searched" stat
  const areaLabel = campusBorough
    ? campusBorough.charAt(0) + campusBorough.slice(1).toLowerCase()
    : borough
    ? borough.charAt(0) + borough.slice(1).toLowerCase()
    : 'All NYC';

  // Show stats and update numbers
  document.getElementById('stats-row').style.display = 'grid';
  document.getElementById('stat-count').textContent = results.length.toLocaleString();
  document.getElementById('stat-units').textContent = totalUnits.toLocaleString();
  document.getElementById('stat-area').textContent = areaLabel;

  renderResults();
}


/* ============================================================
   RENDER RESULTS
   Builds and injects the listing card HTML into the page
   ============================================================ */
function renderResults() {
  const area = document.getElementById('results-area');

  // Show empty state if no results
  if (!currentResults.length) {
    area.innerHTML = '<div class="state-msg"><h3>No results found</h3><p>Try a different campus, borough, or price range.</p></div>';
    return;
  }

  const campusEl = document.getElementById('campus-select');
  const hasCampus = campusEl.value !== '';
  const campusName = hasCampus ? campusEl.options[campusEl.selectedIndex].text : '';

  // Only render up to visibleCount cards
  const show = currentResults.slice(0, visibleCount);

  // Build HTML for each card
  const cards = show.map(d => `
    <div class="listing-card">
      <div class="listing-top">
        <div class="listing-name">${d.name}</div>
        <span class="units-badge">${d.units.toLocaleString()} units</span>
      </div>
      <div class="listing-addr">${d.address}</div>
      <div class="listing-tags">
        <span class="tag tag-nycha">NYCHA Affordable</span>
        <span class="tag tag-borough">${d.borough.charAt(0) + d.borough.slice(1).toLowerCase()}</span>
        <span class="tag tag-borough">Est. from $${d.rent}/mo</span>
        ${hasCampus ? `<span class="tag tag-campus">Near ${campusName}</span>` : ''}
      </div>
      <div class="availability-note">Contact development or check NYC Housing Connect for open units</div>
      <a href="https://housingconnect.nyc.gov" target="_blank" class="connect-btn">
        Check available units on NYC Housing Connect
      </a>
    </div>`).join('');

  // Show "Show more" button if more results exist
  const showMore = currentResults.length > visibleCount
    ? `<button class="show-more-btn" onclick="showMore()">Show more (${currentResults.length - visibleCount} remaining)</button>`
    : '';

  // Different banner for campus vs borough search
  const banner = hasCampus
    ? `<div class="campus-banner">Showing NYCHA developments in the same borough as <strong>${campusName}</strong>.</div>`
    : `<div class="info-banner">These are NYCHA developments in your area. Click any listing to check for open applications.</div>`;

  area.innerHTML = `
    ${banner}
    <div class="results-header">
      <h2>${currentResults.length} developments found</h2>
      <span>Showing ${Math.min(visibleCount, currentResults.length)} of ${currentResults.length}</span>
    </div>
    <div class="listings-grid">${cards}</div>
    ${showMore}`;
}


/* ============================================================
   SHOW MORE
   Loads 12 more cards when button is clicked
   ============================================================ */
function showMore() {
  visibleCount += 12;
  renderResults();
}
