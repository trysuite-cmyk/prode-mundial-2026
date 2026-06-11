export interface Player {
  name: string;
  country: string;
  isArquero: boolean;
}

// 48 official selections in matches
export const OFFICIAL_COUNTRIES = [
  "Alemania", "Arabia Saudita", "Argelia", "Argentina", "Australia", "Austria",
  "Bosnia", "Brasil", "Bélgica", "Cabo Verde", "Canadá", "Chequia",
  "Colombia", "Corea del Sur", "Costa de Marfil", "Croacia", "Curazao", "EE.UU.",
  "Ecuador", "Egipto", "Escocia", "España", "Francia", "Ghana", "Haití",
  "Inglaterra", "Irak", "Irán", "Japón", "Jordania", "Marruecos", "México",
  "Noruega", "Nueva Zelanda", "Panamá", "Paraguay", "Países Bajos", "Portugal",
  "Qatar", "R.D. Congo", "Senegal", "Sudáfrica", "Suecia", "Suiza",
  "Turquía", "Túnez", "Uruguay", "Uzbekistán"
].sort();

// Detailed mapping of cultural naming systems per country
const CULTURAL_GROUPS: Record<string, { firstNames: string[]; lastNames: string[]; culture: string }> = {
  // Hispanic
  "Argentina": {
    firstNames: ["Lionel", "Lautaro", "Julián", "Angel", "Rodrigo", "Enzo", "Alexis", "Nicolás", "Cristian", "Nahuel", "Marcos", "Gonzalo", "Leandro", "Giovani", "Exequiel", "Paulo", "Alejandro", "Guido", "Lisandro", "Franco", "Gerónimo", "Juan", "Lucas"],
    lastNames: ["Messi", "Martínez", "Álvarez", "Di María", "De Paul", "Fernández", "Mac Allister", "Otamendi", "Romero", "Molina", "Tagliafico", "Acuña", "Montiel", "Pezzella", "Paredes", "Lo Celso", "Palacios", "Correa", "Dybala", "Gómez", "Armani", "Rulli", "Foyth"],
    culture: "spanish"
  },
  "España": {
    firstNames: ["Lamine", "Alvaro", "Pedri", "Gavi", "Dani", "Nico", "Ferran", "Aymeric", "Robin", "Alejandro", "Unai", "David", "Kepa", "Martin", "Mikel", "Marc", "Gerard", "Iago", "Rodri", "Jesus", "Joselu"],
    lastNames: ["Yamal", "Morata", "González", "Páez", "Carvajal", "Williams", "Torres", "Laporte", "Le Normand", "Balde", "Simón", "Raya", "Arrizabalaga", "Zubimendi", "Merino", "Cucurella", "Moreno", "Aspas", "Hernández", "Navas", "Sanmartín"],
    culture: "spanish"
  },
  "México": {
    firstNames: ["Guillermo", "Luis", "Santiago", "Edson", "Hirving", "Orbelín", "Uriel", "Henry", "César", "Johan", "Jorge", "Jesús", "Erick", "Alexis", "Gerardo", "Kevin", "Luis", "Carlos", "Javier", "Raúl"],
    lastNames: ["Ochoa", "Malagón", "Giménez", "Álvarez", "Lozano", "Pineda", "Antuna", "Martín", "Montes", "Vásquez", "Sánchez", "Gallardo", "Chávez", "Vega", "Arteaga", "Álvarez", "Romo", "Vela", "Hernández", "Jiménez"],
    culture: "spanish"
  },
  "Colombia": {
    firstNames: ["Luis", "James", "Jhon", "Jefferson", "Mateus", "Richard", "Kevin", "Davinson", "Carlos", "Daniel", "Yerry", "Luis", "Santiago", "Camilo", "David", "Álvaro", "Juan", "Wilmar", "Rafael"],
    lastNames: ["Díaz", "Rodríguez", "Arias", "Lerma", "Uribe", "Ríos", "Castaño", "Sánchez", "Cuesta", "Munoz", "Mina", "Sinisterra", "Gómez", "Vargas", "Ospina", "Montero", "Cuadrado", "Barrios", "Borré"],
    culture: "spanish"
  },
  "Uruguay": {
    firstNames: ["Darwin", "Federico", "Ronald", "Luis", "Jose", "Manuel", "Sergio", "Facundo", "Maximiliano", "Rodrigo", "Mathías", "Nahitan", "Sebastián", "Sergio", "Santiago", "Nicolás", "Giorgian", "Brian"],
    lastNames: ["Núñez", "Valverde", "Araújo", "Suárez", "Giménez", "Ugarte", "Rochet", "Pellistri", "Araújo", "Bentancur", "Olivera", "Nández", "Cáceres", "Mele", "Bueno", "De la Cruz", "De Arrascaeta", "Rodríguez"],
    culture: "spanish"
  },
  "Ecuador": {
    firstNames: ["Moisés", "Enner", "Piero", "Félix", "Willian", "Kendry", "Angelo", "Carlos", "Hernán", "Alexander", "Pervis", "José", "Alan", "Jordi", "Kevin", "Leonardo", "Robert", "Angel", "Gonzalo"],
    lastNames: ["Caicedo", "Valencia", "Hincapié", "Torres", "Pacho", "Páez", "Preciado", "Gruezo", "Galíndez", "Domínguez", "Estupiñán", "Cifuentes", "Franco", "Caicedo", "Rodríguez", "Campana", "Arboleda", "Mena", "Plata"],
    culture: "spanish"
  },
  "Panamá": {
    firstNames: ["Adalberto", "Michael", "Ismael", "José", "Aníbal", "Fidel", "Éric", "Orlando", "César", "Andrés", "Luis", "Cecilio", "Alberto", "Edgar", "Harold", "Roderick", "Yoel", "Iván"],
    lastNames: ["Carrasquilla", "Amir", "Díaz", "Fajardo", "Córdoba", "Goyles", "Davis", "Mosquera", "Blackman", "Andrade", "Mejía", "Waterman", "Quintero", "Bárcenas", "Cummings", "Miller", "Bárcenas", "Garrido"],
    culture: "spanish"
  },
  "Paraguay": {
    firstNames: ["Miguel", "Julio", "Tony", "Fabián", "Gustavo", "Omar", "Junior", "Mathías", "Richard", "Iván", "Carlos", "Damián", "Santiago", "Ramón", "Ángel", "Derlis", "Adam", "Matías"],
    lastNames: ["Almirón", "Enciso", "Sanabria", "Balbuena", "Gómez", "Alderete", "Alonso", "Villasanti", "Sánchez", "Ramírez", "González", "Bobadilla", "Arzamendia", "Sosa", "Romero", "González", "Bareiro", "Rojas"],
    culture: "spanish"
  },
  "Curazao": {
    firstNames: ["Juninho", "Leandro", "Cuco", "Eloy", "Rangelo", "Gervane", "Kenji", "Vurnon", "Brandley", "Juriën", "Roshon", "Gevaro", "Shermaine", "Jeremy", "Anthony", "Godfried", "Kevin", "Charlison"],
    lastNames: ["Bacuna", "Jananga", "Martina", "Room", "Janga", "Kastaneer", "Gorré", "Anita", "Kuwas", "Gaari", "van Eijma", "Nepomuceno", "Martina", "de Nooijer", "Lachman", "Roemeratoe", "Sambo", "Benschop"],
    culture: "spanish"
  },
  "Haití": {
    firstNames: ["Frantzdy", "Duckens", "Derrick", "Carlens", "Danley", "Leverton", "Garven", "Ricardo", "Alex", "Bryan", "Johnny", "Mundell", "Stephane", "Jean", "Wilder", "Sony", "Kervens", "Belfort"],
    lastNames: ["Pierrot", "Nazon", "Etienne", "Arcus", "Jean", "Pierre", "Metusala", "Adé", "Christian", "Alceus", "Placide", "Duverger", "Lambese", "Guerrier", "Donald", "Mustivar", "Belfort", "Fils-Aimé"],
    culture: "french"
  },

  // Portuguese / Brazilian
  "Brasil": {
    firstNames: ["Vinícius", "Rodrygo", "Neymar", "Raphinha", "Richarlison", "Endrick", "Gabriel", "Bruno", "Lucas", "Casemiro", "Alisson", "Ederson", "Bento", "Marquinhos", "Éder", "Danilo", "Guilherme", "Andreas", "Douglas", "João", "Sávio"],
    lastNames: ["Júnior", "Goes", "Silva", "Dias", "Andrade", "Felipe", "Magalhães", "Guimarães", "Paquetá", "Casemiro", "Becker", "Moraes", "Matheus", "Marquinhos", "Militão", "Danilo", "Arana", "Pereira", "Luiz", "Gomes", "Moreira"],
    culture: "brazilian"
  },
  "Portugal": {
    firstNames: ["Cristiano", "Bernardo", "Bruno", "João", "Diogo", "Rafael", "Gonçalo", "Ruben", "Nuno", "Nelson", "Pedro", "Francisco", "Otávio", "Vitinha", "Matheus", "Danilo", "Pepe", "José", "Rui", "Antonio"],
    lastNames: ["Ronaldo", "Silva", "Fernandes", "Felix", "Jota", "Leão", "Ramos", "Dias", "Mendes", "Semedo", "Neto", "Conceição", "Monteiro", "Ferreira", "Nunes", "Pereira", "Sanches", "Sá", "Patrício", "Silva"],
    culture: "portuguese"
  },
  "Cabo Verde": {
    firstNames: ["Ryan", "Garry", "Bebé", "Jamiro", "Kenny", "Willy", "Patrick", "Pico", "Logan", "Dylan", "Vozinha", "Márcio", "Héldon", "Djaniny", "Kuca", "Platini", "Marco", "Nuno", "Claudio", "Steven"],
    lastNames: ["Mendes", "Rodrigues", "Tiago", "Monteiro", "Rocha", "Semedo", "Andrade", "Lopes", "Costa", "Tavares", "Rosa", "Evora", "Ramos", "Soares", "Miranda", "Gomes", "Cardoso", "Borges", "Cabral", "Fortes"],
    culture: "portuguese"
  },

  // Anglo-Saxon
  "Inglaterra": {
    firstNames: ["Harry", "Jude", "Phil", "Bukayo", "Declan", "Cole", "Ollie", "Marcus", "Jack", "Trent", "John", "Kyle", "Jordan", "Jordan", "Aaron", "Kieran", "Marc", "Levi", "Conor", "Kobbie", "Jarrod"],
    lastNames: ["Kane", "Bellingham", "Foden", "Saka", "Rice", "Palmer", "Watkins", "Rashford", "Grealish", "Alexander-Arnold", "Stones", "Walker", "Pickford", "Henderson", "Ramsdale", "Trippier", "Guéhi", "Colwill", "Gallagher", "Mainoo", "Bowen"],
    culture: "english"
  },
  "EE.UU.": {
    firstNames: ["Christian", "Weston", "Timothy", "Yunus", "Tyler", "Folarin", "Brenden", "Antonee", "Sergiño", "Chris", "Miles", "Walker", "Matt", "Ethan", "Drake", "Luca", "Malik", "Ricardo", "Johnny"],
    lastNames: ["Pulisic", "McKennie", "Weah", "Musah", "Adams", "Balogun", "Aaronson", "Robinson", "Dest", "Richards", "Robinson", "Zimmerman", "Turner", "Horvath", "Callender", "de la Torre", "Tillman", "Pepi", "Cardoso"],
    culture: "english"
  },
  "Escocia": {
    firstNames: ["Scott", "Andrew", "John", "Billy", "Che", "Lyndon", "Ryan", "Lewis", "Callum", "Kieran", "Jack", "Grant", "Angus", "Zander", "Liam", "Nathan", "Ryan", "Stuart", "Kenny", "Lawrence"],
    lastNames: ["McTominay", "Robertson", "McGinn", "Gilmour", "Adams", "Dykes", "Christie", "Ferguson", "McGregor", "Tierney", "Hendry", "Hanley", "Gunn", "Clark", "Cooper", "Patterson", "Porteous", "Armstrong", "McLean", "Shankland"],
    culture: "english"
  },
  "Australia": {
    firstNames: ["Mathew", "Jackson", "Harry", "Mitch", "Keanu", "Connor", "Martin", "Craig", "Ajdin", "Awer", "Kye", "Cameron", "Joe", "Thomas", "Paul", "Bruno", "Jordan", "Riley", "Alessandro"],
    lastNames: ["Ryan", "Irvine", "Souttar", "Duke", "Baccus", "Metcalfe", "Boyle", "Goodwin", "Hrustic", "Mabil", "Rowles", "Burgess", "Gauci", "Glover", "Izzo", "Fornaroli", "Bos", "McGree", "Circati"],
    culture: "english"
  },
  "Canadá": {
    firstNames: ["Alphonso", "Jonathan", "Cyle", "Tajon", "Stephen", "Ismaël", "Samuel", "Alistair", "Kamal", "Moïse", "Liam", "Derek", "Maxime", "Dayne", "Thomas", "Jacob", "Junior", "Richie", "Joel"],
    lastNames: ["Davies", "David", "Larin", "Buchanan", "Eustáquio", "Koné", "Piette", "Johnston", "Miller", "Bombito", "Millar", "Cornelius", "Crépeau", "St. Clair", "McGill", "Shaffelburg", "Hoilett", "Laryea", "Waterman"],
    culture: "english"
  },
  "Nueva Zelanda": {
    firstNames: ["Chris", "Liberato", "Sarpreet", "Matt", "Michael", "Joe", "Kosta", "Alex", "Ben", "Tyler", "Tommy", "Nando", "Oliver", "Max", "Alex", "Callum", "Eli", "Sam", "Marco"],
    lastNames: ["Wood", "Cacace", "Singh", "Garbett", "Boxall", "Bell", "Barbarouses", "Rufer", "Waine", "Bindon", "Smith", "Pijnaker", "Sail", "Crocombe", "Paulsen", "McCowatt", "Just", "Sutton", "Stamenic"],
    culture: "english"
  },
  "Sudáfrica": {
    firstNames: ["Percy", "Themba", "Teboho", "Sphephelo", "Aubrey", "Mothobi", "Khuliso", "Grant", "Ronwen", "Veli", "Ricardo", "Nyiko", "Terrence", "Evidence", "Thapelo", "Zakhele", "Iqraam", "Oswin"],
    lastNames: ["Tau", "Zwane", "Mokoena", "Sithole", "Modiba", "Mvala", "Mudau", "Kekana", "Williams", "Mothwa", "Goss", "Mobbie", "Mashego", "Makgopa", "Morena", "Lepasa", "Rayners", "Appollis"],
    culture: "english"
  },

  // French / Francophone
  "Francia": {
    firstNames: ["Kylian", "Antoine", "Olivier", "Ousmane", "Kingsley", "Marcus", "Randal", "Aurélien", "Eduardo", "Youssouf", "Warren", "Adrien", "William", "Ibrahima", "Dayot", "Theo", "Benjamin", "Lucas", "Mike", "Alphonse", "Brice"],
    lastNames: ["Mbappé", "Griezmann", "Giroud", "Dembélé", "Coman", "Thuram", "Kolo Muani", "Tchouaméni", "Camavinga", "Fofana", "Zaïre-Emery", "Rabiot", "Saliba", "Konaté", "Upamecano", "Hernandez", "Pavard", "Hernandez", "Maignan", "Areola", "Samba"],
    culture: "french"
  },
  "Costa de Marfil": {
    firstNames: ["Sébastien", "Simon", "Karim", "Willy", "Franck", "Seko", "Ibrahim", "Max", "Evan", "Ousmane", "Odilon", "Wilfried", "Yahia", "Charles", "Jean", "Nicolas", "Christian", "Amad", "Oumar"],
    lastNames: ["Haller", "Adingra", "Konaté", "Boly", "Kessié", "Fofana", "Sangaré", "Gradel", "Ndicka", "Diomandé", "Kossounou", "Singom", "Fofana", "Gboho", "Krasso", "Pépé", "Kouamé", "Diallo", "Diakité"],
    culture: "french"
  },
  "Senegal": {
    firstNames: ["Sadio", "Nicolas", "Ismaïla", "Boulaye", "Pape", "Idrissa", "Cheikhou", "Lamine", "Koulibaly", "Moussa", "Abdou", "Edouard", "Alfred", "Mory", "Iliman", "Habib", "Nampalys", "Krépin"],
    lastNames: ["Mané", "Jackson", "Sarr", "Dia", "Gueye", "Gueye", "Kouyaté", "Camara", "Kalidou", "Niakhaté", "Diallo", "Mendy", "Gomis", "Diaw", "Ndiaye", "Diallo", "Mendy", "Diatta"],
    culture: "french"
  },
  "Bélgica": {
    firstNames: ["Kevin", "Romelu", "Leandro", "Jeremy", "Amadou", "Orel", "Arthur", "Timothy", "Wout", "Zeno", "Thibaut", "Matz", "Thomas", "Yannick", "Dodi", "Charles", "Johan", "Arthur", "Jan"],
    lastNames: ["De Bruyne", "Lukaku", "Trossard", "Doku", "Onana", "Mangala", "Theate", "Castagne", "Faes", "Debast", "Courtois", "Sels", "Kaminski", "Carrasco", "Lukebakio", "De Ketelaere", "Bakayoko", "Vermeeren", "Vertonghen"],
    culture: "french"
  },
  "R.D. Congo": {
    firstNames: ["Yoane", "Cédric", "Meschack", "Theo", "Samuel", "Charles", "Aaron", "Gael", "Chancel", "Dylan", "Arthur", "Lionel", "Dimitry", "Guillaume", "Siadi", "Fiston", "Merveille", "Silas"],
    lastNames: ["Wissa", "Bakambu", "Elia", "Bongonda", "Moutoussamy", "Pickel", "Tshibola", "Kakuta", "Mbemba", "Batubinsika", "Masuaku", "Mpasi", "Bertaud", "Di形势", "Baggio", "Mayele", "Bope", "Katompa"],
    culture: "french"
  },
  "Argelia": {
    firstNames: ["Riyad", "Said", "Amine", "Baghdad", "Houssem", "Ismaël", "Ramiz", "Sofiane", "Ramy", "Aissa", "Rayan", "Anthony", "Alexandre", "Mustapha", "Yassine", "Nabil", "Fares", "Youcef", "Islam"],
    lastNames: ["Mahrez", "Benrahma", "Gouiri", "Bounedjah", "Aouar", "Bennacer", "Zerrouki", "Feghouli", "Bensebaini", "Mandi", "Aït-Nouri", "Mandrea", "Oukidja", "Zeghba", "Brahimi", "Bentaleb", "Chaïbi", "Atal", "Slimani"],
    culture: "french"
  },
  "Túnez": {
    firstNames: ["Youssef", "Elyes", "Naïm", "Anis", "Aissa", "Ellyes", "Hannibal", "Wajdi", "Montassar", "Yassine", "Mouez", "Aymen", "Bechir", "Bassem", "Sayfallah", "Alain", "Hamza", "Yan"],
    lastNames: ["Msakni", "Achouri", "Sliti", "Ben Slimane", "Laïdouni", "Skhiri", "Mejbri", "Kechrida", "Talbi", "Meriah", "Hassen", "Dahmen", "Ben Saïd", "Srarfi", "Ltaief", "Valery", "Rafia", "Valery"],
    culture: "french"
  },

  // Central Europe
  "Alemania": {
    firstNames: ["Florian", "Jamal", "Kai", "Niclas", "Leroy", "Thomas", "Serge", "İlkay", "Toni", "Leon", "Joshua", "Robert", "Marc-André", "Manuel", "Oliver", "Jonathan", "Antonio", "David", "Benjamin", "Robin"],
    lastNames: ["Wirtz", "Musiala", "Havertz", "Füllkrug", "Sané", "Müller", "Gnabry", "Gündoğan", "Kroos", "Goretzka", "Kimmich", "Andrich", "ter Stegen", "Neuer", "Baumann", "Tah", "Rüdiger", "Raum", "Henrichs", "Gosens"],
    culture: "german"
  },
  "Austria": {
    firstNames: ["Marcel", "Konrad", "Michael", "Christoph", "Florian", "Patrick", "Nicolas", "Stefan", "Phillipp", "Kevin", "Alexander", "Patrick", "Tobias", "Niklas", "Romano", "Maximilian", "Junior", "Marco"],
    lastNames: ["Sabitzer", "Laimer", "Gregoritsch", "Baumgartner", "Grillitsch", "Wimmer", "Seiwald", "Posch", "Lienhart", "Danso", "Schlager", "Pentz", "Lawal", "Hedl", "Schmid", "Wöber", "Adamaru", "Grüll"],
    culture: "german"
  },
  "Suiza": {
    firstNames: ["Granit", "Xherdan", "Breel", "Ruben", "Remo", "Denis", "Michel", "Dan", "Manuel", "Fabian", "Ricardo", "Yann", "Gregor", "Yvon", "Zeki", "Vincent", "Silvan", "Cédric", "Renato"],
    lastNames: ["Xhaka", "Shaqiri", "Embolo", "Vargas", "Freuler", "Zakaria", "Aebischer", "Ndoye", "Akanji", "Schär", "Rodríguez", "Sommer", "Kobel", "Mvogo", "Amdouni", "Sierro", "Widmer", "Zesiger", "Steffen"],
    culture: "german"
  },

  // Slavic & Eastern Europe
  "Croacia": {
    firstNames: ["Luka", "Andrej", "Mateo", "Ivan", "Marcelo", "Mario", "Lovro", "Luka", "Josip", "Borna", "Domagoj", "Dominik", "Nediljko", "Ivica", "Josip", "Martin", "Marco", "Ante", "Petar", "Kristijan"],
    lastNames: ["Modrić", "Kramarić", "Kovačić", "Perišić", "Brozović", "Pašalić", "Majer", "Sučić", "Šutalo", "Gvardiol", "Vida", "Livaković", "Labrović", "Ivušić", "Stanišić", "Baturina", "Pjaca", "Budimir", "Musa", "Jakić"],
    culture: "slavic"
  },
  "Bosnia": {
    firstNames: ["Edin", "Ermedin", "Miralem", "Rade", "Anel", "Dennis", "Benjamin", "Amar", "Sead", "Dennis", "Jusuf", "Nikola", "Kenan", "Osman", "Haris", "Smail", "Eldar", "Adrian", "Ivan"],
    lastNames: ["Džeko", "Demirović", "Pjanić", "Krunić", "Ahmedhodžić", "Hadžikadunić", "Tahirović", "Dedić", "Kolašinac", "Hadžikić", "Gazibegović", "Vasilj", "Pirić", "Hadžiahmetović", "Tabaković", "Prevljak", "Ćivić", "Barišić", "Šunjić"],
    culture: "slavic"
  },
  "Chequia": {
    firstNames: ["Patrick", "Tomáš", "Václav", "Jan", "Antonín", "Michal", "Lukáš", "Ladislav", "Vladimír", "David", "Jindřich", "Vítězslav", "Matej", "Adam", "Mojmír", "Ondřej", "Tomáš", "Pavel", "Alex"],
    lastNames: ["Schick", "Souček", "Černý", "Kuchta", "Barák", "Sadílek", "Provod", "Krejčí", "Coufal", "Zima", "Staněk", "Kovář", "Jaroš", "Hložek", "Chytil", "Lingr", "Holeš", "Jurásek", "Král"],
    culture: "slavic"
  },
  "Marruecos": {
    firstNames: ["Achraf", "Hakim", "Sofyan", "Youssef", "Azzedine", "Amine", "Ismael", "Sofiane", "Nayef", "Romain", "Noussair", "Yassine", "Munir", "El Mehdi", "Abde", "Bilal", "Tarik", "Ayoub", "Amir"],
    lastNames: ["Hakimi", "Ziyech", "Amrabat", "En-Nesyri", "Ounahi", "Adli", "Saibari", "Boufal", "Aguerd", "Saïss", "Mazraoui", "Bounou", "Mohamedi", "Benabid", "Ezzalzouli", "El Khannouss", "Tissoudali", "El Kaabi", "Richardson"],
    culture: "arabic"
  },

  // Arabic / Middle East
  "Egipto": {
    firstNames: ["Mohamed", "Omar", "Mostafa", "Trezeguet", "Elneny", "Hamdi", "Marwan", "Emam", "Ahmed", "Mohamed", "Mohamed", "Mohamed", "Mostafa", "Ahmed", "Zizo", "Kahraba", "Hussein", "Yasser", "Ali"],
    lastNames: ["Salah", "Marmoush", "Mohamed", "Trezeguet", "Elneny", "Fathi", "Attia", "Ashour", "Hegazi", "Abdelmonem", "Hany", "El Shenawy", "Shobeir", "Gabal", "Zizo", "Kahraba", "El Shahat", "Ibrahim", "Gabr"],
    culture: "arabic"
  },
  "Arabia Saudita": {
    firstNames: ["Salem", "Firas", "Saleh", "Abdulelah", "Mohamed", "Faisal", "Mukhtar", "Yasser", "Ali", "Saud", "Ali", "Mohammed", "Yassine", "Raghed", "Abdulrahman", "Hassan", "Nasser", "Sultan", "Abdullah"],
    lastNames: ["Al-Dawsari", "Al-Buraikan", "Al-Shehri", "Al-Malki", "Kanno", "Al-Ghamdi", "Ali", "Al-Shahrani", "Al-Bulayhi", "Abdulhamid", "Lajami", "Al-Owais", "Bono", "Al-Najjar", "Ghareeb", "Tombakti", "Al-Dawsari", "Al-Ghannam", "Al-Ahrak"],
    culture: "arabic"
  },
  "Irak": {
    firstNames: ["Aymen", "Mohanad", "Ibrahim", "Amir", "Osama", "Youssef", "Bashar", "Zidane", "Saad", "Rebin", "Hussein", "Jalal", "Fahad", "Ahmed", "Ali", "Frans", "Montader", "Danilo", "Allan"],
    lastNames: ["Hussein", "Ali", "Bayesh", "Al-Ammari", "Rashid", "Amyn", "Resan", "Iqbal", "Natiq", "Sulaka", "Ali", "Hassan", "Talib", "Basil", "Adnan", "Putros", "Madjed", "Al-Saed", "Mohideen"],
    culture: "arabic"
  },
  "Irán": {
    firstNames: ["Mehdi", "Sardar", "Alireza", "Saman", "Saeid", "Milad", "Ramin", "Shoja", "Hossein", "Ehsan", "Alireza", "Payam", "Hossein", "Karim", "Shahriyar", "Mohammad", "Ali", "Abolfazl", "Omid"],
    lastNames: ["Taremi", "Azmoun", "Jahanbakhsh", "Ghoddos", "Ezatolahi", "Mohammadi", "Rezaeian", "Khalilzadeh", "Kanaanizadegan", "Hajsafi", "Beiranvand", "Niazmand", "Hosseini", "Ansarifard", "Moghanlou", "Mohebi", "Gholizadeh", "Jalali", "Ebrahimi"],
    culture: "arabic"
  },
  "Jordan": {
    firstNames: ["Musa", "Yazan", "Ali", "Nizar", "Raja'i", "Noor", "Ehsan", "Yazan", "Abdallah", "Salem", "Yazeed", "Abdel-Rahman", "Abdallah", "Anas", "Ibrahim", "Hamza", "Mahmoud", "Saleh", "Mohammad"],
    lastNames: ["Al-Taamari", "Al-Naimat", "Olwan", "Al-Rashdan", "Ayed", "Al-Rawabdeh", "Haddad", "Al-Arab", "Nasib", "Al-Ajalin", "Abu Layla", "Al-Fakhouri", "Al-Fakhouri", "Al-Yaseen", "Sadeh", "Al-Dardour", "Al-Mardi", "Ratib", "Abu Hazeem"],
    culture: "arabic"
  },
  "Qatar": {
    firstNames: ["Akram", "Almoez", "حسن", "Abdulaziz", "Jassim", "Ahmed", "Mohammed", "Lucas", "Boualem", "Pedro", "Meshaal", "Salah", "Saad", "Yusuf", "Mustafa", "Homam", "Hazem", "Assim", "Ali"],
    lastNames: ["Afif", "Ali", "Al-Haydos", "Hatem", "Gaber", "Al-Alaaeldin", "Waad", "Mendes", "Khoukhi", "Miguel", "Barsham", "Zakaria", "Al-Sheeb", "Abdurisag", "Tarek", "Al-Amin", "Ahmed", "Madibo", "Asad"],
    culture: "arabic"
  },

  // East Asian
  "Japón": {
    firstNames: ["Kaoru", "Takumi", "Ritsu", "Takefusa", "Daichi", "Wataru", "Ao", "Hidemasa", "Ko", "Shogo", "Hiroki", "Zion", "Keisuke", "Kosei", "Ayase", "Daizen", "Keito", "Yukinari", "Koki"],
    lastNames: ["Mitoma", "Minamino", "Doan", "Kubo", "Kamada", "Endo", "Tanaka", "Morita", "Itakura", "Taniguchi", "Ito", "Suzuki", "Osako", "Tani", "Ueda", "Maeda", "Nakamura", "Sugawara", "Machida"],
    culture: "japanese"
  },
  "Corea del Sur": {
    firstNames: ["Heung-min", "Min-jae", "Kang-in", "Hee-chan", "Jae-sung", "In-beom", "Woo-yeong", "Seol", "Young-gwon", "Seung-hyun", "Hyeon-woo", "Bum-keun", "Jun-hong", "Gue-sung", "Hyeon-gyu", "Min-kyu", "Jin-su"],
    lastNames: ["Son", "Kim", "Lee", "Hwang", "Lee", "Hwang", "Jeong", "Young-woo", "Kim", "Jung", "Jo", "Song", "Kim", "Cho", "Oh", "Joo", "Kim"],
    culture: "korean"
  },

  // Rest of the World / General
  "Noruega": {
    firstNames: ["Erling", "Martin", "Alexander", "Patrick", "Sander", "Kristoffer", "Julian", "Marcus", "Leo", "David", "Ørjan", "Egils", "Mathias", "Antonio", "Jørgen", "Hugo", "Aron", "Andreas"],
    lastNames: ["Haaland", "Ødegaard", "Sørloth", "Berg", "Berge", "Ajer", "Ryerson", "Pedersen", "Østigård", "Møller Wolfe", "Nyland", "Selvik", "Dyngeland", "Nusa", "Strand Larsen", "Vetlesen", "Dønnum", "Schjelderup"],
    culture: "german"
  },
  "Suecia": {
    firstNames: ["Alexander", "Viktor", "Dejan", "Emil", "Hugo", "Jens", "Samuel", "Victor", "Isak", "Ludwig", "Robin", "Viktor", "Kristoffer", "Gustaf", "Sebastian", "Anthony", "Ken", "Niclas"],
    lastNames: ["Isak", "Gyökeres", "Kulusevski", "Forsberg", "Larsson", "Cajuste", "Gustafson", "Lindelöf", "Hien", "Augustinsson", "Olsen", "Johansson", "Nordfeldt", "Svanberg", "Nanasi", "Elanga", "Sema", "Eliasson"],
    culture: "german"
  },
  "Uzbekistán": {
    firstNames: ["Eldor", "Abbosbek", "Otabek", "Odiljon", "Jaloliddin", "Oston", "Rustam", "Husniddin", "Sherzod", "Umar", "Utkir", "Abduvohid", "Botir", "Igor", "Jasur", "Khojimat", "Farrukh", "Khozhiyari"],
    lastNames: ["Shomurodov", "Fayzullaev", "Shukurov", "Hamrobekov", "Masharipov", "Urunov", "Ashurmatov", "Aliqulov", "Nasrullaev", "Eshmurodov", "Yusupov", "Nematov", "Ergashev", "Sergeev", "Yakhshiboev", "Erkinov", "Sayfiev", "Davronov"],
    culture: "slavic"
  },
  "Turquía": {
    firstNames: ["Arda", "Kenan", "Barış", "Kerem", "Hakan", "Orkun", "Kaan", "Merih", "Zeki", "Ferdi", "Mert", "Uğurcan", "Altay", "Cenk", "Semih", "İrfan", "Okay", "Samet", "Abdülkerim"],
    lastNames: ["Güler", "Yıldız", "Alper Yılmaz", "Aktürkoğlu", "Çalhanoğlu", "Kökçü", "Ayhan", "Demiral", "Çelik", "Kadıoğlu", "Günok", "Çakır", "Bayındır", "Tosun", "Kılıçsoy", "Can Kahveci", "Yokuşlu", "Akaydin", "Bardakcı"],
    culture: "arabic"
  }
};

// Returns exactly 26 players for a given country:
// 3 goalkeepers (isArquero = true) and 23 field players (isArquero = false)
export function getPlayersForCountry(countryName: string): Player[] {
  const normCountry = countryName.trim();
  
  // Use cultural group or default to "Argentina" if name is not mapped explicitly
  const group = CULTURAL_GROUPS[normCountry] || CULTURAL_GROUPS["Argentina"];
  
  const generated: Player[] = [];
  
  // Generate deterministically using a name multiplier algorithm based on country name length & character values
  const seed = normCountry.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const firsts = group.firstNames;
  const lasts = group.lastNames;
  
  // Let's create exactly 3 Goalkeepers
  for (let i = 0; i < 3; i++) {
    const fIdx = (seed + i * 7) % firsts.length;
    const lIdx = (seed + (i + 5) * 11) % lasts.length;
    let name = `${firsts[fIdx]} ${lasts[lIdx]}`;
    
    // Safety check for duplicate player names inside the same country
    let safetyCounter = 0;
    while (generated.some(p => p.name === name) && safetyCounter < 100) {
      const altFIdx = (fIdx + safetyCounter + 1) % firsts.length;
      name = `${firsts[altFIdx]} ${lasts[lIdx]}`;
      safetyCounter++;
    }
    
    // Attach isArquero suffix if needed to indicate role, but standard name is fine
    generated.push({
      name,
      country: normCountry,
      isArquero: true
    });
  }
  
  // Generate exactly 23 Outfield Players
  for (let i = 0; i < 23; i++) {
    const fIdx = (seed + (i + 10) * 13) % firsts.length;
    const lIdx = (seed + (i + 15) * 17) % lasts.length;
    let name = `${firsts[fIdx]} ${lasts[lIdx]}`;
    
    let safetyCounter = 0;
    while (generated.some(p => p.name === name) && safetyCounter < 100) {
      const altFIdx = (fIdx + safetyCounter + 1) % firsts.length;
      const altLIdx = (lIdx + safetyCounter + 2) % lasts.length;
      name = `${firsts[altFIdx]} ${lasts[altLIdx]}`;
      safetyCounter++;
    }
    
    generated.push({
      name,
      country: normCountry,
      isArquero: false
    });
  }
  
  return generated;
}

// Generate the complete master database of exactly 1,248 players!
// (48 countries * 26 players)
let cachedAllPlayers: Player[] | null = null;

export function getAllPlayers(): Player[] {
  if (cachedAllPlayers) return cachedAllPlayers;
  
  const all: Player[] = [];
  OFFICIAL_COUNTRIES.forEach((country) => {
    const squad = getPlayersForCountry(country);
    all.push(...squad);
  });
  
  cachedAllPlayers = all;
  return all;
}
