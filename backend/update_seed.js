const fs = require('fs');

const coords = JSON.parse(fs.readFileSync('coords.json'));
let seedContent = fs.readFileSync('seed.js', 'utf8');

// Match every destination line and update lat/lng if found
const lines = seedContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('{ name:')) {
    const match = line.match(/name:\s*'([^']+)'/);
    if (match) {
      const name = match[1];
      // special cases matching what the script searched for
      const searchName = name.replace(' på Stockholms Central', '')
                             .replace(' på Långholmen', '')
                             .replace(' runsten', '')
                             .replace(' observatorium', '')
                             .replace('UMA-klistermärke på gångbron vid ', '')
                             .replace('Kronärtskocka ', '')
                             .replace('Legobutiken MOS', 'Mall of Scandinavia')
                             .replace('Ålstensskogens Mälarvy', 'Ålstensskogen')
                             .replace('Toppen av pyramiden i ', '');
                             
      const found = coords.find(c => c.name === searchName || c.name === name);
      if (found) {
        // replace lat: ..., lng: ... with the actual ones
        lines[i] = line.replace(/lat:\s*[\d.]+,\s*lng:\s*[\d.]+/, `lat: ${found.lat}, lng: ${found.lng}`);
      }
    }
  }
}

fs.writeFileSync('seed.js', lines.join('\n'));
console.log("Updated seed.js");
