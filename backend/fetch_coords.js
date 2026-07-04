const fs = require('fs');
const https = require('https');

const destinations = [
  'Spår 19 på Stockholms Central', 'Mårten Trotzigs gränd', 'Amfiteatern på Långholmen',
  'Norra Real', 'Fatbursparken', 'Karlbergs slottspark runsten', 'Lilla mamsens bageri',
  'Hammarby sjöstad observatorium', 'Lilla djurgårdsakademin', 'Pizzeria Karavan',
  'Kaknästornet', 'Arenatorget', 'Kungseken Djurgården', 'Edvard Andersons växthus',
  'Stora Coop Västberga', 'Hoppbacken Enskede', 'Mall of Scandinavia',
  'Lekplatsen småkryp', 'Järlas klubbstuga', 'Lidingö Värmeverk', 'Nacka Utsiktsplats',
  'Ålstensskogen', 'Systembolaget Lidingö', 'Ankomsthallen Bromma', 'Coolt C-hus i Pungpinan',
  'Johannisdalsparken', 'Gubbängens IP', 'Rissneängarna Plaskdamm', 'Nälsta Parkourpark'
];

async function geocode(query) {
  return new Promise((resolve) => {
    // Add "Stockholm" to help Nominatim
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Stockholm')}&format=json&limit=1`;
    https.get(url, { headers: { 'User-Agent': 'TagAcrossSthlm/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.length > 0) resolve({ lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) });
          else resolve(null);
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  console.log("Searching coordinates for 30 locations via OpenStreetMap...");
  let results = [];
  for (const dest of destinations) {
    // delay to avoid rate limit (1 req/s)
    await new Promise(r => setTimeout(r, 1500));
    const coords = await geocode(dest);
    if (coords) {
      console.log(`FOUND: ${dest} -> ${coords.lat}, ${coords.lng}`);
      results.push({ name: dest, lat: coords.lat, lng: coords.lng });
    } else {
      console.log(`NOT FOUND: ${dest}`);
    }
  }
  
  fs.writeFileSync('coords.json', JSON.stringify(results, null, 2));
  console.log("Done.");
}

run();
