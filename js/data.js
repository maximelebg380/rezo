const POI_ICONS = {
  transport: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/></svg>`,
  sante: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/></svg>`,
  culture: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 10a3 3 0 0 1 6 0"/></svg>`,
  parc: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 19c0-3.87 3.13-7 7-7s7 3.13 7 7"/><path d="M7 12c0-2.76 2.24-5 5-5s5 2.24 5 5"/></svg>`,
  commerce: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  enseignement: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  sport: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>`,
  admin: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`
};

const DIFFICULTY_PRESETS = {
  tres_facile: { budgetMultiplier: 1.6, congestionGrowth: 0.012, startDistrictsRatio: 0.65, reliefFactor: 1.4 },
  facile:      { budgetMultiplier: 1.25, congestionGrowth: 0.016, startDistrictsRatio: 0.8, reliefFactor: 1.2 },
  moyen:       { budgetMultiplier: 1.0, congestionGrowth: 0.02, startDistrictsRatio: 1.0, reliefFactor: 1.0 },
  difficile:   { budgetMultiplier: 0.7, congestionGrowth: 0.026, startDistrictsRatio: 1.0, reliefFactor: 0.85 },
  tres_difficile: { budgetMultiplier: 0.45, congestionGrowth: 0.035, startDistrictsRatio: 1.0, reliefFactor: 0.7 }
};

const RANDOM_EVENTS_POOL = [
  {
    id: "match_foot",
    name: "Match de Football décisif",
    desc: "Affluence massive au stade (+350 % de spectateurs). Déployez vos rames !",
    durationHours: 4,
    type: "poi_surge",
    categoryTarget: "sport",
    surgeFactor: 4.5
  },
  {
    id: "concert_arene",
    name: "Concert international",
    desc: "Des dizaines de milliers de fans affluent vers la grande salle de spectacle.",
    durationHours: 5,
    type: "poi_surge",
    categoryTarget: "culture",
    surgeFactor: 3.8
  },
  {
    id: "pic_pollution",
    name: "Pic de Pollution - Gratuité Partielle",
    desc: "Le trafic routier est restreint. Le réseau TC subit une ruée d'usagers.",
    durationHours: 12,
    type: "global_surge",
    surgeFactor: 1.8
  },
  {
    id: "crise_energie",
    name: "Hausse du Coût de l'Énergie",
    desc: "L'électricité augmente. Les frais horaires de maintenance grimpent de 40 %.",
    durationHours: 24,
    type: "maint_penalty",
    penaltyFactor: 1.4
  },
  {
    id: "bonus_transition",
    name: "Subvention Européenne Climat",
    desc: "L'Union européenne débloque une aide exceptionnelle pour vos investissements !",
    durationHours: 1,
    type: "cash_bonus",
    bonusCash: 12000000
  }
];

const GRENOBLE_POIS_DATASET = [
  { id: "gare_grenoble", nom: "Gare de Grenoble", categorie: "Transport / Gare", catKey: "transport", lat: 45.19131, lng: 5.7141 },
  { id: "gare_gieres", nom: "Gare de Gières Universités", categorie: "Transport / Gare", catKey: "transport", lat: 45.1848, lng: 5.7876 },
  { id: "gare_echirolles", nom: "Gare d'Échirolles", categorie: "Transport / Gare", catKey: "transport", lat: 45.1558, lng: 5.7142 },
  { id: "chuga_nord", nom: "CHU Grenoble Alpes - Site Nord", categorie: "Hôpital", catKey: "sante", lat: 45.1995, lng: 5.7460 },
  { id: "chuga_sud", nom: "CHU Grenoble Alpes - Site Sud", categorie: "Hôpital", catKey: "sante", lat: 45.1508, lng: 5.7275 },
  { id: "domaine_univ", nom: "Domaine Universitaire (UGA)", categorie: "Campus", catKey: "enseignement", lat: 45.1925, lng: 5.7690 },
  { id: "presquile_cea", nom: "Polygone Scientifique - CEA", categorie: "Campus", catKey: "enseignement", lat: 45.2065, lng: 5.7005 },
  { id: "cc_grandplace", nom: "CC Grand'Place", categorie: "Commerce", catKey: "commerce", lat: 45.1585, lng: 5.7315 },
  { id: "espace_comboire", nom: "Espace Comboire", categorie: "Commerce", catKey: "commerce", lat: 45.1435, lng: 5.6880 },
  { id: "stade_alpes", nom: "Stade des Alpes", categorie: "Stade", catKey: "sport", lat: 45.1888, lng: 5.7428 },
  { id: "patinoire_polesud", nom: "Patinoire Polesud", categorie: "Sport", catKey: "sport", lat: 45.1565, lng: 5.7350 },
  { id: "parc_mistral", nom: "Parc Paul Mistral", categorie: "Parc", catKey: "parc", lat: 45.1850, lng: 5.7360 },
  { id: "parc_ile_amour", nom: "Parc de l'Île d'Amour", categorie: "Parc", catKey: "parc", lat: 45.2012, lng: 5.7685 }
];

const LYON_POIS_DATASET = [
  { id: "lyon_partdieu", nom: "Gare de Lyon Part-Dieu", categorie: "Gare", catKey: "transport", lat: 45.7606, lng: 4.8596 },
  { id: "lyon_perrache", nom: "Gare de Lyon Perrache", categorie: "Gare", catKey: "transport", lat: 45.7485, lng: 4.8258 },
  { id: "lyon_aeroport", nom: "Aéroport Lyon Saint-Exupéry", categorie: "Aéroport", catKey: "transport", lat: 45.7255, lng: 5.0780 },
  { id: "lyon_heh", nom: "Hôpital Édouard Herriot", categorie: "Hôpital", catKey: "sante", lat: 45.7440, lng: 4.8810 },
  { id: "lyon_sud", nom: "Hôpital Lyon Sud", categorie: "Hôpital", catKey: "sante", lat: 45.7015, lng: 4.8185 },
  { id: "lyon_cc_partdieu", nom: "CC La Part-Dieu", categorie: "Commerce", catKey: "commerce", lat: 45.7615, lng: 4.8565 },
  { id: "lyon_cc_confluence", nom: "CC Confluence", categorie: "Commerce", catKey: "commerce", lat: 45.7430, lng: 4.8160 },
  { id: "lyon_doua", nom: "Campus de la Doua", categorie: "Campus", catKey: "enseignement", lat: 45.7810, lng: 4.8690 },
  { id: "lyon_groupama", nom: "Groupama Stadium", categorie: "Stade", catKey: "sport", lat: 45.7655, lng: 4.9820 },
  { id: "lyon_tetedor", nom: "Parc de la Tête d'Or", categorie: "Parc", catKey: "parc", lat: 45.7770, lng: 4.8550 }
];

const BORDEAUX_POIS_DATASET = [
  { id: "bdx_stjean", nom: "Gare de Bordeaux Saint-Jean", categorie: "Gare", catKey: "transport", lat: 44.8258, lng: -0.5567 },
  { id: "bdx_aeroport", nom: "Aéroport de Bordeaux-Mérignac", categorie: "Aéroport", catKey: "transport", lat: 44.8285, lng: -0.7155 },
  { id: "bdx_pellegrin", nom: "CHU Pellegrin", categorie: "Hôpital", catKey: "sante", lat: 44.8295, lng: -0.6050 },
  { id: "bdx_cite_vin", nom: "La Cité du Vin", categorie: "Musée", catKey: "culture", lat: 44.8625, lng: -0.5505 },
  { id: "bdx_cc_meriadeck", nom: "CC Mériadeck", categorie: "Commerce", catKey: "commerce", lat: 44.8375, lng: -0.5840 },
  { id: "bdx_campus_talence", nom: "Campus Talence-Pessac", categorie: "Campus", catKey: "enseignement", lat: 44.8010, lng: -0.5920 },
  { id: "bdx_matmut_atl", nom: "Stade Matmut Atlantique", categorie: "Stade", catKey: "sport", lat: 44.8970, lng: -0.5630 },
  { id: "bdx_jardin_public", nom: "Jardin Public", categorie: "Parc", catKey: "parc", lat: 44.8480, lng: -0.5780 }
];

const NANTES_POIS_DATASET = [
  { id: "nte_gare_centrale", nom: "Gare de Nantes (Nord & Sud)", categorie: "Gare", catKey: "transport", lat: 47.2173, lng: -1.5419 },
  { id: "nte_aeroport", nom: "Aéroport Nantes Atlantique", categorie: "Aéroport", catKey: "transport", lat: 47.1532, lng: -1.6108 },
  { id: "nte_hotel_dieu", nom: "CHU Nantes - Hôtel-Dieu", categorie: "Hôpital", catKey: "sante", lat: 47.2120, lng: -1.5535 },
  { id: "nte_machines_ile", nom: "Les Machines de l'Île", categorie: "Culture", catKey: "culture", lat: 47.2065, lng: -1.5645 },
  { id: "nte_cc_atlantis", nom: "CC Atlantis", categorie: "Commerce", catKey: "commerce", lat: 47.2235, lng: -1.6310 },
  { id: "nte_campus_tertre", nom: "Campus Tertre", categorie: "Campus", catKey: "enseignement", lat: 47.2440, lng: -1.5535 },
  { id: "nte_beaujoire_stade", nom: "Stade de la Beaujoire", categorie: "Stade", catKey: "sport", lat: 47.2558, lng: -1.5247 },
  { id: "nte_jardin_plantes", nom: "Jardin des Plantes", categorie: "Parc", catKey: "parc", lat: 47.2195, lng: -1.5425 }
];

const MARSEILLE_POIS_DATASET = [
  { id: "mrs_stcharles", nom: "Gare de Marseille Saint-Charles", categorie: "Gare", catKey: "transport", lat: 43.3028, lng: 5.3806 },
  { id: "mrs_blancarde", nom: "Gare de Marseille-Blancarde", categorie: "Gare", catKey: "transport", lat: 43.2965, lng: 5.4065 },
  { id: "mrs_aeroport", nom: "Aéroport Marseille-Provence", categorie: "Aéroport", catKey: "transport", lat: 43.4365, lng: 5.2150 },
  { id: "mrs_timone", nom: "Hôpital de la Timone", categorie: "Hôpital", catKey: "sante", lat: 43.2885, lng: 5.4010 },
  { id: "mrs_nord", nom: "Hôpital Nord", categorie: "Hôpital", catKey: "sante", lat: 43.3645, lng: 5.3610 },
  { id: "mrs_conception", nom: "Hôpital de la Conception", categorie: "Hôpital", catKey: "sante", lat: 43.2890, lng: 5.3945 },
  { id: "mrs_velodrome", nom: "Orange Vélodrome", categorie: "Stade", catKey: "sport", lat: 43.2698, lng: 5.3958 },
  { id: "mrs_palais_sports", nom: "Palais des Sports de Marseille", categorie: "Sport", catKey: "sport", lat: 43.2675, lng: 5.4015 },
  { id: "mrs_mucem", nom: "Mucem / Fort Saint-Jean", categorie: "Musée", catKey: "culture", lat: 43.2968, lng: 5.3610 },
  { id: "mrs_dome", nom: "Le Dôme", categorie: "Spectacle", catKey: "culture", lat: 43.3135, lng: 5.4030 },
  { id: "mrs_terrasses", nom: "CC Les Terrasses du Port", categorie: "Commerce", catKey: "commerce", lat: 43.3080, lng: 5.3655 },
  { id: "mrs_grand_littoral", nom: "CC Grand Littoral", categorie: "Commerce", catKey: "commerce", lat: 43.3685, lng: 5.3490 },
  { id: "mrs_luminy", nom: "Campus Universitaire de Luminy", categorie: "Campus", catKey: "enseignement", lat: 43.2320, lng: 5.4380 },
  { id: "mrs_saint_jerome", nom: "Campus Étoile - Saint-Jérôme", categorie: "Campus", catKey: "enseignement", lat: 43.3395, lng: 5.4120 },
  { id: "mrs_borely", nom: "Parc Borély", categorie: "Parc", catKey: "parc", lat: 43.2605, lng: 5.3810 },
  { id: "mrs_palais_longchamp", nom: "Palais Longchamp & Parc", categorie: "Parc", catKey: "parc", lat: 43.3045, lng: 5.3940 }
];

const STRASBOURG_POIS_DATASET = [
  { id: "sxb_gare", nom: "Gare Centrale de Strasbourg", categorie: "Gare", catKey: "transport", lat: 48.5851, lng: 7.7345 },
  { id: "sxb_krimmeri", nom: "Gare de Krimmeri-Meinau", categorie: "Gare", catKey: "transport", lat: 48.5620, lng: 7.7540 },
  { id: "sxb_aeroport", nom: "Aéroport de Strasbourg-Entzheim", categorie: "Aéroport", catKey: "transport", lat: 48.5440, lng: 7.6280 },
  { id: "sxb_civil", nom: "Nouvel Hôpital Civil (NHC)", categorie: "Hôpital", catKey: "sante", lat: 48.5750, lng: 7.7420 },
  { id: "sxb_hautepierre", nom: "Hôpital de Hautepierre", categorie: "Hôpital", catKey: "sante", lat: 48.5915, lng: 7.7020 },
  { id: "sxb_meinau", nom: "Stade de la Meinau", categorie: "Stade", catKey: "sport", lat: 48.5600, lng: 7.7545 },
  { id: "sxb_rhenus", nom: "Rhenus Sport & Zénith", categorie: "Sport", catKey: "sport", lat: 48.5985, lng: 7.7710 },
  { id: "sxb_parlement", nom: "Parlement Européen", categorie: "Institution", catKey: "admin", lat: 48.5975, lng: 7.7685 },
  { id: "sxb_cour_europeenne", nom: "Cour Européenne des Droits de l'Homme", categorie: "Institution", catKey: "admin", lat: 48.5970, lng: 7.7760 },
  { id: "sxb_esplanade", nom: "Campus Central Esplanade (Unistra)", categorie: "Campus", catKey: "enseignement", lat: 48.5780, lng: 7.7665 },
  { id: "sxb_illkirch_campus", nom: "Parc d'Innovation d'Illkirch", categorie: "Campus", catKey: "enseignement", lat: 48.5280, lng: 7.7390 },
  { id: "sxb_rivetoile", nom: "CC Rivetoile", categorie: "Commerce", catKey: "commerce", lat: 48.5735, lng: 7.7540 },
  { id: "sxb_halles", nom: "CC Place des Halles", categorie: "Commerce", catKey: "commerce", lat: 48.5875, lng: 7.7410 },
  { id: "sxb_orangerie", nom: "Parc de l'Orangerie", categorie: "Parc", catKey: "parc", lat: 48.5910, lng: 7.7780 }
];

const TOULOUSE_POIS_DATASET = [
  { id: "tls_matabiau", nom: "Gare de Toulouse-Matabiau", categorie: "Gare", catKey: "transport", lat: 43.6111, lng: 1.4536 },
  { id: "tls_saint_agne", nom: "Gare de Toulouse Saint-Agne", categorie: "Gare", catKey: "transport", lat: 43.5820, lng: 1.4480 },
  { id: "tls_blagnac", nom: "Aéroport Toulouse-Blagnac", categorie: "Aéroport", catKey: "transport", lat: 43.6290, lng: 1.3638 },
  { id: "tls_purpan", nom: "CHU Purpan", categorie: "Hôpital", catKey: "sante", lat: 43.6105, lng: 1.4020 },
  { id: "tls_rangueil_hop", nom: "CHU Rangueil", categorie: "Hôpital", catKey: "sante", lat: 43.5570, lng: 1.4540 },
  { id: "tls_oncopole", nom: "Institut Universitaire du Cancer (Oncopole)", categorie: "Hôpital", catKey: "sante", lat: 43.5605, lng: 1.4245 },
  { id: "tls_stadium", nom: "Stadium de Toulouse", categorie: "Stade", catKey: "sport", lat: 43.5833, lng: 1.4340 },
  { id: "tls_palais_sports", nom: "Palais des Sports André-Brouat", categorie: "Sport", catKey: "sport", lat: 43.6115, lng: 1.4320 },
  { id: "tls_zenith", nom: "Zénith Toulouse Métropole", categorie: "Spectacle", catKey: "culture", lat: 43.5975, lng: 1.4110 },
  { id: "tls_cite_espace", nom: "Cité de l'Espace", categorie: "Musée", catKey: "culture", lat: 43.5865, lng: 1.4930 },
  { id: "tls_rangueil_univ", nom: "Université Paul Sabatier (UPS)", categorie: "Campus", catKey: "enseignement", lat: 43.5615, lng: 1.4680 },
  { id: "tls_arsenal", nom: "Université Toulouse Capitole (Arsenal)", categorie: "Campus", catKey: "enseignement", lat: 43.6060, lng: 1.4360 },
  { id: "tls_labege", nom: "CC Labège 2 / Enova", categorie: "Commerce", catKey: "commerce", lat: 43.5380, lng: 1.5120 },
  { id: "tls_blagnac_cc", nom: "CC Blagnac (Grand Noble)", categorie: "Commerce", catKey: "commerce", lat: 43.6360, lng: 1.3780 },
  { id: "tls_jardin_plantes", nom: "Jardin des Plantes & Grand Rond", categorie: "Parc", catKey: "parc", lat: 43.5935, lng: 1.4520 }
];

const CITIES_DATA = {
  grenoble: {
    name: "Grenoble Alpes Métropole", center: [45.1885, 5.7245], zoom: 13,
    bbox: [[45.050, 5.500], [45.350, 5.950]],
    initialTreasury: 280000000,
    officialOperator: { name: "M RÉSO", fullName: "M RÉSO (SMMAG)", logoFile: "images/mreso.png", color: "#00a3e0", shape: "carre" },
    pois: GRENOBLE_POIS_DATASET,
    districts: [
      { id: "centre", name: "Hypercentre - Victor Hugo", lat: 45.1895, lng: 5.7260, pop: 34000, jobs: 45000, type: "commercial", radius: 750 },
      { id: "europole", name: "Europole / Gare", lat: 45.1915, lng: 5.7135, pop: 19000, jobs: 39000, type: "transit", radius: 650 },
      { id: "presquile", name: "Presqu'île CEA", lat: 45.2055, lng: 5.7005, pop: 12000, jobs: 52000, type: "business", radius: 850 },
      { id: "campus", name: "Campus Universitaire", lat: 45.1910, lng: 5.7680, pop: 28000, jobs: 48000, type: "university", radius: 950 },
      { id: "ileverte", name: "Île Verte / CHU", lat: 45.1980, lng: 5.7420, pop: 24000, jobs: 36000, type: "mixed", radius: 700 },
      { id: "grandplace", name: "Grand'Place", lat: 45.1610, lng: 5.7330, pop: 48000, jobs: 26000, type: "residential", radius: 900 },
      { id: "echirolles", name: "Échirolles Centre", lat: 45.1430, lng: 5.7170, pop: 42000, jobs: 23000, type: "mixed", radius: 850 },
      { id: "fontaine", name: "Fontaine Rive Gauche", lat: 45.1920, lng: 5.6880, pop: 32000, jobs: 12000, type: "residential", radius: 800 },
      { id: "meylan", name: "Meylan Inovallée", lat: 45.2150, lng: 5.7810, pop: 25000, jobs: 42000, type: "business", radius: 850 },
      { id: "stegreve", name: "Saint-Égrève", lat: 45.2310, lng: 5.6820, pop: 22000, jobs: 18000, type: "residential", radius: 800 },
      { id: "pontonclaix", name: "Pont-de-Claix", lat: 45.1220, lng: 5.6980, pop: 29000, jobs: 21000, type: "industrial", radius: 850 },
      { id: "sassenage", name: "Sassenage", lat: 45.2050, lng: 5.6650, pop: 11000, jobs: 8000, type: "residential", radius: 800 },
      { id: "seyssinet", name: "Seyssinet-Pariset", lat: 45.1750, lng: 5.6850, pop: 12000, jobs: 6000, type: "residential", radius: 750 },
      { id: "gieres", name: "Gières Centre", lat: 45.1820, lng: 5.7890, pop: 6000, jobs: 4000, type: "residential", radius: 700 }
    ],
    expansions: []
  },
  lyon: {
    name: "Métropole Grand Lyon", center: [45.7578, 4.8320], zoom: 13,
    bbox: [[45.600, 4.700], [45.900, 5.100]],
    initialTreasury: 450000000,
    officialOperator: { name: "TCL", fullName: "TCL (SYTRAL Mobilités)", logoFile: "images/tcl.png", color: "#e11d48", shape: "carre" },
    pois: LYON_POIS_DATASET,
    districts: [
      { id: "presquile", name: "Presqu'île - Bellecour", lat: 45.7578, lng: 4.8320, pop: 38000, jobs: 62000, type: "commercial", radius: 800 },
      { id: "partdieu", name: "Part-Dieu Hub", lat: 45.7606, lng: 4.8596, pop: 22000, jobs: 85000, type: "business", radius: 900 },
      { id: "croixrousse", name: "Croix-Rousse", lat: 45.7745, lng: 4.8315, pop: 36000, jobs: 12000, type: "residential", radius: 750 },
      { id: "gerland", name: "Gerland Biopôle", lat: 45.7315, lng: 4.8330, pop: 31000, jobs: 42000, type: "business", radius: 900 },
      { id: "confluence", name: "Confluence", lat: 45.7410, lng: 4.8180, pop: 18000, jobs: 22000, type: "mixed", radius: 700 },
      { id: "villeurbanne", name: "Villeurbanne Gratte-Ciel", lat: 45.7690, lng: 4.8790, pop: 68000, jobs: 24000, type: "residential", radius: 950 },
      { id: "doua", name: "Campus de la Doua", lat: 45.7810, lng: 4.8690, pop: 14000, jobs: 35000, type: "university", radius: 800 },
      { id: "bron", name: "Bron Université", lat: 45.7360, lng: 4.9120, pop: 39000, jobs: 22000, type: "university", radius: 850 },
      { id: "venissieux", name: "Vénissieux Industrie", lat: 45.6980, lng: 4.8820, pop: 48000, jobs: 32000, type: "industrial", radius: 900 },
      { id: "vaise", name: "Gare de Vaise", lat: 45.7750, lng: 4.8050, pop: 28000, jobs: 25000, type: "transit", radius: 850 },
      { id: "oullins", name: "Oullins", lat: 45.7150, lng: 4.8050, pop: 26000, jobs: 12000, type: "residential", radius: 800 },
      { id: "guillotiere", name: "La Guillotière", lat: 45.7530, lng: 4.8420, pop: 32000, jobs: 18000, type: "mixed", radius: 700 }
    ],
    expansions: []
  },
  bordeaux: {
    name: "Bordeaux Métropole", center: [44.8378, -0.5792], zoom: 13,
    bbox: [[44.700, -0.800], [44.980, -0.400]],
    initialTreasury: 350000000,
    officialOperator: { name: "TBM", fullName: "TBM (Keolis Bordeaux Métropole)", logoFile: "images/tbm.png", color: "#0088ce", shape: "rectangle" },
    pois: BORDEAUX_POIS_DATASET,
    districts: [
      { id: "centre_bdx", name: "Quinconces - Triangle d'Or", lat: 44.8450, lng: -0.5740, pop: 32000, jobs: 56000, type: "commercial", radius: 750 },
      { id: "stjean_bdx", name: "Gare Saint-Jean / Belcier", lat: 44.8258, lng: -0.5567, pop: 24000, jobs: 42000, type: "transit", radius: 800 },
      { id: "meriadeck_bdx", name: "Mériadeck Business", lat: 44.8370, lng: -0.5870, pop: 18000, jobs: 48000, type: "business", radius: 750 },
      { id: "bastide_bdx", name: "La Bastide Rive Droite", lat: 44.8415, lng: -0.5580, pop: 34000, jobs: 19000, type: "mixed", radius: 800 },
      { id: "talence_bdx", name: "Talence Universités", lat: 44.8010, lng: -0.5920, pop: 42000, jobs: 36000, type: "university", radius: 950 },
      { id: "pessac_bdx", name: "Pessac Bersol", lat: 44.7920, lng: -0.6350, pop: 38000, jobs: 31000, type: "business", radius: 850 },
      { id: "merignac_aero", name: "Mérignac Aéroparc", lat: 44.8380, lng: -0.6900, pop: 44000, jobs: 54000, type: "industrial", radius: 1000 },
      { id: "cenon_hauts", name: "Cenon Hauts de Garonne", lat: 44.8580, lng: -0.5280, pop: 39000, jobs: 15000, type: "residential", radius: 850 },
      { id: "chartrons", name: "Les Chartrons", lat: 44.8550, lng: -0.5680, pop: 22000, jobs: 14000, type: "mixed", radius: 750 },
      { id: "begles", name: "Bègles", lat: 44.8080, lng: -0.5480, pop: 28000, jobs: 12000, type: "residential", radius: 850 },
      { id: "cauderan", name: "Caudéran", lat: 44.8480, lng: -0.6150, pop: 35000, jobs: 9000, type: "residential", radius: 900 }
    ],
    expansions: []
  },
  nantes: {
    name: "Nantes Métropole", center: [47.2184, -1.5536], zoom: 13,
    bbox: [[47.100, -1.750], [47.350, -1.400]],
    initialTreasury: 320000000,
    officialOperator: { name: "Naolib", fullName: "Naolib (Semitan / Nantes Métropole)", logoFile: "images/naolib.png", color: "#65b32e", shape: "cercle" },
    pois: NANTES_POIS_DATASET,
    districts: [
      { id: "centre_nte", name: "Commerce - Place Royale", lat: 47.2140, lng: -1.5580, pop: 36000, jobs: 54000, type: "commercial", radius: 750 },
      { id: "gare_nte", name: "Gare Sud - Cité des Congrès", lat: 47.2155, lng: -1.5435, pop: 22000, jobs: 44000, type: "transit", radius: 700 },
      { id: "ile_nte", name: "Île de Nantes / Création", lat: 47.2065, lng: -1.5530, pop: 31000, jobs: 38000, type: "business", radius: 850 },
      { id: "tertre_nte", name: "Campus Tertre / Facs", lat: 47.2440, lng: -1.5535, pop: 28000, jobs: 35000, type: "university", radius: 900 },
      { id: "beaujoire_nte", name: "Beaujoire / Halvêque", lat: 47.2558, lng: -1.5247, pop: 34000, jobs: 24000, type: "mixed", radius: 850 },
      { id: "reze_nte", name: "Rezé Pont-Rousseau", lat: 47.1915, lng: -1.5540, pop: 41000, jobs: 18000, type: "residential", radius: 850 },
      { id: "atlantis_herblain", name: "Saint-Herblain Atlantis", lat: 47.2235, lng: -1.6310, pop: 32000, jobs: 48000, type: "commercial", radius: 950 },
      { id: "orvault_grand_val", name: "Orvault Grand Val", lat: 47.2580, lng: -1.5850, pop: 29000, jobs: 16000, type: "residential", radius: 800 },
      { id: "chantenay", name: "Chantenay", lat: 47.2000, lng: -1.5900, pop: 25000, jobs: 12000, type: "mixed", radius: 800 }
    ],
    expansions: []
  },
  marseille: {
    name: "Aix-Marseille-Provence", center: [43.2965, 5.3698], zoom: 13,
    bbox: [[43.150, 5.150], [43.450, 5.600]],
    initialTreasury: 420000000,
    officialOperator: { name: "RTM", fullName: "RTM (Métropole Mobilité)", logoFile: "images/rtm.png", color: "#0072ce", shape: "rectangle" },
    pois: MARSEILLE_POIS_DATASET,
    districts: [
      { id: "vieuxport", name: "Vieux-Port - Centre", lat: 43.2965, lng: 5.3750, pop: 42000, jobs: 65000, type: "commercial", radius: 800 },
      { id: "stcharles", name: "Saint-Charles Hub", lat: 43.3028, lng: 5.3806, pop: 28000, jobs: 40000, type: "transit", radius: 750 },
      { id: "joliette", name: "Euroméditerranée / Joliette", lat: 43.3090, lng: 5.3670, pop: 18000, jobs: 55000, type: "business", radius: 850 },
      { id: "prado", name: "Castellane - Prado", lat: 43.2820, lng: 5.3840, pop: 38000, jobs: 30000, type: "mixed", radius: 800 },
      { id: "timone", name: "La Timone Campus", lat: 43.2885, lng: 5.4010, pop: 31000, jobs: 38000, type: "university", radius: 850 },
      { id: "luminy", name: "Campus Luminy", lat: 43.2320, lng: 5.4380, pop: 14000, jobs: 26000, type: "university", radius: 950 },
      { id: "estaque", name: "L'Estaque", lat: 43.3610, lng: 5.3150, pop: 16000, jobs: 8000, type: "residential", radius: 850 },
      { id: "larose", name: "La Rose - Technopôle", lat: 43.3320, lng: 5.4280, pop: 32000, jobs: 22000, type: "transit", radius: 850 },
      { id: "bonneveine", name: "Bonneveine - Plages", lat: 43.2510, lng: 5.3820, pop: 29000, jobs: 14000, type: "residential", radius: 800 },
      { id: "mazargues", name: "Mazargues", lat: 43.2450, lng: 5.4080, pop: 24000, jobs: 9000, type: "residential", radius: 800 },
      { id: "blancarde", name: "La Blancarde", lat: 43.2965, lng: 5.4065, pop: 33000, jobs: 19000, type: "mixed", radius: 750 }
    ],
    expansions: []
  },
  strasbourg: {
    name: "Eurométropole de Strasbourg", center: [48.5734, 7.7521], zoom: 13,
    bbox: [[48.450, 7.550], [48.680, 7.950]],
    initialTreasury: 310000000,
    officialOperator: { name: "CTS", fullName: "Compagnie des Transports Strasbourgeois", logoFile: "images/cts.png", color: "#e30613", shape: "carre" },
    pois: STRASBOURG_POIS_DATASET,
    districts: [
      { id: "grandeile", name: "Grande Île - Kléber", lat: 48.5830, lng: 7.7460, pop: 35000, jobs: 52000, type: "commercial", radius: 750 },
      { id: "gare_sxb", name: "Gare / Halles", lat: 48.5855, lng: 7.7380, pop: 22000, jobs: 38000, type: "transit", radius: 700 },
      { id: "esplanade", name: "Esplanade Universités", lat: 48.5780, lng: 7.7665, pop: 32000, jobs: 34000, type: "university", radius: 850 },
      { id: "robertsau", name: "Institutions Européennes", lat: 48.5980, lng: 7.7720, pop: 24000, jobs: 41000, type: "business", radius: 850 },
      { id: "hautepierre", name: "Hautepierre", lat: 48.5920, lng: 7.7050, pop: 38000, jobs: 21000, type: "residential", radius: 900 },
      { id: "neudorf", name: "Neudorf", lat: 48.5670, lng: 7.7610, pop: 41000, jobs: 19000, type: "mixed", radius: 850 },
      { id: "illkirch", name: "Illkirch Campus", lat: 48.5290, lng: 7.7380, pop: 29000, jobs: 28000, type: "university", radius: 900 },
      { id: "schiltigheim", name: "Schiltigheim Centre", lat: 48.6080, lng: 7.7490, pop: 33000, jobs: 16000, type: "residential", radius: 850 },
      { id: "cronenbourg", name: "Cronenbourg", lat: 48.5980, lng: 7.7180, pop: 26000, jobs: 12000, type: "residential", radius: 800 },
      { id: "meinau", name: "La Meinau", lat: 48.5550, lng: 7.7550, pop: 31000, jobs: 18000, type: "mixed", radius: 850 }
    ],
    expansions: []
  },
  toulouse: {
    name: "Toulouse Métropole", center: [43.6047, 1.4442], zoom: 13,
    bbox: [[43.450, 1.250], [43.750, 1.650]],
    initialTreasury: 380000000,
    officialOperator: { name: "Tisséo", fullName: "Tisséo Collectivités", logoFile: "images/tisseo.png", color: "#f29400", shape: "cercle" },
    pois: TOULOUSE_POIS_DATASET,
    districts: [
      { id: "capitole", name: "Capitole - Hypercentre", lat: 43.6045, lng: 1.4440, pop: 39000, jobs: 68000, type: "commercial", radius: 800 },
      { id: "matabiau", name: "Matabiau / Marengo", lat: 43.6120, lng: 1.4550, pop: 26000, jobs: 44000, type: "transit", radius: 750 },
      { id: "compans", name: "Compans-Caffarelli", lat: 43.6110, lng: 1.4330, pop: 21000, jobs: 39000, type: "business", radius: 750 },
      { id: "rangueil", name: "Rangueil - Paul Sabatier", lat: 43.5620, lng: 1.4690, pop: 34000, jobs: 46000, type: "university", radius: 950 },
      { id: "blagnac", name: "Aéroconstellation / Blagnac", lat: 43.6350, lng: 1.3720, pop: 27000, jobs: 58000, type: "industrial", radius: 1000 },
      { id: "mirail", name: "Le Mirail - Reynerie", lat: 43.5750, lng: 1.4020, pop: 43000, jobs: 18000, type: "residential", radius: 900 },
      { id: "labege", name: "Labège Enova", lat: 43.5380, lng: 1.5120, pop: 12000, jobs: 41000, type: "business", radius: 900 },
      { id: "stcyprien", name: "Saint-Cyprien", lat: 43.5980, lng: 1.4300, pop: 28000, jobs: 19000, type: "mixed", radius: 800 },
      { id: "minimes", name: "Les Minimes", lat: 43.6230, lng: 1.4380, pop: 31000, jobs: 14000, type: "residential", radius: 850 },
      { id: "borderouge", name: "Borderouge", lat: 43.6410, lng: 1.4520, pop: 29000, jobs: 11000, type: "residential", radius: 850 },
      { id: "colomiers", name: "Colomiers Centre", lat: 43.6140, lng: 1.3350, pop: 39000, jobs: 32000, type: "mixed", radius: 950 },
      { id: "montaudran", name: "Montaudran Aerospace", lat: 43.5720, lng: 1.4810, pop: 18000, jobs: 35000, type: "business", radius: 850 }
    ],
    expansions: []
  }
};

const TRANSIT_SPECS = {
  bus: { name: "Bus BHNS", stationCost: 40000, vehicleCost: 120000, vehicleCapacity: 85, hourlyMaint: 65, speedKmH: 34, color: "#38bdf8", coverageMeters: 600, reliefFactor: 1.0, requiresRoad: true, followRoads: true },
  tram: { name: "Tramway", stationCost: 250000, vehicleCost: 750000, vehicleCapacity: 280, hourlyMaint: 190, speedKmH: 48, color: "#10b981", coverageMeters: 900, reliefFactor: 2.5, requiresRoad: true, followRoads: true },
  metro: { name: "Métro Automatique Lourd", stationCost: 1200000, vehicleCost: 2400000, vehicleCapacity: 650, hourlyMaint: 420, speedKmH: 75, color: "#a855f7", coverageMeters: 1400, reliefFactor: 5.5, requiresRoad: false, followRoads: false }
};

const SWATCH_PALETTE = ["#38bdf8", "#0284c7", "#0ea5e9", "#06b6d4", "#10b981", "#16a34a", "#84cc16", "#eab308", "#f59e0b", "#f97316", "#ef4444", "#e11d48", "#ec4899", "#d946ef", "#a855f7", "#6366f1"];