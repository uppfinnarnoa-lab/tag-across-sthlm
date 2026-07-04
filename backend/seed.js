const db = require('./database');

const destinations = [
  { name: 'Spår 19 på Stockholms Central', value: 10 },
  { name: 'Mårten Trotzigs gränd', value: 12 },
  { name: 'Amfiteatern på Långholmen', value: 13 },
  { name: 'Norra Real', value: 13 },
  { name: 'Fatbursparken', value: 14 },
  { name: 'Karlbergs slottspark runsten', value: 15 },
  { name: 'Lilla mamsens bageri', value: 16 },
  { name: 'Hammarby sjöstad observatorium', value: 17 },
  { name: 'UMA-klistermärke på gångbron vid Lilla djurgårdsakademin', value: 17 },
  { name: 'Pizzeria Karavan', value: 18 },
  { name: 'Kaknästornet', value: 18 },
  { name: 'Arenatorget', value: 19 },
  { name: 'Kungseken Djurgården', value: 19 },
  { name: 'Edvard Andersons växthus', value: 19 },
  { name: 'Kronärtskocka Stora Coop Västberga', value: 20 },
  { name: 'Hoppbacken Enskede', value: 21 },
  { name: 'Legobutiken MOS', value: 21 },
  { name: 'Lekplatsen småkryp', value: 21 },
  { name: 'Järlas klubbstuga', value: 22 },
  { name: 'Lidingö Värmeverk', value: 22 },
  { name: 'Nacka Utsiktsplats', value: 22 },
  { name: 'Ålstensskogens Mälarvy', value: 22 },
  { name: 'Systembolaget Lidingö', value: 22 },
  { name: 'Ankomsthallen Bromma', value: 24 },
  { name: 'Coolt C-hus i Pungpinan', value: 24 },
  { name: 'Toppen av pyramiden i Johannisdalsparken', value: 24 },
  { name: 'Natti-natti 2023, sträcka 1, kontroll 2.', value: 25 },
  { name: 'Gubbängens IP', value: 25 },
  { name: 'Rissneängarna Plaskdamm', value: 26 },
  { name: 'Nälsta Parkourpark', value: 31 }
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
      const stmt = db.prepare("INSERT INTO cards (type, name, value) VALUES (?, ?, ?)");
      
      destinations.forEach(d => stmt.run('destination', d.name, d.value));
      challenges.forEach(c => stmt.run('challenge', c.name, c.value));
      
      stmt.finalize();
      console.log("Seeded cards table.");
    } else {
      console.log("Cards table already seeded.");
    }
  });
});
