/* ============================================================
   Vercel Serverless Function
   Fetches NYCHA data from NYC Open Data API
   Called from the client-side JavaScript
   
   Usage: fetch('/api/housing').then(r => r.json())
   ============================================================ */

export default async function handler(req, res) {
  // Enable CORS so your frontend can call this function
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Fetch data from NYC Open Data API
    const response = await fetch(
      'https://data.cityofnewyork.us/api/views/phvi-damg/rows.json?accessType=DOWNLOAD'
    );

    if (!response.ok) {
      throw new Error(`NYC Open Data API returned ${response.status}`);
    }

    const json = await response.json();

    // Parse and transform the data
    const allData = json.data
      .map(item => ({
        name: item[1] || 'Unknown Development',
        address: item[2] || 'Address not available',
        borough: (item[3] || '').toUpperCase(),
        zip: item[4] || '00000',
        units: parseInt(item[5]) || 0,
        rent: estimateRent(parseInt(item[5]) || 0)
      }))
      .filter(d => d.borough && d.units > 0);

    // Return the data to the client
    res.status(200).json({
      success: true,
      count: allData.length,
      data: allData
    });

  } catch (error) {
    console.error('Error fetching NYCHA data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/* Estimate monthly rent based on development size */
function estimateRent(units) {
  if (units >= 500) return 750;   // Large developments
  if (units >= 200) return 950;   // Medium developments
  return 1200;                    // Smaller developments
}
