export const SURNAMES = [
  'Dubois', 'Moreau', 'Silva', 'Costa', 'Diallo', 'Traoré', 'Mendes', 'Okafor', 'Haddad', 'Kane', 'Walker',
  'Ferreira', 'Navarro', 'Romero', 'Santos', 'Müller', 'Bauer', 'Ito', 'Kovač', 'Bianchi', 'De Jong', 'Larsen',
  'Mbaye', 'Cissé', 'Lemaire', 'Fontaine', 'Rossi', 'Pereira', 'Osei', 'Varga', 'Hughes', 'Clarke', 'Alves',
  'Gómez', 'Benzia', 'Touré', 'Lacroix', 'Vidal', 'Sanchez', 'Marchand',
];

export const KEEPERS = ['Lenoir', 'Hartmann', 'Esposito', 'Okonkwo', 'Duarte', 'Brandt', 'Sorensen', 'Navas'];

export const pick = <T,>(arr: readonly T[], rng: () => number = Math.random): T =>
  arr[Math.floor(rng() * arr.length)];
