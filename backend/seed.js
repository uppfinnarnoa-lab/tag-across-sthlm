const db = require('./database');

// Använder placeholder-koordinater runt Stockholm C (59.330, 18.060) som kan bytas ut senare.
const destinations = [
  { name: 'Spår 19 på Stockholms Central', value: 10, lat: 59.330, lng: 18.060 },
  { name: 'Mårten Trotzigs gränd', value: 12, lat: 59.322, lng: 18.073 },
  { name: 'Amfiteatern på Långholmen', value: 13, lat: 59.321, lng: 18.031 },
  { name: 'Norra Real', value: 13, lat: 59.342, lng: 18.062 },
  { name: 'Fatbursparken', value: 14, lat: 59.314, lng: 18.068 },
  { name: 'Karlbergs slottspark runsten', value: 15, lat: 59.340, lng: 18.020 },
  { name: 'Lilla mamsens bageri', value: 16, lat: 59.330, lng: 18.060 },
  { name: 'Hammarby sjöstad observatorium', value: 17, lat: 59.303, lng: 18.094 },
  { name: 'UMA-klistermärke på gångbron vid Lilla djurgårdsakademin', value: 17, lat: 59.325, lng: 18.115 },
  { name: 'Pizzeria Karavan', value: 18, lat: 59.330, lng: 18.060 },
  { name: 'Kaknästornet', value: 18, lat: 59.335, lng: 18.126 },
  { name: 'Arenatorget', value: 19, lat: 59.294, lng: 18.083 },
  { name: 'Kungseken Djurgården', value: 19, lat: 59.330, lng: 18.060 },
  { name: 'Edvard Andersons växthus', value: 19, lat: 59.368, lng: 18.049 },
  { name: 'Kronärtskocka Stora Coop Västberga', value: 20, lat: 59.297, lng: 18.006 },
  { name: 'Hoppbacken Enskede', value: 21, lat: 59.284, lng: 18.053 },
  { name: 'Legobutiken MOS', value: 21, lat: 59.370, lng: 18.003 },
  { name: 'Lekplatsen småkryp', value: 21, lat: 59.330, lng: 18.060 },
  { name: 'Järlas klubbstuga', value: 22, lat: 59.305, lng: 18.156 },
  { name: 'Lidingö Värmeverk', value: 22, lat: 59.360, lng: 18.120 },
  { name: 'Nacka Utsiktsplats', value: 22, lat: 59.310, lng: 18.160 },
  { name: 'Ålstensskogens Mälarvy', value: 22, lat: 59.320, lng: 17.960 },
  { name: 'Systembolaget Lidingö', value: 22, lat: 59.365, lng: 18.134 },
  { name: 'Ankomsthallen Bromma', value: 24, lat: 59.354, lng: 17.942 },
  { name: 'Coolt C-hus i Pungpinan', value: 24, lat: 59.267, lng: 18.106 },
  { name: 'Toppen av pyramiden i Johannisdalsparken', value: 24, lat: 59.330, lng: 18.060 },
  { name: 'Natti-natti 2023, sträcka 1, kontroll 2.', value: 25, lat: 59.330, lng: 18.060 },
  { name: 'Gubbängens IP', value: 25, lat: 59.260, lng: 18.083 },
  { name: 'Rissneängarna Plaskdamm', value: 26, lat: 59.378, lng: 17.939 },
  { name: 'Nälsta Parkourpark', value: 31, lat: 59.375, lng: 17.873 }
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
