export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(
      'https://data.cityofnewyork.us/api/views/phvi-damg/rows.json'
    );

    if (!response.ok) {
      throw new Error(`NYC Open Data API error: ${response.status}`);
    }

    const json = await response.json();

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

    return res.status(200).json({
      success: true,
      count: allData.length,
      data: allData
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function estimateRent(units) {
  if (units >= 500) return 750;
  if (units >= 200) return 950;
  return 1200;
}