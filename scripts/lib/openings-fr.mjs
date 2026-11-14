/**
 * French names for the Lichess opening book, read by scripts/build-openings.mjs.
 *
 * The book (github.com/lichess-org/chess-openings, CC0) names its lines in
 * English, as "Family: Variation, Subvariation". The coach speaks French, so
 * every name it shows comes from here:
 *
 * - FAMILIES names every family — the part before the colon — and must cover
 *   all of them: the build fails on one it does not know.
 * - VARIATIONS names a selection of lines by their full English name. A line
 *   that is not listed takes the name of its nearest listed ancestor — for
 *   "Sicilian Defense: Najdorf Variation, Adams Attack", the Najdorf — and,
 *   failing one, its family's. A key that names no line in the book fails the
 *   build too, so a typo here cannot pass unnoticed.
 *
 * Names follow French usage, not a word-for-word rendering: the Fried Liver is
 * the attaque Fegatello, the King's Indian the est-indienne. Moves inside a
 * name are in French notation (Ff5), as the player types them.
 */

export const FAMILIES = {
  'Alekhine Defense': 'Défense Alekhine',
  'Amar Opening': 'Ouverture Amar',
  'Amazon Attack': 'Attaque amazone',
  'Amsterdam Attack': 'Attaque d’Amsterdam',
  "Anderssen's Opening": 'Ouverture Anderssen',
  'Australian Defense': 'Défense australienne',
  'Barnes Defense': 'Défense Barnes',
  'Barnes Opening': 'Ouverture Barnes',
  'Basque Opening': 'Ouverture basque',
  'Benko Gambit': 'Gambit Benko',
  'Benko Gambit Accepted': 'Gambit Benko accepté',
  'Benko Gambit Declined': 'Gambit Benko refusé',
  'Benoni Defense': 'Défense Benoni',
  'Bird Opening': 'Ouverture Bird',
  "Bishop's Opening": 'Ouverture du fou',
  'Blackmar-Diemer Gambit': 'Gambit Blackmar-Diemer',
  'Blackmar-Diemer Gambit Accepted': 'Gambit Blackmar-Diemer accepté',
  'Blackmar-Diemer Gambit Declined': 'Gambit Blackmar-Diemer refusé',
  'Blumenfeld Countergambit': 'Contre-gambit Blumenfeld',
  'Blumenfeld Countergambit Accepted': 'Contre-gambit Blumenfeld accepté',
  'Bogo-Indian Defense': 'Défense bogo-indienne',
  'Bongcloud Attack': 'Attaque Bongcloud',
  'Borg Defense': 'Défense Borg',
  'Canard Opening': 'Ouverture du canard',
  'Caro-Kann Defense': 'Défense Caro-Kann',
  'Carr Defense': 'Défense Carr',
  'Catalan Opening': 'Partie catalane',
  'Center Game': 'Partie du centre',
  'Center Game Accepted': 'Partie du centre acceptée',
  'Clemenz Opening': 'Ouverture Clemenz',
  'Colle System': 'Système Colle',
  'Creepy Crawly Formation': 'Formation Creepy Crawly',
  'Czech Defense': 'Défense tchèque',
  'Danish Gambit': 'Gambit danois',
  'Danish Gambit Accepted': 'Gambit danois accepté',
  'Danish Gambit Declined': 'Gambit danois refusé',
  'Dresden Opening': 'Ouverture de Dresde',
  'Duras Gambit': 'Gambit Duras',
  'Dutch Defense': 'Défense hollandaise',
  'Döry Defense': 'Défense Döry',
  'East Indian Defense': 'Défense indienne de l’Est',
  'Elephant Gambit': 'Gambit de l’éléphant',
  'English Defense': 'Défense anglaise',
  'English Opening': 'Partie anglaise',
  'English Orangutan': 'Orang-outan anglais',
  'Englund Gambit': 'Gambit Englund',
  'Englund Gambit Declined': 'Gambit Englund refusé',
  Formation: 'Formation',
  'Four Knights Game': 'Partie des quatre cavaliers',
  'French Defense': 'Défense française',
  'Fried Fox Defense': 'Défense du renard frit',
  'Global Opening': 'Ouverture globale',
  'Goldsmith Defense': 'Défense Goldsmith',
  'Grob Opening': 'Ouverture Grob',
  'Grünfeld Defense': 'Défense Grünfeld',
  'Gunderam Defense': 'Défense Gunderam',
  'Hippopotamus Defense': 'Défense hippopotame',
  'Horwitz Defense': 'Défense Horwitz',
  'Hungarian Opening': 'Ouverture hongroise',
  'Indian Defense': 'Défense indienne',
  'Irish Gambit': 'Gambit irlandais',
  'Italian Game': 'Partie italienne',
  'Kangaroo Defense': 'Défense kangourou',
  "King's Gambit": 'Gambit du roi',
  "King's Gambit Accepted": 'Gambit du roi accepté',
  "King's Gambit Declined": 'Gambit du roi refusé',
  "King's Indian Attack": 'Attaque est-indienne',
  "King's Indian Attack, with Bf5": 'Attaque est-indienne, avec Ff5',
  "King's Indian Attack, with e6": 'Attaque est-indienne, avec e6',
  "King's Indian Defense": 'Défense est-indienne',
  "King's Knight Opening": 'Ouverture du cavalier roi',
  "King's Pawn Game": 'Début du pion roi',
  "King's Pawn Opening": 'Ouverture du pion roi',
  'Kádas Opening': 'Ouverture Kádas',
  'Lasker Simul Special': 'Spéciale de simultanée Lasker',
  'Latvian Gambit': 'Gambit letton',
  'Latvian Gambit Accepted': 'Gambit letton accepté',
  'Lemming Defense': 'Défense lemming',
  'Lion Defense': 'Défense du lion',
  'London System': 'Système de Londres',
  'London System, with Bd3': 'Système de Londres, avec Fd3',
  'London System, with Be2': 'Système de Londres, avec Fe2',
  'Marienbad System': 'Système de Marienbad',
  'Mexican Defense': 'Défense mexicaine',
  'Mieses Opening': 'Ouverture Mieses',
  'Mikenas Defense': 'Défense Mikenas',
  'Modern Defense': 'Défense moderne',
  'Montevideo Defense': 'Défense de Montevideo',
  'Neo-Grünfeld Defense': 'Défense néo-Grünfeld',
  'Nimzo-Indian Defense': 'Défense nimzo-indienne',
  'Nimzo-Larsen Attack': 'Attaque Nimzo-Larsen',
  'Nimzowitsch Defense': 'Défense Nimzowitsch',
  'Old Indian Defense': 'Défense vieille-indienne',
  'Owen Defense': 'Défense Owen',
  'Paleface Attack': 'Attaque visage pâle',
  "Petrov's Defense": 'Défense Petrov',
  'Philidor Defense': 'Défense Philidor',
  'Pirc Defense': 'Défense Pirc',
  'Polish Defense': 'Défense polonaise',
  'Polish Opening': 'Ouverture polonaise',
  'Polish Opening, with d5': 'Ouverture polonaise, avec d5',
  'Ponziani Opening': 'Ouverture Ponziani',
  'Portuguese Opening': 'Ouverture portugaise',
  "Pseudo Queen's Indian Defense": 'Pseudo-défense ouest-indienne',
  'Pterodactyl Defense': 'Défense ptérodactyle',
  "Queen's Gambit": 'Gambit dame',
  "Queen's Gambit Accepted": 'Gambit dame accepté',
  "Queen's Gambit Declined": 'Gambit dame refusé',
  "Queen's Indian Accelerated": 'Ouest-indienne accélérée',
  "Queen's Indian Defense": 'Défense ouest-indienne',
  "Queen's Indian Defense, with e3": 'Défense ouest-indienne, avec e3',
  "Queen's Indian Defense, with e3, Bb4+ Line": 'Défense ouest-indienne, avec e3 et Fb4+',
  "Queen's Pawn Game": 'Début du pion dame',
  "Queen's Pawn, Mengarini Attack": 'Pion dame, attaque Mengarini',
  'Rapport-Jobava System': 'Système Rapport-Jobava',
  'Rapport-Jobava System, with e6': 'Système Rapport-Jobava, avec e6',
  'Rat Defense': 'Défense du rat',
  'Richter-Veresov Attack': 'Attaque Richter-Veresov',
  'Robatsch Defense': 'Défense Robatsch',
  'Rubinstein Opening': 'Ouverture Rubinstein',
  'Ruy Lopez': 'Partie espagnole',
  'Réti Opening': 'Ouverture Réti',
  'Saragossa Opening': 'Ouverture de Saragosse',
  'Scandinavian Defense': 'Défense scandinave',
  'Scotch Game': 'Partie écossaise',
  'Semi-Slav Defense': 'Défense semi-slave',
  'Semi-Slav Defense Accepted': 'Défense semi-slave acceptée',
  'Sicilian Defense': 'Défense sicilienne',
  'Slav Defense': 'Défense slave',
  'Slav Indian': 'Slave-indienne',
  'Sodium Attack': 'Attaque Sodium',
  'St. George Defense': 'Défense Saint-Georges',
  'Tarrasch Defense': 'Défense Tarrasch',
  'Three Knights Opening': 'Partie des trois cavaliers',
  'Torre Attack': 'Attaque Torre',
  'Trompowsky Attack': 'Attaque Trompowsky',
  'Valencia Opening': 'Ouverture de Valence',
  'Van Geet Opening': 'Ouverture Van Geet',
  "Van't Kruijs Opening": 'Ouverture Van’t Kruijs',
  'Vienna Game': 'Partie viennoise',
  'Vienna Gambit, with Max Lange Defense': 'Gambit viennois, défense Max Lange',
  'Vulture Defense': 'Défense du vautour',
  'Wade Defense': 'Défense Wade',
  'Ware Defense': 'Défense Ware',
  'Ware Opening': 'Ouverture Ware',
  'Yusupov-Rubinstein System': 'Système Youssoupov-Rubinstein',
  'Zaire Defense': 'Défense zaïroise',
  'Zukertort Defense': 'Défense Zukertort',
  'Zukertort Opening': 'Ouverture Zukertort',
}

export const VARIATIONS = {
  // Alekhine
  'Alekhine Defense: Exchange Variation': 'Défense Alekhine, variante d’échange',
  'Alekhine Defense: Four Pawns Attack': 'Défense Alekhine, attaque des quatre pions',
  'Alekhine Defense: Modern Variation': 'Défense Alekhine, variante moderne',
  'Alekhine Defense: Scandinavian Variation': 'Défense Alekhine, variante scandinave',
  'Alekhine Defense: Two Pawns Attack': 'Défense Alekhine, attaque des deux pions',

  // Benoni
  'Benoni Defense: Czech Benoni Defense': 'Benoni tchèque',
  'Benoni Defense: Classical Variation': 'Défense Benoni, variante classique',
  'Benoni Defense: Fianchetto Variation': 'Défense Benoni, variante du fianchetto',
  'Benoni Defense: Modern Variation': 'Défense Benoni moderne',
  'Benoni Defense: Old Benoni': 'Ancienne Benoni',

  // Bishop's Opening
  "Bishop's Opening: Berlin Defense": 'Ouverture du fou, défense berlinoise',
  "Bishop's Opening: Urusov Gambit": 'Ouverture du fou, gambit Urusov',
  "Bishop's Opening: Vienna Hybrid": 'Ouverture du fou, hybride viennoise',

  // Bogo-Indian
  'Bogo-Indian Defense: Exchange Variation': 'Défense bogo-indienne, variante d’échange',
  'Bogo-Indian Defense: Grünfeld Variation': 'Défense bogo-indienne, variante Grünfeld',
  'Bogo-Indian Defense: Nimzowitsch Variation': 'Défense bogo-indienne, variante Nimzowitsch',

  // Caro-Kann
  'Caro-Kann Defense: Accelerated Panov Attack': 'Défense Caro-Kann, attaque Panov accélérée',
  'Caro-Kann Defense: Advance Variation': 'Défense Caro-Kann, variante d’avance',
  'Caro-Kann Defense: Advance Variation, Short Variation':
    'Défense Caro-Kann, variante d’avance, système Short',
  'Caro-Kann Defense: Bronstein-Larsen Variation': 'Défense Caro-Kann, variante Bronstein-Larsen',
  'Caro-Kann Defense: Classical Variation': 'Défense Caro-Kann, variante classique',
  'Caro-Kann Defense: Exchange Variation': 'Défense Caro-Kann, variante d’échange',
  'Caro-Kann Defense: Karpov Variation': 'Défense Caro-Kann, variante Karpov',
  'Caro-Kann Defense: Main Line': 'Défense Caro-Kann, ligne principale',
  'Caro-Kann Defense: Maróczy Variation': 'Défense Caro-Kann, variante Maróczy',
  'Caro-Kann Defense: Panov Attack': 'Défense Caro-Kann, attaque Panov',
  'Caro-Kann Defense: Tartakower Variation': 'Défense Caro-Kann, variante Tartakower',
  'Caro-Kann Defense: Two Knights Attack': 'Défense Caro-Kann, attaque des deux cavaliers',

  // Catalan
  'Catalan Opening: Closed': 'Catalane fermée',
  'Catalan Opening: Open Defense': 'Catalane ouverte',

  // Dutch
  'Dutch Defense: Classical Variation': 'Défense hollandaise, variante classique',
  'Dutch Defense: Leningrad Variation': 'Défense hollandaise, variante de Léningrad',
  'Dutch Defense: Staunton Gambit': 'Défense hollandaise, gambit Staunton',
  'Dutch Defense: Stonewall Variation': 'Défense hollandaise, variante Stonewall',

  // English
  'English Opening: Agincourt Defense': 'Partie anglaise, défense Agincourt',
  'English Opening: Anglo-Dutch Defense': 'Partie anglaise, défense anglo-hollandaise',
  'English Opening: Anglo-Grünfeld Defense': 'Partie anglaise, défense anglo-Grünfeld',
  'English Opening: Anglo-Indian Defense': 'Partie anglaise, défense anglo-indienne',
  'English Opening: Anglo-Indian Defense, Hedgehog System':
    'Partie anglaise, défense anglo-indienne, système hérisson',
  'English Opening: Anglo-Scandinavian Defense': 'Partie anglaise, défense anglo-scandinave',
  "English Opening: King's English Variation": 'Partie anglaise, sicilienne inversée',
  "English Opening: King's English Variation, Botvinnik System":
    'Partie anglaise, sicilienne inversée, système Botvinnik',
  'English Opening: Symmetrical Variation': 'Partie anglaise symétrique',

  // Formation
  'Formation: Hippopotamus Attack': 'Formation hippopotame',
  'Formation: Shy Attack': 'Formation timide',

  // Four Knights
  'Four Knights Game: Halloween Gambit': 'Partie des quatre cavaliers, gambit Halloween',
  'Four Knights Game: Italian Variation': 'Partie des quatre cavaliers, variante italienne',
  'Four Knights Game: Scotch Variation': 'Partie des quatre cavaliers, variante écossaise',
  'Four Knights Game: Spanish Variation': 'Partie des quatre cavaliers, variante espagnole',

  // French
  'French Defense: Advance Variation': 'Défense française, variante d’avance',
  'French Defense: Alekhine-Chatard Attack': 'Défense française, attaque Alekhine-Chatard',
  'French Defense: Classical Variation': 'Défense française, variante classique',
  'French Defense: Exchange Variation': 'Défense française, variante d’échange',
  "French Defense: King's Indian Attack": 'Défense française, attaque est-indienne',
  'French Defense: Knight Variation': 'Défense française, variante du cavalier',
  'French Defense: McCutcheon Variation': 'Défense française, variante McCutcheon',
  'French Defense: Normal Variation': 'Défense française, variante normale',
  'French Defense: Rubinstein Variation': 'Défense française, variante Rubinstein',
  'French Defense: Steinitz Variation': 'Défense française, variante Steinitz',
  'French Defense: Tarrasch Variation': 'Défense française, variante Tarrasch',
  'French Defense: Winawer Variation': 'Défense française, variante Winawer',
  'French Defense: Winawer Variation, Poisoned Pawn Variation':
    'Défense française, variante Winawer, pion empoisonné',

  // Grünfeld
  'Grünfeld Defense: Brinckmann Attack': 'Défense Grünfeld, attaque Brinckmann',
  'Grünfeld Defense: Exchange Variation': 'Défense Grünfeld, variante d’échange',
  'Grünfeld Defense: Russian Variation': 'Défense Grünfeld, variante russe',
  'Grünfeld Defense: Three Knights Variation': 'Défense Grünfeld, variante des trois cavaliers',

  // Indian
  'Indian Defense: Budapest Gambit': 'Gambit de Budapest',
  'Indian Defense: Budapest Gambit Accepted': 'Gambit de Budapest accepté',
  'Indian Defense: Knights Variation': 'Défense indienne, variante des cavaliers',
  'Indian Defense: London System': 'Défense indienne, système de Londres',
  'Indian Defense: Normal Variation': 'Défense indienne, variante normale',

  // Italian
  'Italian Game: Anti-Fried Liver Defense': 'Partie italienne, défense anti-Fegatello',
  'Italian Game: Classical Variation': 'Partie italienne, variante classique',
  'Italian Game: Evans Gambit': 'Gambit Evans',
  'Italian Game: Evans Gambit Accepted': 'Gambit Evans accepté',
  'Italian Game: Evans Gambit Declined': 'Gambit Evans refusé',
  'Italian Game: Giuoco Pianissimo': 'Partie italienne, Giuoco Pianissimo',
  'Italian Game: Giuoco Piano': 'Partie italienne, Giuoco Piano',
  'Italian Game: Hungarian Defense': 'Partie italienne, défense hongroise',
  'Italian Game: Jerome Gambit': 'Partie italienne, gambit Jérôme',
  'Italian Game: Paris Defense': 'Partie italienne, défense parisienne',
  'Italian Game: Scotch Gambit': 'Partie italienne, gambit écossais',
  'Italian Game: Scotch Gambit, Max Lange Attack': 'Partie italienne, attaque Max Lange',
  'Italian Game: Two Knights Defense': 'Partie italienne, défense des deux cavaliers',
  'Italian Game: Two Knights Defense, Fried Liver Attack':
    'Partie italienne, défense des deux cavaliers, attaque Fegatello',
  'Italian Game: Two Knights Defense, Knight Attack':
    'Partie italienne, défense des deux cavaliers, attaque du cavalier',
  'Italian Game: Two Knights Defense, Max Lange Attack': 'Partie italienne, attaque Max Lange',
  'Italian Game: Two Knights Defense, Traxler Counterattack':
    'Partie italienne, défense des deux cavaliers, contre-attaque Traxler',

  // King's Gambit
  "King's Gambit Accepted: Allgaier Gambit": 'Gambit du roi accepté, gambit Allgaier',
  "King's Gambit Accepted: Bishop's Gambit": 'Gambit du roi accepté, gambit du fou',
  "King's Gambit Accepted: Cunningham Defense": 'Gambit du roi accepté, défense Cunningham',
  "King's Gambit Accepted: Fischer Defense": 'Gambit du roi accepté, défense Fischer',
  "King's Gambit Accepted: Kieseritzky Gambit": 'Gambit du roi accepté, gambit Kieseritzky',
  "King's Gambit Accepted: Modern Defense": 'Gambit du roi accepté, défense moderne',
  "King's Gambit Accepted: Schallopp Defense": 'Gambit du roi accepté, défense Schallopp',
  "King's Gambit Declined: Classical Variation": 'Gambit du roi refusé, variante classique',
  "King's Gambit Declined: Falkbeer Countergambit": 'Contre-gambit Falkbeer',

  // King's Indian
  "King's Indian Defense: Averbakh Variation": 'Défense est-indienne, variante Averbakh',
  "King's Indian Defense: Exchange Variation": 'Défense est-indienne, variante d’échange',
  "King's Indian Defense: Fianchetto Variation": 'Défense est-indienne, variante du fianchetto',
  "King's Indian Defense: Four Pawns Attack": 'Défense est-indienne, attaque des quatre pions',
  "King's Indian Defense: Makogonov Variation": 'Défense est-indienne, variante Makogonov',
  "King's Indian Defense: Normal Variation": 'Défense est-indienne, variante normale',
  "King's Indian Defense: Orthodox Variation": 'Défense est-indienne, variante orthodoxe',
  "King's Indian Defense: Petrosian Variation": 'Défense est-indienne, variante Petrossian',
  "King's Indian Defense: Smyslov Variation": 'Défense est-indienne, variante Smyslov',
  "King's Indian Defense: Sämisch Variation": 'Défense est-indienne, variante Sämisch',

  // King's Pawn Game
  "King's Pawn Game: Alapin Opening": 'Début du pion roi, ouverture Alapin',
  "King's Pawn Game: Damiano Defense": 'Début du pion roi, défense Damiano',
  "King's Pawn Game: McConnell Defense": 'Début du pion roi, défense McConnell',
  "King's Pawn Game: Napoleon Attack": 'Début du pion roi, attaque Napoléon',
  "King's Pawn Game: Wayward Queen Attack": 'Début du pion roi, sortie prématurée de la dame',

  // London
  'London System: Poisoned Pawn Variation': 'Système de Londres, pion empoisonné',

  // Modern
  'Modern Defense: Bishop Attack': 'Défense moderne, attaque du fou',
  'Modern Defense: Pseudo-Austrian Attack': 'Défense moderne, attaque pseudo-autrichienne',
  'Modern Defense: Standard Defense': 'Défense moderne, défense standard',
  'Modern Defense: Three Pawns Attack': 'Défense moderne, attaque des trois pions',
  'Modern Defense: Two Knights Variation': 'Défense moderne, variante des deux cavaliers',

  // Nimzo-Indian
  'Nimzo-Indian Defense: Classical Variation': 'Défense nimzo-indienne, variante classique',
  'Nimzo-Indian Defense: Leningrad Variation': 'Défense nimzo-indienne, variante de Léningrad',
  'Nimzo-Indian Defense: Normal Variation': 'Défense nimzo-indienne, variante normale',
  'Nimzo-Indian Defense: Rubinstein System': 'Défense nimzo-indienne, système Rubinstein',
  'Nimzo-Indian Defense: Spielmann Variation': 'Défense nimzo-indienne, variante Spielmann',
  'Nimzo-Indian Defense: Sämisch Variation': 'Défense nimzo-indienne, variante Sämisch',
  'Nimzo-Indian Defense: Three Knights Variation':
    'Défense nimzo-indienne, variante des trois cavaliers',

  // Nimzowitsch
  'Nimzowitsch Defense: Declined Variation': 'Défense Nimzowitsch, variante refusée',
  'Nimzowitsch Defense: Kennedy Variation': 'Défense Nimzowitsch, variante Kennedy',
  'Nimzowitsch Defense: Scandinavian Variation': 'Défense Nimzowitsch, variante scandinave',

  // Petrov
  "Petrov's Defense: Classical Attack": 'Défense Petrov, attaque classique',
  "Petrov's Defense: Cochrane Gambit": 'Défense Petrov, gambit Cochrane',
  "Petrov's Defense: Italian Variation": 'Défense Petrov, variante italienne',
  "Petrov's Defense: Modern Attack": 'Défense Petrov, attaque moderne',
  "Petrov's Defense: Nimzowitsch Attack": 'Défense Petrov, attaque Nimzowitsch',
  "Petrov's Defense: Stafford Gambit": 'Défense Petrov, gambit Stafford',
  "Petrov's Defense: Three Knights Game": 'Défense Petrov, partie des trois cavaliers',

  // Philidor
  'Philidor Defense: Exchange Variation': 'Défense Philidor, variante d’échange',
  'Philidor Defense: Hanham Variation': 'Défense Philidor, variante Hanham',
  'Philidor Defense: Larsen Variation': 'Défense Philidor, variante Larsen',
  'Philidor Defense: Lion Variation': 'Défense Philidor, variante du lion',
  'Philidor Defense: Philidor Countergambit': 'Défense Philidor, contre-gambit Philidor',

  // Pirc
  'Pirc Defense: 150 Attack': 'Défense Pirc, attaque 150',
  'Pirc Defense: Austrian Attack': 'Défense Pirc, attaque autrichienne',
  'Pirc Defense: Byrne Variation': 'Défense Pirc, variante Byrne',
  'Pirc Defense: Classical Variation': 'Défense Pirc, variante classique',

  // Queen's Gambit Accepted
  "Queen's Gambit Accepted: Alekhine Defense": 'Gambit dame accepté, défense Alekhine',
  "Queen's Gambit Accepted: Classical Defense": 'Gambit dame accepté, défense classique',
  "Queen's Gambit Accepted: Normal Variation": 'Gambit dame accepté, variante normale',
  "Queen's Gambit Accepted: Old Variation": 'Gambit dame accepté, ancienne variante',
  "Queen's Gambit Accepted: Showalter Variation": 'Gambit dame accepté, variante Showalter',

  // Queen's Gambit Declined
  "Queen's Gambit Declined: Albin Countergambit": 'Contre-gambit Albin',
  "Queen's Gambit Declined: Alapin Variation": 'Gambit dame refusé, variante Alapin',
  "Queen's Gambit Declined: Baltic Defense": 'Gambit dame refusé, défense balte',
  "Queen's Gambit Declined: Cambridge Springs Defense":
    'Gambit dame refusé, défense Cambridge Springs',
  "Queen's Gambit Declined: Chigorin Defense": 'Défense Tchigorine',
  "Queen's Gambit Declined: Exchange Variation": 'Gambit dame refusé, variante d’échange',
  "Queen's Gambit Declined: Harrwitz Attack": 'Gambit dame refusé, attaque Harrwitz',
  "Queen's Gambit Declined: Lasker Defense": 'Gambit dame refusé, défense Lasker',
  "Queen's Gambit Declined: Marshall Defense": 'Gambit dame refusé, défense Marshall',
  "Queen's Gambit Declined: Normal Defense": 'Gambit dame refusé, défense normale',
  "Queen's Gambit Declined: Orthodox Defense": 'Gambit dame refusé, défense orthodoxe',
  "Queen's Gambit Declined: Ragozin Defense": 'Gambit dame refusé, défense Ragozine',
  "Queen's Gambit Declined: Semi-Tarrasch Defense": 'Gambit dame refusé, défense semi-Tarrasch',
  "Queen's Gambit Declined: Tarrasch Defense": 'Gambit dame refusé, défense Tarrasch',
  "Queen's Gambit Declined: Tartakower Defense": 'Gambit dame refusé, défense Tartakower',
  "Queen's Gambit Declined: Three Knights Variation":
    'Gambit dame refusé, variante des trois cavaliers',
  "Queen's Gambit Declined: Vienna Variation": 'Gambit dame refusé, variante de Vienne',

  // Queen's Indian
  "Queen's Indian Defense: Classical Variation": 'Défense ouest-indienne, variante classique',
  "Queen's Indian Defense: Fianchetto Variation": 'Défense ouest-indienne, variante du fianchetto',
  "Queen's Indian Defense: Kasparov Variation": 'Défense ouest-indienne, variante Kasparov',
  "Queen's Indian Defense: Petrosian Variation": 'Défense ouest-indienne, variante Petrossian',
  "Queen's Indian Defense: Spassky System": 'Défense ouest-indienne, système Spassky',

  // Queen's Pawn Game
  "Queen's Pawn Game: Accelerated London System": 'Système de Londres accéléré',
  "Queen's Pawn Game: Barry Attack": 'Début du pion dame, attaque Barry',
  "Queen's Pawn Game: Chigorin Variation": 'Début du pion dame, variante Tchigorine',
  "Queen's Pawn Game: Colle System": 'Système Colle',
  "Queen's Pawn Game: Levitsky Attack": 'Début du pion dame, attaque Levitsky',
  "Queen's Pawn Game: London System": 'Système de Londres',
  "Queen's Pawn Game: Modern Defense": 'Début du pion dame, défense moderne',
  "Queen's Pawn Game: Stonewall Attack": 'Début du pion dame, attaque Stonewall',
  "Queen's Pawn Game: Symmetrical Variation": 'Début du pion dame, variante symétrique',
  "Queen's Pawn Game: Torre Attack": 'Attaque Torre',
  "Queen's Pawn Game: Zukertort Variation": 'Début du pion dame, variante Zukertort',

  // Ruy Lopez
  'Ruy Lopez: Berlin Defense': 'Partie espagnole, défense berlinoise',
  "Ruy Lopez: Berlin Defense, l'Hermet Variation, Berlin Wall Defense":
    'Partie espagnole, défense berlinoise, mur de Berlin',
  'Ruy Lopez: Bird Variation': 'Partie espagnole, variante Bird',
  'Ruy Lopez: Classical Variation': 'Partie espagnole, variante classique',
  'Ruy Lopez: Closed': 'Partie espagnole fermée',
  'Ruy Lopez: Closed, Breyer Defense': 'Partie espagnole fermée, défense Breyer',
  'Ruy Lopez: Closed, Chigorin Defense': 'Partie espagnole fermée, défense Tchigorine',
  'Ruy Lopez: Closed, Zaitsev System': 'Partie espagnole fermée, système Zaïtsev',
  'Ruy Lopez: Cozio Defense': 'Partie espagnole, défense Cozio',
  'Ruy Lopez: Exchange Variation': 'Partie espagnole, variante d’échange',
  'Ruy Lopez: Fianchetto Defense': 'Partie espagnole, défense en fianchetto',
  'Ruy Lopez: Marshall Attack': 'Partie espagnole, attaque Marshall',
  'Ruy Lopez: Morphy Defense': 'Partie espagnole, défense Morphy',
  'Ruy Lopez: Open': 'Partie espagnole ouverte',
  'Ruy Lopez: Schliemann Defense': 'Partie espagnole, défense Schliemann',
  'Ruy Lopez: Steinitz Defense': 'Partie espagnole, défense Steinitz',

  // Réti
  'Réti Opening: Advance Variation': 'Ouverture Réti, variante d’avance',
  'Réti Opening: Réti Accepted': 'Ouverture Réti acceptée',

  // Scandinavian
  'Scandinavian Defense: Classical Variation': 'Défense scandinave, variante classique',
  'Scandinavian Defense: Icelandic-Palme Gambit': 'Défense scandinave, gambit islandais',
  'Scandinavian Defense: Main Line': 'Défense scandinave, ligne principale',
  'Scandinavian Defense: Marshall Variation': 'Défense scandinave, variante Marshall',
  'Scandinavian Defense: Modern Variation': 'Défense scandinave, variante moderne',
  'Scandinavian Defense: Portuguese Gambit': 'Défense scandinave, gambit portugais',

  // Scotch
  'Scotch Game: Classical Variation': 'Partie écossaise, variante classique',
  'Scotch Game: Göring Gambit': 'Partie écossaise, gambit Göring',
  'Scotch Game: Mieses Variation': 'Partie écossaise, variante Mieses',
  'Scotch Game: Scotch Gambit': 'Gambit écossais',
  'Scotch Game: Steinitz Variation': 'Partie écossaise, variante Steinitz',

  // Semi-Slav
  'Semi-Slav Defense: Botvinnik Variation': 'Défense semi-slave, variante Botvinnik',
  'Semi-Slav Defense: Main Line': 'Défense semi-slave, ligne principale',
  'Semi-Slav Defense: Marshall Gambit': 'Défense semi-slave, gambit Marshall',
  'Semi-Slav Defense: Meran Variation': 'Défense semi-slave, variante de Meran',
  'Semi-Slav Defense: Moscow Variation': 'Défense semi-slave, variante de Moscou',
  'Semi-Slav Defense: Noteboom Variation': 'Défense semi-slave, variante Noteboom',
  'Semi-Slav Defense: Normal Variation': 'Défense semi-slave, variante normale',
  'Semi-Slav Defense: Semi-Meran Variation': 'Défense semi-slave, variante semi-Meran',

  // Sicilian
  'Sicilian Defense: Accelerated Dragon': 'Défense sicilienne, Dragon accéléré',
  'Sicilian Defense: Accelerated Dragon, Maróczy Bind':
    'Défense sicilienne, Dragon accéléré, étau Maróczy',
  'Sicilian Defense: Alapin Variation': 'Défense sicilienne, variante Alapin',
  'Sicilian Defense: Classical Variation': 'Défense sicilienne, variante classique',
  'Sicilian Defense: Closed': 'Défense sicilienne fermée',
  'Sicilian Defense: Dragon Variation': 'Défense sicilienne, variante du Dragon',
  'Sicilian Defense: Dragon Variation, Yugoslav Attack':
    'Défense sicilienne, variante du Dragon, attaque yougoslave',
  'Sicilian Defense: Four Knights Variation': 'Défense sicilienne, variante des quatre cavaliers',
  'Sicilian Defense: Grand Prix Attack': 'Défense sicilienne, attaque Grand Prix',
  'Sicilian Defense: Hyperaccelerated Dragon': 'Défense sicilienne, Dragon hyper-accéléré',
  'Sicilian Defense: Kalashnikov Variation': 'Défense sicilienne, variante Kalachnikov',
  'Sicilian Defense: Kan Variation': 'Défense sicilienne, variante Kan',
  'Sicilian Defense: Lasker-Pelikan Variation': 'Défense sicilienne, variante Lasker-Pelikan',
  'Sicilian Defense: Lasker-Pelikan Variation, Sveshnikov Variation':
    'Défense sicilienne, variante Svechnikov',
  'Sicilian Defense: Löwenthal Variation': 'Défense sicilienne, variante Löwenthal',
  'Sicilian Defense: Moscow Variation': 'Défense sicilienne, variante de Moscou',
  'Sicilian Defense: Najdorf Variation': 'Défense sicilienne, variante Najdorf',
  'Sicilian Defense: Najdorf Variation, English Attack':
    'Défense sicilienne, variante Najdorf, attaque anglaise',
  'Sicilian Defense: Najdorf Variation, Poisoned Pawn Variation':
    'Défense sicilienne, variante Najdorf, pion empoisonné',
  'Sicilian Defense: Nimzowitsch Variation': 'Défense sicilienne, variante Nimzowitsch',
  'Sicilian Defense: Nyezhmetdinov-Rossolimo Attack': 'Défense sicilienne, attaque Rossolimo',
  "Sicilian Defense: O'Kelly Variation": 'Défense sicilienne, variante O’Kelly',
  'Sicilian Defense: Old Sicilian': 'Ancienne sicilienne',
  'Sicilian Defense: Open': 'Défense sicilienne ouverte',
  'Sicilian Defense: Richter-Rauzer Variation': 'Défense sicilienne, variante Richter-Rauzer',
  'Sicilian Defense: Scheveningen Variation': 'Défense sicilienne, variante Scheveningen',
  'Sicilian Defense: Smith-Morra Gambit': 'Défense sicilienne, gambit Smith-Morra',
  'Sicilian Defense: Smith-Morra Gambit Accepted': 'Défense sicilienne, gambit Smith-Morra accepté',
  'Sicilian Defense: Sozin Attack': 'Défense sicilienne, attaque Sozine',
  'Sicilian Defense: Taimanov Variation': 'Défense sicilienne, variante Taïmanov',
  'Sicilian Defense: Wing Gambit': 'Défense sicilienne, gambit de l’aile',

  // Slav
  'Slav Defense: Alekhine Variation': 'Défense slave, variante Alekhine',
  'Slav Defense: Chebanenko Variation': 'Défense slave, variante Chebanenko',
  'Slav Defense: Czech Variation': 'Défense slave, variante tchèque',
  'Slav Defense: Exchange Variation': 'Défense slave, variante d’échange',
  'Slav Defense: Modern Line': 'Défense slave, ligne moderne',
  'Slav Defense: Quiet Variation': 'Défense slave, variante tranquille',
  'Slav Defense: Three Knights Variation': 'Défense slave, variante des trois cavaliers',
  'Slav Defense: Two Knights Attack': 'Défense slave, attaque des deux cavaliers',

  // Tarrasch
  'Tarrasch Defense: Classical Variation': 'Défense Tarrasch, variante classique',
  'Tarrasch Defense: Prague Variation': 'Défense Tarrasch, variante de Prague',
  'Tarrasch Defense: Swedish Variation': 'Défense Tarrasch, variante suédoise',
  'Tarrasch Defense: Symmetrical Variation': 'Défense Tarrasch, variante symétrique',
  'Tarrasch Defense: Tarrasch Gambit': 'Défense Tarrasch, gambit Tarrasch',
  'Tarrasch Defense: Two Knights Variation': 'Défense Tarrasch, variante des deux cavaliers',

  // Trompowsky
  'Trompowsky Attack: Classical Defense': 'Attaque Trompowsky, défense classique',
  'Trompowsky Attack: Edge Variation': 'Attaque Trompowsky, variante du bord',
  'Trompowsky Attack: Poisoned Pawn Variation': 'Attaque Trompowsky, pion empoisonné',
  'Trompowsky Attack: Raptor Variation': 'Attaque Trompowsky, variante Raptor',

  // Vienna
  'Vienna Game: Falkbeer Variation': 'Partie viennoise, variante Falkbeer',
  'Vienna Game: Frankenstein-Dracula Variation': 'Partie viennoise, variante Frankenstein-Dracula',
  'Vienna Game: Max Lange Defense': 'Partie viennoise, défense Max Lange',
  'Vienna Game: Mieses Variation': 'Partie viennoise, variante Mieses',
  'Vienna Game: Stanley Variation': 'Partie viennoise, variante Stanley',
  'Vienna Game: Vienna Gambit': 'Gambit viennois',

  // Zukertort
  'Zukertort Opening: Dutch Variation': 'Ouverture Zukertort, variante hollandaise',
  'Zukertort Opening: Kingside Fianchetto': 'Ouverture Zukertort, fianchetto roi',
  'Zukertort Opening: Queenside Fianchetto Variation': 'Ouverture Zukertort, fianchetto dame',
  "Zukertort Opening: Queen's Gambit Invitation": 'Ouverture Zukertort, invitation au gambit dame',
  'Zukertort Opening: Reversed Grünfeld': 'Ouverture Zukertort, Grünfeld inversée',
  'Zukertort Opening: Sicilian Invitation': 'Ouverture Zukertort, invitation sicilienne',
  'Zukertort Opening: Slav Invitation': 'Ouverture Zukertort, invitation slave',
}
