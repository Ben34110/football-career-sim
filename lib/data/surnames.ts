import { WORLD } from './world';
import { SURNAMES } from './names';

const w = (s: string) => s.split(/\s*,\s*/);

/** Everyday surnames by naming style (the style of each country is set in world.ts). */
const STYLE_POOL: Record<string, string[]> = {
  fr: w('Dubois, Moreau, Lambert, Fontaine, Rousseau, Lemaire, Marchand, Lacroix, Girard, Bonnet, Faure, Mercier, Roux, Blanc, Garnier, Perrin, Chevalier, Robin, Masson, Colin, Gauthier, Barbier, Renard, Lefèvre, Morel, Laurent, Noël, Picard, Vidal, Carpentier'),
  es: w('García, Rodríguez, Martínez, López, Sánchez, Pérez, Gómez, Fernández, Navarro, Romero, Ortega, Castillo, Molina, Vidal, Herrera, Ramos, Iglesias, Serrano, Cabrera, Suárez, Morales, Delgado, Campos, Vega, Blanco, Prieto, Gil'),
  pt: w('Silva, Santos, Costa, Pereira, Ferreira, Alves, Oliveira, Souza, Rocha, Lima, Carvalho, Teixeira, Mendes, Barbosa, Ribeiro, Cardoso, Moreira, Nogueira, Araújo, Correia, Almeida, Monteiro, Pinto, Rodrigues, Gomes, Batista, Cunha'),
  en: w('Walker, Clarke, Hughes, Taylor, Johnson, Smith, Turner, Wright, Hall, Bennett, Foster, Cooper, Reid, Murray, Hunt, Fletcher, Palmer, Barnes, Cole, Bailey, Harrison, Shaw, Mills, Grant, Dixon, Hayes, Marsh, Kerr'),
  de: w('Müller, Bauer, Schneider, Fischer, Weber, Hoffmann, Koch, Richter, Wolf, Keller, Becker, Schulz, Braun, Krüger, Lang, Vogel, Huber, Meier, Schmitt, Brandt, Hartmann, Lehmann, Köhler, Frank, Beck'),
  nl: w('De Jong, Van Dijk, Janssen, De Vries, Bakker, Visser, Smit, Meijer, Bos, Mulder, Dekker, Peters, Hendriks, De Boer, Jacobs, Verhoeven, Kuipers, Willems, Vermeulen, Brouwer, Van Leeuwen'),
  it: w('Rossi, Bianchi, Romano, Colombo, Ricci, Marino, Greco, Bruno, Gallo, Conti, De Luca, Giordano, Mancini, Rizzo, Lombardi, Moretti, Barbieri, Fontana, Santoro, Mariani, Rinaldi, Caruso, Ferrara, Galli'),
  balkan: w('Kovač, Horvat, Petrović, Jovanović, Marković, Babić, Novak, Kovačević, Perić, Matić, Tomić, Vuković, Radić, Knežević, Božić, Lukić, Pavlović, Šimić, Jurić, Marić, Stanković, Ilić, Đorđević'),
  nordic: w('Larsen, Hansen, Andersen, Nielsen, Jensen, Lindqvist, Johansson, Eriksson, Olsen, Berg, Dahl, Haugen, Lund, Strand, Halvorsen, Nyström, Karlsson, Svensson, Magnusson, Pedersen'),
  slav: w('Novák, Kowalski, Nowak, Wiśniewski, Wójcik, Kamiński, Zieliński, Szymański, Kaczmarek, Dvořák, Svoboda, Černý, Procházka, Horák, Kučera, Marek, Němec, Pospíšil, Bartoš, Tóth'),
  ee: w('Popescu, Ionescu, Popa, Radu, Dumitru, Stan, Gheorghe, Szabó, Nagy, Kiss, Varga, Molnár, Farkas, Balogh, Horváth, Tkachenko, Kovalenko, Bondarenko, Melnyk, Boyko, Kravchenko, Moroz'),
  tr: w('Yılmaz, Kaya, Demir, Şahin, Çelik, Yıldız, Öztürk, Aydın, Arslan, Doğan, Kılıç, Aslan, Çetin, Kara, Koç, Kurt, Özdemir, Polat'),
  gr: w('Papadopoulos, Georgiou, Nikolaidis, Dimitriou, Vasiliou, Alexiou, Ioannou, Christodoulou, Antoniou, Makris, Pappas, Katsaros, Stavrou, Konstantinou, Theodorou, Papadakis, Lazaridis'),
  ru: w('Ivanov, Petrov, Smirnov, Kuznetsov, Popov, Sokolov, Lebedev, Kozlov, Novikov, Morozov, Volkov, Fedorov, Orlov, Kovalev, Egorov'),
  faf: w('Traoré, Diallo, Koné, Camara, Keita, Touré, Coulibaly, Sylla, Bamba, Doumbia, Cissé, Konaté, Sangaré, Diakité, Soumaré, Ouattara, Kouyaté, Bah, Barry, Sidibé, Fofana'),
  eaf: w('Kamau, Mwangi, Otieno, Ochieng, Mutua, Banda, Phiri, Tembo, Moyo, Ncube, Dlamini, Nkosi, Khumalo, Mokoena, Molefe, Ndlovu, Mukasa, Okello, Kato, Mushi, Juma'),
  paf: w('Silva, Santos, Fernandes, Monteiro, Lopes, Tavares, Mendes, Fortes, Semedo, Cabral, Andrade, Brito, Baptista, Sousa, Neto, Gomes'),
  ar: w('Benali, Amrani, Bennani, El Idrissi, Haddad, Saidi, Bouzid, Belhadj, Mansouri, Hamdi, Zouaoui, Cherif, Khalil, Nasser, Yassine, Fassi, Tahiri, Ziani, Ouali, Boukhari'),
  gulf: w('Al-Harbi, Al-Dosari, Al-Shehri, Al-Ghamdi, Al-Qahtani, Al-Mutairi, Al-Otaibi, Al-Zahrani, Al-Hamad, Al-Mansoori, Al-Kaabi, Al-Suwaidi, Al-Naimi, Al-Rumaihi'),
  lat: w('García, Rodríguez, Martínez, López, González, Fernández, Pérez, Gómez, Díaz, Torres, Ramírez, Flores, Rojas, Silva, Vargas, Mendoza, Castro, Ríos, Ortiz, Herrera, Medina, Aguilar, Paredes, Acosta, Cardozo, Benítez'),
  jp: w('Tanaka, Suzuki, Takahashi, Watanabe, Ito, Yamamoto, Nakamura, Kobayashi, Kato, Yoshida, Yamada, Sasaki, Matsumoto, Inoue, Kimura, Hayashi, Shimizu, Saito, Mori, Ikeda, Hashimoto, Ishikawa, Ogawa, Okada, Fujita'),
  cn: w('Wang, Li, Zhang, Liu, Chen, Yang, Huang, Zhao, Wu, Zhou, Xu, Sun, Ma, Zhu, Hu, Guo, He, Lin, Gao, Luo'),
  asia: w('Kim, Lee, Park, Nguyen, Tran, Sharma, Singh, Kumar, Patel, Wijaya, Santoso, Setiawan, Cohen, Levi, Srisai, Chaiyasit'),
};

/** Countries whose names differ from the rest of their style (Senegal ≠ Mali ≠ Cameroon). */
const COUNTRY_POOL: Record<string, string[]> = {
  SEN: w('Diallo, Mendy, Ndiaye, Sarr, Diop, Fall, Gueye, Sow, Faye, Sané, Niang, Mbaye, Sy, Diatta, Badji, Sagna, Camara, Ba, Kouyaté, Cissé, Samb, Seck, Thiam, Ndour, Diouf, Dieng'),
  CIV: w('Kouassi, Koné, Ouattara, Yao, Konan, Bamba, Coulibaly, Zadi, Doumbia, Kouamé, Traoré, Diomandé, Sangaré, Gnagnon, Yapi, Aka'),
  MLI: w('Keita, Traoré, Coulibaly, Diarra, Sissoko, Doumbia, Konaté, Sidibé, Camara, Diakité, Dembélé, Maïga, Cissé, Touré'),
  CMR: w('Mbarga, Fouda, Atangana, Essomba, Ndjock, Manga, Ngoh, Tchakounté, Nguema, Biyik, Kamga, Ekani, Owona, Mvondo, Mbella, Ngassa'),
  NGA: w('Okafor, Okonkwo, Adeyemi, Eze, Nwosu, Balogun, Ogunleye, Ibrahim, Abubakar, Chukwu, Obi, Adebayo, Olawale, Usman, Musa, Okoro, Ajayi, Bello'),
  GHA: w('Mensah, Asante, Owusu, Boateng, Osei, Appiah, Addo, Amoah, Antwi, Yeboah, Ofori, Tetteh, Quaye, Annan, Darko'),
  RSA: w('Dlamini, Nkosi, Khumalo, Mokoena, Molefe, Ndlovu, Mahlangu, Zulu, Sithole, Naidoo, Botha, Pienaar'),
  MAR: w('Benali, Amrani, Bennani, El Idrissi, Alaoui, Berrada, Tahiri, Ziani, Fassi, Lahlou, Kabbaj, Skalli, El Fassi, Bouzid, Saidi'),
  EGY: w('Hassan, Ibrahim, Mahmoud, Abdelrahman, Mostafa, Farouk, Fathy, Shawky, Gaber, Saad, Zaki, Hegazi, Nabil, Ramadan'),
  ALG: w('Boudiaf, Cherfa, Mebarki, Bouchakour, Merabet, Zerrouki, Khelifi, Boudjemaa, Haddouche, Bensaid, Benzia, Bouazza'),
  TUN: w('Trabelsi, Jebali, Ben Salah, Gharbi, Mejri, Sassi, Khemiri, Bouazizi, Chaabane, Ben Ali, Miled, Hammami'),
  IRN: w('Rezaei, Mohammadi, Ahmadi, Karimi, Hosseini, Jafari, Moradi, Sadeghi, Rahimi, Taheri'),
  BRA: w('Silva, Santos, Souza, Oliveira, Lima, Pereira, Carvalho, Almeida, Ribeiro, Gomes, Martins, Rocha, Barbosa, Cardoso, Nascimento, Araújo, Moreira, Correia, Teixeira, Barros, Dias, Freitas, Machado'),
  ARG: w('Fernández, Gómez, Acosta, Benítez, Pereyra, Sosa, Ledesma, Giménez, Peralta, Ibáñez, Villalba, Maldonado, Aguirre, Domínguez'),
  USA: w('Johnson, Williams, Miller, Davis, Wilson, Anderson, Taylor, Thomas, Moore, Jackson, Martin, Thompson, White, Harris, Clark, Lewis, Robinson, Young, Allen, King, Scott, Green, Baker, Adams, Nelson, Hill'),
  JAM: w('Brown, Campbell, Williams, Reid, Henry, Morgan, Bailey, Francis, Powell, Grant, McKenzie, Lewis'),
  SCO: w('MacDonald, Campbell, Stewart, Murray, Robertson, Reid, McLeod, Fraser, Ross, McKenzie, Gordon, Hamilton'),
  WAL: w('Jones, Davies, Williams, Evans, Thomas, Roberts, Lewis, Hughes, Morgan, Griffiths, Rees, Price'),
  IRL: w('Murphy, O’Brien, Kelly, Walsh, Byrne, Ryan, O’Connor, Doyle, McCarthy, Gallagher, Doherty, Kennedy, Lynch, Quinn'),
  NIR: w('Murphy, McAllister, Kelly, Doherty, McGuigan, Quinn, Magee, Hamilton, Boyle, Gallagher'),
  BEL: w('Dubois, Peeters, Janssens, Maes, Jacobs, Willems, Claes, Goossens, Wouters, Dumont, Lambert, Hendrickx'),
  SUI: w('Müller, Meier, Schmid, Keller, Weber, Huber, Fischer, Steiner, Brunner, Gerber, Baumann, Frei'),
  ISL: w('Jónsson, Sigurðsson, Guðmundsson, Gunnarsson, Ólafsson, Einarsson, Magnússon, Kristjánsson, Haraldsson, Árnason'),
  FIN: w('Virtanen, Korhonen, Mäkinen, Nieminen, Hämäläinen, Laine, Heikkinen, Koskinen, Järvinen, Lehtonen'),
  LTU: w('Kazlauskas, Jankauskas, Petrauskas, Stankevičius, Vaitkus, Žukauskas'),
  LVA: w('Bērziņš, Kalniņš, Ozols, Jansons, Liepiņš, Krūmiņš'),
  EST: w('Tamm, Saar, Sepp, Mägi, Kask, Kukk, Rebane, Ilves'),
  GEO: w('Beridze, Gelashvili, Kapanadze, Maisuradze, Lomidze, Khutsishvili, Chikovani, Tsiklauri'),
  ARM: w('Hakobyan, Sargsyan, Petrosyan, Grigoryan, Avetisyan, Harutyunyan'),
  AZE: w('Mammadov, Aliyev, Hasanov, Huseynov, Guliyev, Ismayilov'),
  KAZ: w('Nurgaliyev, Suleimenov, Omarov, Kassymov, Zhumabayev, Abdrakhmanov'),
  UZB: w('Karimov, Rakhimov, Tursunov, Abdullaev, Yusupov, Ismoilov'),
  KOR: w('Kim, Lee, Park, Choi, Jung, Kang, Cho, Yoon, Jang, Lim, Han, Oh, Seo, Shin, Kwon, Hwang, Ahn, Song'),
  ISR: w('Cohen, Levi, Mizrahi, Peretz, Biton, Dahan, Avraham, Friedman, Azulay, Malka, Katz, Shapira'),
  IND: w('Sharma, Singh, Kumar, Patel, Gupta, Reddy, Nair, Das, Rao, Chopra, Mehta, Joshi'),
  THA: w('Srisai, Chaiyasit, Wongsawat, Prasert, Sukhum, Pongpan, Rattana, Boonmee'),
  VIE: w('Nguyen, Tran, Le, Pham, Hoang, Phan, Vu, Dang, Bui, Do'),
  IDN: w('Pratama, Wijaya, Saputra, Santoso, Kurniawan, Hidayat, Setiawan, Nugroho, Putra, Firmansyah'),
  KEN: w('Kamau, Mwangi, Otieno, Ochieng, Mutua, Kiprop, Njoroge, Wanjala'),
  UGA: w('Mukasa, Okello, Kato, Ssemakula, Opio, Byaruhanga, Kiggundu'),
  TAN: w('Mushi, Juma, Msuya, Kimaro, Mwakyusa, Shirima, Massawe'),
};

const byKey = new Map(WORLD.map((c) => [c.code, c]));
const byName = new Map(WORLD.map((c) => [c.name, c]));

/** The surname pool of a country, given its code ("SEN") or English name ("Senegal"). */
export function surnamesFor(country: string | null | undefined): readonly string[] {
  if (!country) return SURNAMES;
  const c = byKey.get(country) ?? byName.get(country.replace(/ (U20|U23)$/, ''));
  if (!c) return SURNAMES;
  return COUNTRY_POOL[c.code] ?? STYLE_POOL[c.style] ?? SURNAMES;
}
