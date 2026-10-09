import type { Confederation } from '../types';

/**
 * Every playable country. One line per country:
 *   FIFA|ISO2|English|Français|confederation|strength|lower league|top league|naming style|towns…
 * Towns drive the generated club names (all club names are invented).
 * France, Senegal, Spain, England and Brazil keep their hand-written clubs (no towns).
 */
const RAW = `
FRA|FR|France|France|UEFA|86|||fr|
ESP|ES|Spain|Espagne|UEFA|86|||es|
ENG|GB|England|Angleterre|UEFA|85|||en|
BRA|BR|Brazil|Brésil|CONMEBOL|85|||pt|
SEN|SN|Senegal|Sénégal|CAF|79|||faf|
POR|PT|Portugal|Portugal|UEFA|84|Liga 3|Liga Portugal|pt|Braga,Guimarães,Porto,Lisboa,Coimbra,Faro,Setúbal,Aveiro,Viseu,Leiria,Évora,Funchal,Portimão,Chaves,Barcelos,Santarém
GER|DE|Germany|Allemagne|UEFA|83|3. Liga|Bundesliga|de|Kiel,Rostock,Dresden,Leipzig,Münster,Osnabrück,Freiburg,Mainz,Kassel,Ulm,Aachen,Bielefeld,Magdeburg,Würzburg,Regensburg,Lübeck
NED|NL|Netherlands|Pays-Bas|UEFA|82|Eerste Divisie|Eredivisie|nl|Groningen,Eindhoven,Utrecht,Zwolle,Almere,Breda,Tilburg,Maastricht,Venlo,Emmen,Den Bosch,Dordrecht,Deventer,Leiden,Roda,Alkmaar
ITA|IT|Italy|Italie|UEFA|83|Serie C|Serie A|it|Bari,Padova,Perugia,Brescia,Cosenza,Cesena,Pisa,Ascoli,Salerno,Trieste,Catania,Reggio,Pescara,Lecce,Verona,Modena
BEL|BE|Belgium|Belgique|UEFA|81|Challenger Pro League|Pro League|fr|Bruges,Liège,Anvers,Gand,Charleroi,Louvain,Malines,Ostende,Namur,Mons,Courtrai,Genk,Hasselt,Tournai,Seraing,Lokeren
CRO|HR|Croatia|Croatie|UEFA|80|Druga HNL|HNL|balkan|Rijeka,Split,Osijek,Zadar,Pula,Varaždin,Sisak,Šibenik,Dubrovnik,Karlovac,Slavonski Brod,Vukovar,Gorica,Zaprešić
DEN|DK|Denmark|Danemark|UEFA|77|1. Division|Superliga|nordic|Aarhus,Odense,Aalborg,Esbjerg,Randers,Silkeborg,Vejle,Horsens,Viborg,Hobro,Fredericia,Kolding,Roskilde,Næstved
SUI|CH|Switzerland|Suisse|UEFA|77|Challenge League|Super League|de|Bâle,Lausanne,Lugano,Saint-Gall,Lucerne,Sion,Thoune,Winterthour,Aarau,Schaffhouse,Neuchâtel,Bellinzone,Wil,Servette
SRB|RS|Serbia|Serbie|UEFA|74|Prva Liga|SuperLiga|balkan|Novi Sad,Niš,Subotica,Kragujevac,Čačak,Zrenjanin,Vranje,Valjevo,Kruševac,Šabac,Leskovac,Pančevo,Loznica,Smederevo
POL|PL|Poland|Pologne|UEFA|73|I liga|Ekstraklasa|slav|Gdańsk,Kraków,Poznań,Wrocław,Łódź,Katowice,Lublin,Szczecin,Białystok,Rzeszów,Gliwice,Kielce,Zabrze,Toruń
UKR|UA|Ukraine|Ukraine|UEFA|74|Persha Liha|Premier League|ee|Kharkiv,Lviv,Odesa,Dnipro,Poltava,Zaporizhzhia,Uzhhorod,Chernihiv,Vinnytsia,Lutsk,Sumy,Mykolaiv,Rivne,Kherson
AUT|AT|Austria|Autriche|UEFA|75|2. Liga|Bundesliga|de|Graz,Linz,Salzburg,Innsbruck,Klagenfurt,Wolfsberg,Ried,Altach,Lustenau,Hartberg,Wels,Steyr,Dornbirn,Kapfenberg
SWE|SE|Sweden|Suède|UEFA|74|Superettan|Allsvenskan|nordic|Göteborg,Malmö,Norrköping,Örebro,Helsingborg,Sundsvall,Gävle,Östersund,Halmstad,Falkenberg,Uppsala,Västerås,Jönköping,Kalmar
TUR|TR|Turkey|Turquie|UEFA|75|TFF 2. Lig|Süper Lig|tr|Bursa,Konya,Trabzon,Kayseri,Samsun,Antalya,Eskişehir,Denizli,Rize,Gaziantep,Malatya,Adana,Izmir,Sivas
SCO|GB|Scotland|Écosse|UEFA|72|League One|Premiership|en|Dundee,Aberdeen,Inverness,Falkirk,Paisley,Kilmarnock,Motherwell,Livingston,Ayr,Perth,Dunfermline,Greenock,Stirling,Arbroath
WAL|GB|Wales|Pays de Galles|UEFA|70|Cymru South|Cymru Premier|en|Swansea,Cardiff,Newport,Bangor,Aberystwyth,Barry,Llanelli,Merthyr,Rhyl,Wrexham,Connah's Quay,Bala,Penybont,Caernarfon
NIR|GB|Northern Ireland|Irlande du Nord|UEFA|62|NIFL Championship|NIFL Premiership|en|Belfast,Derry,Lisburn,Coleraine,Portadown,Larne,Ballymena,Newry,Dungannon,Carrick,Glenavon,Armagh
NOR|NO|Norway|Norvège|UEFA|71|OBOS-ligaen|Eliteserien|nordic|Bergen,Trondheim,Stavanger,Tromsø,Bodø,Kristiansund,Molde,Sandnes,Haugesund,Fredrikstad,Sarpsborg,Lillestrøm,Ålesund,Brann
CZE|CZ|Czech Republic|Tchéquie|UEFA|71|FNL|First League|slav|Brno,Plzeň,Ostrava,Liberec,Olomouc,Zlín,Jablonec,Hradec Králové,Pardubice,Mladá Boleslav,Teplice,Karviná,Budějovice,Dukla
HUN|HU|Hungary|Hongrie|UEFA|70|NB II|NB I|ee|Debrecen,Győr,Szeged,Pécs,Miskolc,Székesfehérvár,Kecskemét,Paks,Nyíregyháza,Zalaegerszeg,Szombathely,Békéscsaba,Mezőkövesd,Veszprém
GRE|GR|Greece|Grèce|UEFA|70|Super League 2|Super League|gr|Thessaloniki,Patras,Volos,Larissa,Heraklion,Ioannina,Tripoli,Kavala,Lamia,Chania,Serres,Rhodes,Trikala,Corfu
ROU|RO|Romania|Roumanie|UEFA|69|Liga II|Liga I|ee|Cluj,Craiova,Timișoara,Iași,Sibiu,Constanța,Brașov,Târgu Mureș,Oradea,Pitești,Galați,Botoșani,Ploiești,Arad
RUS|RU|Russia|Russie|UEFA|71|FNL|Premier Liga|ru|Kazan,Samara,Rostov,Krasnodar,Sochi,Yekaterinburg,Perm,Nizhny Novgorod,Voronezh,Ufa,Saratov,Grozny,Tula,Tambov
SVK|SK|Slovakia|Slovaquie|UEFA|68|2. liga|Fortuna Liga|slav|Žilina,Trnava,Nitra,Košice,Trenčín,Zlaté Moravce,Ružomberok,Michalovce,Banská Bystrica,Dunajská Streda,Prešov,Skalica
SVN|SI|Slovenia|Slovénie|UEFA|66|2. SNL|PrvaLiga|balkan|Maribor,Celje,Koper,Domžale,Murska Sobota,Kranj,Velenje,Nova Gorica,Ptuj,Brežice,Ljubljana,Radomlje
IRL|IE|Ireland|Irlande|UEFA|67|First Division|Premier Division|en|Cork,Galway,Limerick,Waterford,Sligo,Drogheda,Dundalk,Athlone,Bray,Wexford,Kilkenny,Tralee,Derry,Longford
ISL|IS|Iceland|Islande|UEFA|64|1. deild|Besta deild|nordic|Reykjavík,Akureyri,Keflavík,Hafnarfjörður,Kópavogur,Akranes,Selfoss,Vestmannaeyjar,Grindavík,Ísafjörður,Húsavík,Egilsstaðir
FIN|FI|Finland|Finlande|UEFA|63|Ykkönen|Veikkausliiga|nordic|Helsinki,Tampere,Turku,Oulu,Kuopio,Lahti,Vaasa,Rovaniemi,Pori,Seinäjoki,Mariehamn,Jyväskylä
BIH|BA|Bosnia and Herzegovina|Bosnie-Herzégovine|UEFA|64|Prva liga|Premier Liga|balkan|Sarajevo,Zenica,Mostar,Tuzla,Banja Luka,Široki Brijeg,Velež,Doboj,Bihać,Travnik,Brčko,Zvornik
ALB|AL|Albania|Albanie|UEFA|64|Kategoria e Parë|Kategoria Superiore|balkan|Tirana,Durrës,Shkodër,Vlorë,Korçë,Elbasan,Kukës,Fier,Berat,Lushnjë,Laç,Gjirokastër
MNE|ME|Montenegro|Monténégro|UEFA|62|Druga CFL|Prva CFL|balkan|Podgorica,Nikšić,Budva,Bar,Kotor,Cetinje,Berane,Bijelo Polje,Ulcinj,Pljevlja,Herceg Novi,Tivat
MKD|MK|North Macedonia|Macédoine du Nord|UEFA|60|Vtora Liga|Prva Liga|balkan|Skopje,Bitola,Ohrid,Tetovo,Strumica,Prilep,Kumanovo,Gostivar,Struga,Veles,Štip,Kavadarci
GEO|GE|Georgia|Géorgie|UEFA|62|Erovnuli Liga 2|Erovnuli Liga|ru|Tbilisi,Batumi,Kutaisi,Rustavi,Gori,Zugdidi,Telavi,Poti,Sachkhere,Samtredia,Akhaltsikhe,Sagarejo
ARM|AM|Armenia|Arménie|UEFA|55|First League|Premier League|ru|Yerevan,Gyumri,Vanadzor,Ararat,Alashkert,Noah,Ijevan,Artashat,Masis,Sevan,Hrazdan,Goris
AZE|AZ|Azerbaijan|Azerbaïdjan|UEFA|55|First Division|Premier League|ru|Baku,Ganja,Sumqayit,Qabala,Shamakhi,Zagatala,Lankaran,Mingachevir,Shirvan,Sabirabad,Shaki,Nakhchivan
BLR|BY|Belarus|Biélorussie|UEFA|56|First League|Vysshaya Liga|ru|Minsk,Brest,Gomel,Grodno,Vitebsk,Mogilev,Mozyr,Soligorsk,Baranovichi,Orsha,Pinsk,Slutsk
BUL|BG|Bulgaria|Bulgarie|UEFA|62|Vtora Liga|First League|slav|Plovdiv,Varna,Burgas,Stara Zagora,Ruse,Pleven,Blagoevgrad,Sliven,Montana,Lovech,Dobrich,Shumen
CYP|CY|Cyprus|Chypre|UEFA|55|Second Division|First Division|gr|Nicosia,Limassol,Larnaca,Paphos,Famagusta,Ayia Napa,Kyrenia,Polis,Strovolos,Aradippou,Ermis,Omonia
EST|EE|Estonia|Estonie|UEFA|50|Esiliiga|Meistriliiga|nordic|Tallinn,Tartu,Narva,Pärnu,Kuressaare,Viljandi,Rakvere,Haapsalu,Maardu,Võru,Valga,Kohtla-Järve
FRO|FO|Faroe Islands|Îles Féroé|UEFA|48|1. deild|Betri deildin|nordic|Tórshavn,Klaksvík,Runavík,Vágur,Tvøroyri,Fuglafjørður,Sandavágur,Eiði,Hoyvík,Skála
ISR|IL|Israel|Israël|UEFA|63|Liga Leumit|Premier League|asia|Haifa,Be'er Sheva,Ashdod,Netanya,Tiberias,Ashkelon,Kiryat Shmona,Hadera,Petah Tikva,Rishon,Eilat,Nazareth
KAZ|KZ|Kazakhstan|Kazakhstan|UEFA|56|First League|Premier League|ru|Astana,Almaty,Shymkent,Aktobe,Karaganda,Taraz,Atyrau,Kostanay,Pavlodar,Oral,Kyzylorda,Turkistan
KOS|XK|Kosovo|Kosovo|UEFA|58|Liga e Parë|Superliga|balkan|Pristina,Prizren,Peja,Gjakova,Ferizaj,Mitrovica,Gjilan,Podujevo,Drenas,Vushtrri,Malishevë,Lipjan
LVA|LV|Latvia|Lettonie|UEFA|50|1. līga|Virslīga|nordic|Riga,Daugavpils,Liepāja,Jelgava,Ventspils,Valmiera,Jūrmala,Rēzekne,Ogre,Tukums,Cēsis,Sigulda
LIE|LI|Liechtenstein|Liechtenstein|UEFA|44|Swiss 1. Liga|Swiss Challenge|de|Vaduz,Schaan,Balzers,Triesen,Eschen,Mauren,Triesenberg,Ruggell,Gamprin
LTU|LT|Lithuania|Lituanie|UEFA|50|I Lyga|A Lyga|nordic|Vilnius,Kaunas,Klaipėda,Šiauliai,Panevėžys,Alytus,Marijampolė,Utena,Mažeikiai,Jonava,Telšiai,Kėdainiai
LUX|LU|Luxembourg|Luxembourg|UEFA|52|Ligue 2|Ligue 1|de|Differdange,Esch,Dudelange,Niederkorn,Mondorf,Walferdange,Käerjéng,Bettembourg,Wiltz,Rodange,Hesperange,Grevenmacher
MLT|MT|Malta|Malte|UEFA|46|Challenge League|Premier League|it|Valletta,Birkirkara,Sliema,Hamrun,Mosta,Gżira,Floriana,Marsaxlokk,Qormi,Tarxien,Naxxar,Żebbuġ
MDA|MD|Moldova|Moldavie|UEFA|50|Liga 1|Super Liga|ee|Chișinău,Bălți,Tiraspol,Cahul,Orhei,Soroca,Ungheni,Comrat,Edineț,Hîncești,Căușeni,Strășeni
SMR|SM|San Marino|Saint-Marin|UEFA|38|Campionato Sammarinese B|Campionato Sammarinese|it|Serravalle,Borgo Maggiore,Domagnano,Fiorentino,Faetano,Acquaviva,Chiesanuova,Montegiardino,Dogana
AND|AD|Andorra|Andorre|UEFA|42|Segona Divisió|Primera Divisió|es|Andorra la Vella,Escaldes,Encamp,Sant Julià,La Massana,Ordino,Canillo,Santa Coloma
MAR|MA|Morocco|Maroc|CAF|80|Botola 2|Botola Pro|ar|Casablanca,Rabat,Fès,Marrakech,Tanger,Agadir,Meknès,Oujda,Kénitra,Tétouan,Safi,El Jadida,Nador,Berkane
EGY|EG|Egypt|Égypte|CAF|76|Second Division|Premier League|ar|Alexandrie,Ismaïlia,Port-Saïd,Suez,Mansoura,Tanta,Assiout,Louxor,Damiette,Fayoum,Zagazig,Aswan
ALG|DZ|Algeria|Algérie|CAF|76|Ligue 2|Ligue 1|ar|Alger,Oran,Constantine,Annaba,Sétif,Tizi Ouzou,Béjaïa,Blida,Batna,Tlemcen,Biskra,Mostaganem
TUN|TN|Tunisia|Tunisie|CAF|74|Ligue 2|Ligue 1|ar|Tunis,Sfax,Sousse,Monastir,Bizerte,Gabès,Kairouan,Gafsa,Nabeul,Ben Arous,Médenine,Tozeur
LBY|LY|Libya|Libye|CAF|52|Second Division|Premier League|ar|Tripoli,Benghazi,Misrata,Sebha,Zawiya,Tobruk,Derna,Zliten,Khoms,Sirte,Ghadames,Al Bayda
NGA|NG|Nigeria|Nigéria|CAF|77|Nigeria National League|NPFL|eaf|Lagos,Abuja,Kano,Enugu,Port Harcourt,Ibadan,Kaduna,Warri,Owerri,Abeokuta,Jos,Sokoto,Calabar,Uyo
CIV|CI|Ivory Coast|Côte d’Ivoire|CAF|77|Ligue 2|Ligue 1|faf|Abidjan,Bouaké,Yamoussoukro,San-Pédro,Korhogo,Daloa,Man,Divo,Gagnoa,Odienné,Sassandra,Bondoukou
GHA|GH|Ghana|Ghana|CAF|73|Division One|Premier League|eaf|Accra,Kumasi,Tamale,Takoradi,Cape Coast,Sekondi,Koforidua,Sunyani,Ho,Obuasi,Wa,Bolgatanga
CMR|CM|Cameroon|Cameroun|CAF|74|Elite Two|Elite One|faf|Douala,Yaoundé,Garoua,Bamenda,Bafoussam,Maroua,Limbé,Kribi,Ebolowa,Bertoua,Ngaoundéré,Buéa
MLI|ML|Mali|Mali|CAF|72|Première Division|Super League|faf|Bamako,Sikasso,Kayes,Ségou,Mopti,Koulikoro,Gao,Tombouctou,Kidal,Kati,Koutiala,San
BFA|BF|Burkina Faso|Burkina Faso|CAF|69|Deuxième Division|Premier League|faf|Ouagadougou,Bobo-Dioulasso,Koudougou,Banfora,Ouahigouya,Kaya,Tenkodogo,Dori,Fada,Dédougou,Gaoua,Ziniaré
COD|CD|DR Congo|RD Congo|CAF|70|Linafoot D2|Linafoot|faf|Kinshasa,Lubumbashi,Mbuji-Mayi,Kisangani,Goma,Bukavu,Kananga,Matadi,Kolwezi,Likasi,Mbandaka,Kalemie
CGO|CG|Congo|Congo|CAF|58|Division 2|Ligue 1|faf|Brazzaville,Pointe-Noire,Dolisie,Owando,Ouesso,Madingou,Kinkala,Impfondo,Sibiti,Nkayi
GAB|GA|Gabon|Gabon|CAF|64|National Foot 2|National Foot 1|faf|Libreville,Port-Gentil,Franceville,Oyem,Lambaréné,Moanda,Mouila,Tchibanga,Koulamoutou,Makokou
GUI|GN|Guinea|Guinée|CAF|66|Ligue 2|Ligue 1|faf|Conakry,Kankan,Kindia,Labé,Nzérékoré,Boké,Mamou,Siguiri,Faranah,Dubréka,Coyah,Fria
GNB|GW|Guinea-Bissau|Guinée-Bissau|CAF|56|Segunda Divisão|Campeonato Nacional|paf|Bissau,Bafatá,Gabú,Bissorã,Bolama,Cacheu,Canchungo,Farim,Mansôa,Quinhámel
CPV|CV|Cape Verde|Cap-Vert|CAF|66|Segunda Divisão|Campeonato Nacional|paf|Praia,Mindelo,Sal Rei,Assomada,Tarrafal,Espargos,Santa Maria,Pedra Badejo,Calheta,Porto Novo
ZAM|ZM|Zambia|Zambie|CAF|62|Division One|Super League|eaf|Lusaka,Ndola,Kitwe,Kabwe,Livingstone,Chingola,Mufulira,Solwezi,Chipata,Kasama,Mongu,Choma
UGA|UG|Uganda|Ouganda|CAF|62|Big League|Premier League|eaf|Kampala,Jinja,Mbarara,Gulu,Entebbe,Masaka,Mbale,Arua,Lira,Soroti,Fort Portal,Kabale
ANG|AO|Angola|Angola|CAF|63|Segundona|Girabola|paf|Luanda,Benguela,Huambo,Lubango,Cabinda,Malanje,Namibe,Uíge,Kuito,Saurimo,Ndalatando,Lobito
BEN|BJ|Benin|Bénin|CAF|62|Championnat D2|Championnat National|faf|Cotonou,Porto-Novo,Parakou,Abomey,Djougou,Bohicon,Natitingou,Ouidah,Lokossa,Kandi,Savalou,Dassa
MOZ|MZ|Mozambique|Mozambique|CAF|56|Moçambola 2|Moçambola|paf|Maputo,Beira,Nampula,Quelimane,Tete,Chimoio,Pemba,Matola,Lichinga,Inhambane,Xai-Xai,Nacala
KEN|KE|Kenya|Kenya|CAF|56|National Super League|Premier League|eaf|Nairobi,Mombasa,Kisumu,Nakuru,Eldoret,Thika,Machakos,Nyeri,Kakamega,Kisii,Garissa,Malindi
TAN|TZ|Tanzania|Tanzanie|CAF|55|Championship|Premier League|eaf|Dar es Salaam,Dodoma,Arusha,Mwanza,Mbeya,Tanga,Morogoro,Zanzibar,Mtwara,Iringa,Tabora,Singida
RSA|ZA|South Africa|Afrique du Sud|CAF|66|National First Division|Premiership|eaf|Johannesburg,Cape Town,Durban,Pretoria,Polokwane,Bloemfontein,Soweto,Port Elizabeth,Rustenburg,Nelspruit,East London,Kimberley
ZIM|ZW|Zimbabwe|Zimbabwe|CAF|55|Division One|Premier Soccer League|eaf|Harare,Bulawayo,Mutare,Gweru,Masvingo,Kwekwe,Chitungwiza,Kadoma,Hwange,Victoria Falls,Chinhoyi,Bindura
ZAM2|XX|skip|skip|CAF|0|||eaf|
TOG|TG|Togo|Togo|CAF|58|Championnat D2|Championnat National|faf|Lomé,Kara,Sokodé,Atakpamé,Kpalimé,Dapaong,Tsévié,Aného,Bassar,Tchamba,Notsé,Vogan
NIG|NE|Niger|Niger|CAF|52|Ligue 2|Ligue 1|faf|Niamey,Zinder,Maradi,Agadez,Tahoua,Dosso,Tillabéri,Diffa,Arlit,Birni,Gaya,Madaoua
MTN|MR|Mauritania|Mauritanie|CAF|55|Division 2|Super D1|ar|Nouakchott,Nouadhibou,Kiffa,Rosso,Atar,Zouérat,Kaédi,Aleg,Néma,Sélibabi,Tidjikja,Akjoujt
GAM|GM|Gambia|Gambie|CAF|56|Second Division|GFA League|eaf|Banjul,Serekunda,Brikama,Bakau,Farafenni,Lamin,Gunjur,Basse,Soma,Janjanbureh,Kerewan,Sukuta
SLE|SL|Sierra Leone|Sierra Leone|CAF|52|Second Division|Premier League|eaf|Freetown,Bo,Kenema,Makeni,Koidu,Lunsar,Waterloo,Port Loko,Kabala,Magburaka,Segbwema,Kambia
LBR|LR|Liberia|Libéria|CAF|50|Second Division|LFA First Division|eaf|Monrovia,Gbarnga,Buchanan,Kakata,Harper,Voinjama,Zwedru,Robertsport,Sanniquellie,Greenville,Bensonville,Ganta
CHA|TD|Chad|Tchad|CAF|46|Division 2|Ligue 1|faf|N’Djamena,Moundou,Sarh,Abéché,Kélo,Doba,Pala,Am Timan,Bongor,Mongo,Koumra,Mao
CTA|CF|Central African Republic|République centrafricaine|CAF|46|Division 2|Ligue 1|faf|Bangui,Bimbo,Berbérati,Carnot,Bambari,Bouar,Bossangoa,Bria,Bangassou,Nola,Sibut,Mbaïki
EQG|GQ|Equatorial Guinea|Guinée équatoriale|CAF|58|Segunda División|Liga Nacional|es|Malabo,Bata,Ebebiyín,Mongomo,Luba,Evinayong,Mbini,Añisoc,Acurenam,Cogo,Nsok,Aconibe
COM|KM|Comoros|Comores|CAF|52|Division 2|Ligue 1|faf|Moroni,Mutsamudu,Fomboni,Domoni,Mitsamiouli,Ouani,Sima,Foumbouni,Mbéni,Itsandra,Ntsaweni,Tsimbeo
MAD|MG|Madagascar|Madagascar|CAF|58|Division 2|Ligue 1|faf|Antananarivo,Toamasina,Antsirabe,Mahajanga,Fianarantsoa,Toliara,Antsiranana,Ambatondrazaka,Morondava,Sambava,Farafangana,Manakara
MRI|MU|Mauritius|Maurice|CAF|45|Division 2|Premier League|eaf|Port Louis,Curepipe,Vacoas,Quatre Bornes,Rose Hill,Beau Bassin,Mahébourg,Flacq,Triolet,Goodlands,Souillac,Pamplemousses
SEY|SC|Seychelles|Seychelles|CAF|42|Division Two|Premier League|eaf|Victoria,Anse Boileau,Beau Vallon,Takamaka,Anse Royale,Cascade,Glacis,Bel Ombre,Baie Lazare,Grand Anse,Port Glaud,La Digue
BDI|BI|Burundi|Burundi|CAF|50|Ligue B|Ligue A|faf|Bujumbura,Gitega,Ngozi,Muyinga,Ruyigi,Kayanza,Makamba,Bururi,Cibitoke,Rumonge,Rutana,Karuzi
RWA|RW|Rwanda|Rwanda|CAF|52|Second Division|Premier League|eaf|Kigali,Huye,Musanze,Rubavu,Muhanga,Rusizi,Nyagatare,Rwamagana,Kibungo,Gicumbi,Kayonza,Nyamagabe
ETH|ET|Ethiopia|Éthiopie|CAF|52|Higher League|Premier League|eaf|Addis Ababa,Bahir Dar,Hawassa,Dire Dawa,Mekelle,Adama,Jimma,Gondar,Dessie,Harar,Arba Minch,Jijiga
ERI|ER|Eritrea|Érythrée|CAF|42|Second Division|Premier League|eaf|Asmara,Keren,Massawa,Assab,Mendefera,Barentu,Adi Keyh,Dekemhare,Akordat,Nakfa,Tessenei,Dbarwa
SOM|SO|Somalia|Somalie|CAF|40|Second Division|Premier League|eaf|Mogadishu,Hargeisa,Kismayo,Baidoa,Bosaso,Garowe,Berbera,Jowhar,Beledweyne,Galkayo,Merca,Borama
DJI|DJ|Djibouti|Djibouti|CAF|42|Division 2|Division 1|faf|Djibouti,Ali Sabieh,Tadjoura,Obock,Dikhil,Arta,Balbala,Holhol,Yoboki,Randa,Khor Angar,Loyada
SSD|SS|South Sudan|Soudan du Sud|CAF|44|Second Division|Premier League|eaf|Juba,Malakal,Wau,Yei,Bor,Aweil,Rumbek,Torit,Yambio,Bentiu,Kuajok,Nimule
SDN|SD|Sudan|Soudan|CAF|52|Second Division|Premier League|ar|Khartoum,Omdurman,Port Sudan,Kassala,El Obeid,Wad Madani,Nyala,Atbara,Kosti,Gedaref,Dongola,El Fasher
MWI|MW|Malawi|Malawi|CAF|54|Division One|Super League|eaf|Lilongwe,Blantyre,Mzuzu,Zomba,Kasungu,Mangochi,Salima,Karonga,Dedza,Liwonde,Nkhotakota,Balaka
NAM|NA|Namibia|Namibie|CAF|55|Division One|Premier League|eaf|Windhoek,Walvis Bay,Swakopmund,Oshakati,Rundu,Katima Mulilo,Keetmanshoop,Otjiwarongo,Grootfontein,Tsumeb,Gobabis,Lüderitz
BOT|BW|Botswana|Botswana|CAF|50|First Division North|Premier League|eaf|Gaborone,Francistown,Maun,Molepolole,Serowe,Selebi-Phikwe,Kanye,Mahalapye,Palapye,Lobatse,Jwaneng,Tlokweng
LES|LS|Lesotho|Lesotho|CAF|48|Division B|Premier League|eaf|Maseru,Teyateyaneng,Mafeteng,Leribe,Mohale's Hoek,Quthing,Butha-Buthe,Mokhotlong,Thaba-Tseka,Qacha's Nek,Roma,Peka
SWZ|SZ|Eswatini|Eswatini|CAF|44|First Division|Premier League|eaf|Mbabane,Manzini,Lobamba,Nhlangano,Siteki,Piggs Peak,Big Bend,Malkerns,Mhlume,Hlatikulu,Lavumisa,Matsapha
STP|ST|São Tomé and Príncipe|Sao Tomé-et-Principe|CAF|40|Segunda Divisão|Campeonato Nacional|paf|São Tomé,Santo António,Neves,Trindade,Santana,Guadalupe,Porto Alegre,Bombom,Ribeira Afonso,Pantufo,Bela Vista,Madalena
ARG|AR|Argentina|Argentine|CONMEBOL|86|Primera Nacional|Liga Profesional|lat|Rosario,Córdoba,Mendoza,Tucumán,Salta,Santa Fe,Mar del Plata,Bahía Blanca,Neuquén,Paraná,Posadas,Jujuy,Resistencia,San Juan
URU|UY|Uruguay|Uruguay|CONMEBOL|80|Segunda División|Primera División|lat|Montevideo,Salto,Paysandú,Rivera,Maldonado,Colonia,Tacuarembó,Melo,Mercedes,Artigas,Florida,Durazno
COL|CO|Colombia|Colombie|CONMEBOL|80|Torneo BetPlay|Liga BetPlay|lat|Medellín,Cali,Barranquilla,Cartagena,Bucaramanga,Pereira,Manizales,Cúcuta,Ibagué,Pasto,Santa Marta,Montería
CHI|CL|Chile|Chili|CONMEBOL|70|Primera B|Primera División|lat|Santiago,Valparaíso,Concepción,Temuco,Antofagasta,La Serena,Iquique,Rancagua,Talca,Puerto Montt,Arica,Coquimbo
ECU|EC|Ecuador|Équateur|CONMEBOL|74|Serie B|Serie A|lat|Quito,Guayaquil,Cuenca,Ambato,Loja,Manta,Portoviejo,Riobamba,Machala,Ibarra,Esmeraldas,Latacunga
PAR|PY|Paraguay|Paraguay|CONMEBOL|69|División Intermedia|Primera División|lat|Asunción,Ciudad del Este,Encarnación,Luque,Lambaré,Fernando de la Mora,Pedro Juan Caballero,Concepción,Villarrica,Caaguazú,Coronel Oviedo,San Lorenzo
PER|PE|Peru|Pérou|CONMEBOL|66|Liga 2|Liga 1|lat|Lima,Arequipa,Trujillo,Cusco,Piura,Chiclayo,Huancayo,Iquitos,Tacna,Ayacucho,Pucallpa,Juliaca
VEN|VE|Venezuela|Venezuela|CONMEBOL|64|Segunda División|Primera División|lat|Caracas,Maracaibo,Valencia,Barquisimeto,Maracay,Mérida,Cumaná,Puerto Ordaz,San Cristóbal,Barcelona,Maturín,Ciudad Bolívar
BOL|BO|Bolivia|Bolivie|CONMEBOL|56|Copa Simón Bolívar|División Profesional|lat|La Paz,Santa Cruz,Cochabamba,Sucre,Oruro,Potosí,Tarija,Trinidad,Montero,Quillacollo,Riberalta,Cobija
USA|US|United States|États-Unis|CONCACAF|76|USL League One|MLS|en|Chicago,Seattle,Portland,Austin,Denver,Atlanta,Charlotte,Sacramento,Tampa,Pittsburgh,Louisville,Detroit,Phoenix,San Diego
CAN|CA|Canada|Canada|CONCACAF|70|League1 Canada|Canadian Premier League|en|Toronto,Montréal,Vancouver,Calgary,Edmonton,Ottawa,Winnipeg,Halifax,Hamilton,Québec,Victoria,Regina
MEX|MX|Mexico|Mexique|CONCACAF|76|Liga de Expansión|Liga MX|lat|Guadalajara,Monterrey,Puebla,Tijuana,Toluca,Querétaro,León,Mérida,Veracruz,Morelia,Oaxaca,Culiacán,Tampico,Saltillo
CRC|CR|Costa Rica|Costa Rica|CONCACAF|64|Liga de Ascenso|Liga Promerica|lat|San José,Alajuela,Heredia,Cartago,Limón,Liberia,Puntarenas,Pérez Zeledón,Grecia,Santa Ana,Guápiles,San Carlos
PAN|PA|Panama|Panama|CONCACAF|66|Liga Comex|Liga Panameña|lat|Panamá,Colón,David,Chitré,Santiago,Penonomé,Las Tablas,Arraiján,La Chorrera,Bocas del Toro,Changuinola,Aguadulce
HON|HN|Honduras|Honduras|CONCACAF|56|Liga de Ascenso|Liga Nacional|lat|Tegucigalpa,San Pedro Sula,La Ceiba,Choloma,Comayagua,Danlí,Juticalpa,Choluteca,Olanchito,Tocoa,Siguatepeque,Puerto Cortés
JAM|JM|Jamaica|Jamaïque|CONCACAF|62|National Premier League 2|Premier League|en|Kingston,Montego Bay,Spanish Town,Portmore,Mandeville,May Pen,Ocho Rios,Savanna-la-Mar,Port Antonio,Negril,Linstead,Old Harbour
JPN|JP|Japan|Japon|AFC|78|J3 League|J1 League|jp|Sapporo,Sendai,Niigata,Nagoya,Osaka,Kobe,Hiroshima,Fukuoka,Kumamoto,Okayama,Shizuoka,Yokohama,Kanazawa,Matsumoto
KOR|KR|South Korea|Corée du Sud|AFC|76|K League 2|K League 1|asia|Seoul,Busan,Daegu,Incheon,Gwangju,Daejeon,Ulsan,Suwon,Jeonju,Pohang,Jeju,Changwon,Gangneung,Cheonan
IRN|IR|Iran|Iran|AFC|75|Azadegan League|Persian Gulf Pro League|ar|Tehran,Isfahan,Shiraz,Tabriz,Mashhad,Ahvaz,Rasht,Kerman,Yazd,Qom,Arak,Sari
AUS|AU|Australia|Australie|AFC|71|NPL|A-League|en|Sydney,Melbourne,Brisbane,Perth,Adelaide,Canberra,Newcastle,Wollongong,Gold Coast,Hobart,Geelong,Cairns
KSA|SA|Saudi Arabia|Arabie saoudite|AFC|68|First Division League|Pro League|gulf|Riyadh,Jeddah,Dammam,Abha,Medina,Taif,Buraidah,Tabuk,Najran,Hail,Khobar,Jazan
QAT|QA|Qatar|Qatar|AFC|66|Second Division|Stars League|gulf|Doha,Al Rayyan,Al Wakrah,Al Khor,Umm Salal,Lusail,Mesaieed,Dukhan,Al Shamal,Al Gharafa,Madinat,Sealine
UAE|AE|United Arab Emirates|Émirats arabes unis|AFC|62|Division One|Pro League|gulf|Dubai,Abu Dhabi,Sharjah,Al Ain,Ajman,Fujairah,Ras Al Khaimah,Khor Fakkan,Umm Al Quwain,Dibba,Kalba,Liwa
IRQ|IQ|Iraq|Irak|AFC|64|Premier Division|Stars League|ar|Baghdad,Basra,Mosul,Erbil,Najaf,Karbala,Kirkuk,Sulaymaniyah,Duhok,Nasiriyah,Amarah,Hilla
UZB|UZ|Uzbekistan|Ouzbékistan|AFC|66|First League|Super League|ru|Tashkent,Samarkand,Bukhara,Namangan,Andijan,Fergana,Nukus,Qarshi,Termez,Navoi,Jizzakh,Urgench
JOR|JO|Jordan|Jordanie|AFC|62|First Division|Pro League|ar|Amman,Zarqa,Irbid,Aqaba,Salt,Madaba,Karak,Jerash,Ajloun,Mafraq,Ma'an,Tafilah
CHN|CN|China|Chine|AFC|60|China League One|Super League|cn|Shanghai,Beijing,Guangzhou,Shenzhen,Chengdu,Wuhan,Tianjin,Dalian,Qingdao,Hangzhou,Nanjing,Chongqing
IND|IN|India|Inde|AFC|52|I-League|Super League|asia|Kolkata,Mumbai,Chennai,Bengaluru,Goa,Hyderabad,Jamshedpur,Kochi,Guwahati,Delhi,Shillong,Imphal
THA|TH|Thailand|Thaïlande|AFC|55|Thai League 2|Thai League 1|asia|Bangkok,Chiang Mai,Buriram,Chonburi,Ratchaburi,Nakhon Ratchasima,Phuket,Pattaya,Songkhla,Khon Kaen,Udon Thani,Rayong
VIE|VN|Vietnam|Viêt Nam|AFC|54|V.League 2|V.League 1|asia|Hanoi,Ho Chi Minh City,Da Nang,Hai Phong,Hue,Nam Dinh,Can Tho,Vinh,Thanh Hoa,Quang Ninh,Binh Duong,Pleiku
IDN|ID|Indonesia|Indonésie|AFC|54|Liga 2|Liga 1|asia|Jakarta,Surabaya,Bandung,Medan,Makassar,Semarang,Malang,Palembang,Yogyakarta,Denpasar,Balikpapan,Pontianak
`;

export interface WorldCountry {
  code: string;
  iso2: string;
  name: string;
  fr: string;
  confederation: Confederation;
  strength: number;
  lowLeague: string;
  topLeague: string;
  style: string;
  towns: string[];
}

const FLAG_OVERRIDE: Record<string, string> = {
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  NIR: '🇬🇧',
};

const flagOf = (code: string, iso2: string) =>
  FLAG_OVERRIDE[code] ?? String.fromCodePoint(...[...iso2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export const WORLD: (WorldCountry & { flag: string })[] = RAW.trim()
  .split('\n')
  .map((line) => line.split('|'))
  .filter((p) => p.length >= 10 && p[2] !== 'skip')
  .map((p) => ({
    code: p[0],
    iso2: p[1],
    name: p[2],
    fr: p[3],
    confederation: p[4] as Confederation,
    strength: Number(p[5]),
    lowLeague: p[6],
    topLeague: p[7],
    style: p[8],
    towns: p[9] ? p[9].split(',') : [],
    flag: flagOf(p[0], p[1]),
  }));

/** Club naming patterns by country style. */
export const STYLES: Record<string, string[]> = {
  fr: ['AS {c}', 'FC {c}', 'US {c}', 'Stade {c}', '{c} FC', 'Olympique {c}', 'Racing {c}', 'Étoile {c}'],
  es: ['CD {c}', 'UD {c}', '{c} CF', 'Real {c}', 'Atlético {c}', 'Deportivo {c}', 'Club {c}', 'Sporting {c}'],
  it: ['AC {c}', 'US {c}', '{c} Calcio', 'SSD {c}', 'Virtus {c}', 'Atletico {c}', 'FC {c}', '{c} 1908'],
  pt: ['{c} FC', 'Sporting {c}', 'GD {c}', 'CD {c}', 'SC {c}', 'Atlético {c}', 'Académica {c}', 'Desportivo {c}'],
  de: ['FC {c}', 'SV {c}', 'TSV {c}', 'VfB {c}', '{c} 1900', 'SC {c}', 'FSV {c}', 'Viktoria {c}'],
  en: ['{c} Town', '{c} Rovers', '{c} Athletic', '{c} United', '{c} City', '{c} Albion', '{c} Wanderers', '{c} Rangers'],
  nl: ['FC {c}', 'SC {c}', 'VV {c}', '{c} Boys', 'Sportclub {c}', 'RKC {c}', 'Vitesse {c}', '{c} Oranje'],
  nordic: ['{c} IF', 'IFK {c}', '{c} BK', 'FC {c}', '{c} FF', 'IK {c}', '{c} United', 'Sporting {c}'],
  slav: ['FK {c}', 'SK {c}', '{c} Sokol', 'Slavia {c}', 'Dinamo {c}', 'Lokomotiv {c}', '{c} Sparta', '{c} 1920'],
  balkan: ['FK {c}', 'NK {c}', 'KF {c}', '{c} Dinamo', '{c} 1913', 'Sloga {c}', 'Lokomotiva {c}', 'Partizani {c}'],
  ee: ['FC {c}', 'CS {c}', '{c} SE', 'Dinamo {c}', 'Sportul {c}', 'Unirea {c}', 'Steaua {c}', 'Viitorul {c}'],
  ru: ['FK {c}', 'Dinamo {c}', 'Lokomotiv {c}', 'Spartak {c}', 'Torpedo {c}', '{c} 1930', 'Neftchi {c}', 'Kolkheti {c}'],
  tr: ['{c}spor', '{c} Belediyespor', '{c} FK', 'Yeni {c}spor', '{c} Gençlik SK', 'Anadolu {c}', '{c} Demirspor', '{c} Gücü'],
  gr: ['AO {c}', '{c} FC', 'PAE {c}', 'Panathlitikos {c}', 'Ethnikos {c}', 'Apollon {c}', 'Aris {c}', 'Atromitos {c}'],
  ar: ['{c} Club', 'CS {c}', 'US {c}', '{c} SC', 'Étoile {c}', 'JS {c}', 'Union {c}', 'Olympique {c}'],
  faf: ['AS {c}', '{c} FC', 'Étoile {c}', 'US {c}', 'Racing {c}', 'Olympique {c}', 'Union Sportive {c}', 'Jeunesse {c}'],
  eaf: ['{c} United', '{c} Stars', '{c} City FC', '{c} Rangers', '{c} Warriors', '{c} Eagles', '{c} Lions', '{c} Young Stars'],
  paf: ['{c} FC', 'Sporting {c}', 'Académica {c}', 'Atlético {c}', 'Desportivo {c}', 'GD {c}', 'Clube {c}', 'União {c}'],
  lat: ['Club {c}', 'Deportivo {c}', '{c} FC', 'Atlético {c}', 'Sporting {c}', 'Independiente {c}', 'Unión {c}', 'Real {c}'],
  asia: ['{c} FC', '{c} United', '{c} City', '{c} Athletic', 'FC {c}', '{c} Lions', '{c} Rovers', '{c} Sun'],
  jp: ['{c} FC', '{c} United', '{c} Athletic', 'FC {c}', '{c} SC', '{c} Sun', '{c} Blue', '{c} Wave'],
  cn: ['{c} FC', '{c} City', '{c} United', '{c} Dragons', '{c} Rising', '{c} Phoenix', '{c} Stars', '{c} Athletic'],
  gulf: ['{c} SC', 'Al {c}', '{c} Club', 'Al-{c} FC', '{c} United', '{c} Falcons', 'Al {c} SC', '{c} Knights'],
};
