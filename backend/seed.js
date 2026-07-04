const db = require('./database');

// Använder placeholder-koordinater runt Stockholm C (59.330, 18.060) som kan bytas ut senare.
const destinations = [
  { name: 'Spår 19 på Stockholms Central', value: 10, lat: 59.330, lng: 18.060 },
  { name: 'Mårten Trotzigs gränd', value: 12, lat: 59.3228785, lng: 18.0726825 },
  { name: 'Amfiteatern på Långholmen', value: 13, lat: 59.321, lng: 18.031 },
  { name: 'Norra Real', value: 13, lat: 59.3441397, lng: 18.0612486 },
  { name: 'Fatbursparken', value: 14, lat: 59.3145525, lng: 18.0683193 },
  { name: 'Karlbergs slottspark runsten', value: 15, lat: 59.340, lng: 18.020 },
  { name: 'Lilla mamsens bageri', value: 16, lat: 59.3248932, lng: 18.0059372 },
  { name: 'Hammarby sjöstad observatorium', value: 17, lat: 59.303, lng: 18.094 },
  { name: 'UMA-klistermärke på gångbron vid Lilla djurgårdsakademin', value: 17, lat: 59.325, lng: 18.115 },
  { name: 'Pizzeria Karavan', value: 18, lat: 59.2966935, lng: 18.0403364 },
  { name: 'Kaknästornet', value: 18, lat: 59.3347343, lng: 18.1267616 },
  { name: 'Arenatorget', value: 19, lat: 59.2929254, lng: 18.0824552 },
  { name: 'Kungseken Djurgården', value: 19, lat: 59.3233301, lng: 18.1347093 },
  { name: 'Edvard Andersons växthus', value: 19, lat: 59.3689541, lng: 18.0464904 },
  { name: 'Kronärtskocka Stora Coop Västberga', value: 20, lat: 59.2937143, lng: 18.0046482 },
  { name: 'Hoppbacken Enskede', value: 21, lat: 59.284, lng: 18.053 },
  { name: 'Legobutiken MOS', value: 21, lat: 59.3704371, lng: 18.0030108 },
  { name: 'Lekplatsen småkryp', value: 21, lat: 59.330, lng: 18.060 },
  { name: 'Järlas klubbstuga', value: 22, lat: 59.305, lng: 18.156 },
  { name: 'Lidingö Värmeverk', value: 22, lat: 59.360, lng: 18.120 },
  { name: 'Nacka Utsiktsplats', value: 22, lat: 59.310, lng: 18.160 },
  { name: 'Ålstensskogens Mälarvy', value: 22, lat: 59.3169261, lng: 17.9543568 },
  { name: 'Systembolaget Lidingö', value: 22, lat: 59.3664783, lng: 18.1342629 },
  { name: 'Ankomsthallen Bromma', value: 24, lat: 59.354, lng: 17.942 },
  { name: 'Coolt C-hus i Pungpinan', value: 24, lat: 59.267, lng: 18.106 },
  { name: 'Toppen av pyramiden i Johannisdalsparken', value: 24, lat: 59.2964304, lng: 17.9579339 },
  { name: 'Natti-natti 2023, sträcka 1, kontroll 2.', value: 25, lat: 59.330, lng: 18.060 },
  { name: 'Gubbängens IP', value: 25, lat: 59.2615049, lng: 18.069216 },
  { name: 'Rissneängarna Plaskdamm', value: 26, lat: 59.378, lng: 17.939 },
  { name: 'Nälsta Parkourpark', value: 31, lat: 59.3688921, lng: 17.8857485 }
];

const challenges = [
  { name: 'Mr Whippy', value: 1.5 },
  { name: 'Bosse in one', value: 2 },
  { name: 'When in Mjölby', value: 1.5 },
  { name: 'Kurragömma!', value: 1.8 },
  { name: 'Ta en geocache', value: 1.5 },
  { name: 'Naturligt habitat', value: 1.3 },
  { name: 'Kasta Bosse', value: 1.3 },
  { name: 'Stock-Holm', value: 1.5 },
  { name: 'On top of the world!', value: 1.5 },
  { name: 'Stravart', value: 1.5 },
  { name: 'Försening', value: 1.3 },
  { name: 'Trädkramare', value: 1.3 },
  { name: 'Un kilomètre à pied', value: 2 },
  { name: 'Hollywoodfågel', value: 1.8 },
  { name: 'Hemester', value: 1.3 },
  { name: 'Safari', value: 2 },
  { name: 'Primtal', value: 1.8 },
  { name: 'Rädda världen!', value: 1.5 },
  { name: 'Rerun', value: 1.3 },
  { name: 'Cursed! Tyst', value: 1.5 },
  { name: 'Cursed! Inga appar', value: 2 },
  { name: 'Cursed! Jämna minuter', value: 1.5 }
];

db.serialize(() => {
  db.get("SELECT count(*) as count FROM cards", (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare("INSERT INTO cards (type, name, value, lat, lng) VALUES (?, ?, ?, ?, ?)");
      
      destinations.forEach(d => stmt.run('destination', d.name, d.value, d.lat, d.lng));
      challenges.forEach(c => stmt.run('challenge', c.name, c.value, null, null));
      
      stmt.finalize();
      console.log("Seeded cards table with coordinates.");
    } else {
      console.log("Cards table already seeded.");
    }
  });
});
