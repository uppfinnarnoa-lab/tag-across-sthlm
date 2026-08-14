// Enda källan för kortleken. Poängen följer regelboken (Poäng = 10 + 2s, där s
// är fågelvägen i km från fontänen vid Stockholms Central).
//
// Koordinaterna kommer från en geokodning mot Nominatim. De med tre decimaler
// är handsatta uppskattningar som aldrig hittades automatiskt -- de går att
// rätta i domarpanelens kartredigerare utan att röra den här filen.

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
  { name: 'Natti-natti 2023, sträcka 1, kontroll 2', value: 25, lat: 59.330, lng: 18.060 },
  { name: 'Gubbängens IP', value: 25, lat: 59.2615049, lng: 18.069216 },
  { name: 'Rissneängarna Plaskdamm', value: 26, lat: 59.378, lng: 17.939 },
  { name: 'Nälsta Parkourpark', value: 31, lat: 59.3688921, lng: 17.8857485 }
];

// value = multiplikatorn. Poängen avrundas efter multiplicering till närmaste
// heltal, enligt regelboken.
const challenges = [
  { name: 'Mr Whippy', value: 1.5, description: 'Köp vilken sorts mjukglass som helst och ät den.' },
  { name: 'Bosse in one', value: 2, description: 'Kasta Bosse i en discgolfkorg.' },
  { name: 'When in Mjölby', value: 1.5, description: 'Hitta en potatis och be på knä åt den.' },
  { name: 'Kurragömma!', value: 1.8, description: 'Ni har max 5 minuter på er att gömma er, och ska sen sitta på samma plats i 10 minuter.' },
  { name: 'Ta en geocache', value: 1.5, description: 'Ta en geocache.' },
  { name: 'Naturligt habitat', value: 1.3, description: 'Få Bosse att flyta på vatten.' },
  { name: 'Kasta Bosse', value: 1.3, description: 'Kasta Bosse mellan varandra i laget två gånger (fram och tillbaka) utan att tappa honom på marken, från cirka 10 meters avstånd.' },
  { name: 'Stock-Holm', value: 1.5, description: 'Hitta en pinne på en ö. (Södertörn räknas ej)' },
  { name: 'On top of the world!', value: 1.5, description: 'Befinn er minst 50 meter över havet.' },
  { name: 'Stravart', value: 1.5, description: 'En i laget ska använda Strava för att skriva ett fyrbokstavigt ord som en annan i laget sen ska gissa. Gissar den fel får man försöka igen. Aktiviteten ska vara publik.' },
  { name: 'Försening', value: 1.3, description: 'Hoppa på en försenad avgång.' },
  { name: 'Trädkramare', value: 1.3, description: 'Krama ett träd som är för stort för att någon ensam ska nå runt, men litet nog att ni klarar det tillsammans.' },
  { name: 'Un kilomètre à pied', value: 2, description: 'Blunda och snurra runt. Stanna och ta er till den plats som ligger exakt en kilometer i den riktningen. Går det inte att gå dit, gå till närmaste möjliga plats.' },
  { name: 'Hollywoodfågel', value: 1.8, description: 'Ha en fågel på bild i 4 minuter utan att den flyger ur bild.' },
  { name: 'Hemester', value: 1.3, description: 'Hitta och ta en bild på en icke-europeisk nationsflagga.' },
  { name: 'Safari', value: 2, description: 'Hitta och ta en bild på ett vilt, icke mänskligt, däggdjur.' },
  { name: 'Primtal', value: 1.8, description: 'Ta en avgång på en primtalsminut med en primtalsnumrerad linje.' },
  { name: 'Rädda världen!', value: 1.5, description: 'Hitta och panta en flaska eller burk.' },
  { name: 'Rerun', value: 1.3, description: 'Ta er till en plats som någon gång varit en kontroll på en orienteringsbana och gör ett SI-ljud.' },
  { name: 'Cursed! Tyst', value: 1.5, description: 'Laget får inte använda talat eller skrivet språk för att kommunicera. Gäller i 20 minuter.' },
  { name: 'Cursed! Inga appar', value: 2, description: 'Ni får inte längre använda SL-appen eller Google Maps för att hitta tider eller resor. Gäller i 30 minuter.' },
  { name: 'Cursed! Jämna minuter', value: 1.5, description: 'De kommande 30 minuterna kan laget endast ta avgångar på jämna minuter.' }
];

module.exports = { destinations, challenges };
