/* =========================================================================
 * Leksiku i gjuhës shqipe për gjeneratorin e niveleve.
 *
 * Çdo fjalë këtu është fjalë standarde e shqipes, e verifikuar sipas
 * "Fjalorit të Gjuhës së Sotme Shqipe" (FGJSSH) — burim: fjalorishqip.com
 * dhe fjalori.shkenca.org. Përfshihen trajta të shquara e të pashquara
 * emrash, folje në vetën e parë, përemra, ndajfolje e numërorë.
 *
 * KUJDES: shto vetëm fjalë që i ke verifikuar në fjalor — cilësia e
 * mijëra niveleve varet nga cilësia e këtij leksiku.
 * ========================================================================= */

const LEXICON = [
  // ---- 2 shkronja ----
  "AH", "AQ", "AR", "AS", "AT", "BE", "DI", "DO", "DY", "HA", "HI",
  "IK", "JA", "JE", "JO", "JU", "KA", "KE", "KU", "LA", "LE", "MA",
  "ME", "MË", "MI", "NA", "NE", "NË", "PA", "PE", "PI", "PO", "RA",
  "RE", "RI", "SA", "SE", "SI", "SY", "TA", "TE", "TË", "TI", "UL",
  "VE", "ZË",

  // ---- 3 shkronja ----
  "AGU", "ANA", "ARA", "ARI", "ART", "ATA", "ATË", "ATI", "ATO",
  "BAR", "BEL", "BIE", "BIR", "DAL", "DET", "DHA", "DHE", "DHI",
  "DRE", "DRU", "DUA", "EJA", "ERA", "ERË", "FAJ", "FAL", "FIK",
  "FIS", "FLE", "GAZ", "GJË", "GJI", "GUR", "HAP", "HAS", "HIR",
  "HOV", "HUA", "JAM", "JAP", "JUG", "KAM", "KAP", "KAU", "KEQ",
  "KOB", "KOS", "KUR", "LAG", "LAJ", "LAK", "LEH", "LEK", "LIG",
  "LIS", "LOT", "LUG", "LUM", "LYP", "MAL", "MAS", "MAT", "MBI",
  "MES", "MIK", "MIU", "MOT", "MUR", "NAM", "NGA", "NIP", "NUK",
  "ODA", "ORA", "PAK", "POL", "PUS", "QAJ", "QEN", "RIT", "ROB",
  "RRI", "SOT", "SUP", "TEH", "THA", "TRA", "TRE", "TRU", "UJË",
  "UJI", "UJK", "UNË", "URA", "VAJ", "VAR", "VEL", "VIT", "YJE",
  "ZOG", "ZOT", "ZI", "AI", "AG",

  // ---- 4 shkronja ----
  "AFAT", "ARKA", "ARMA", "ATJE", "BABA", "BARI", "BESA", "BIMA",
  "BORA", "BORË", "BREG", "BUKA", "DASH", "DERA", "DERË", "DIEL",
  "DELL", "DITA", "DITË", "DORA", "FARA", "FIKU", "FISI", "FLAS",
  "FTUA", "FUND", "GJAH", "GJAK", "GJEL", "GOJA", "GUNA", "GURI",
  "HAPI", "HËNA", "IKU", "JETA", "KALA", "KALI", "KOHA", "KOKA",
  "KOMB", "KRAH", "KREU", "KRYE", "KUB", "KUSH", "LART", "LOJA",
  "LOPA", "LULE", "LUMI", "MACE", "MALI", "MASA", "MALL", "MBAJ",
  "MARR", "MIKU", "MISH", "MODA", "MOTI", "MUAJ", "MUZG", "NATA",
  "NATË", "NDAJ", "NDER", "NËNA", "NIPI", "NJOH", "NUSE", "PEMA",
  "PLAK", "PRES", "PULA", "PUNA", "PYLL", "QENI", "QESH", "QIRI",
  "REND", "RËRA", "SHES", "SHIU", "SHOK", "SHOH", "SYRI", "THEM",
  "TOKA", "TREN", "TRIM", "UDHA", "UJKU", "VAPA", "VDES", "VERA",
  "VERË", "VESA", "VESH", "VETE", "VITI", "VRAS", "ZANA", "ZOGU",
  "ZOTI", "SHI", "DHIA", "LIGJ", "HIU", "URI",

  // ---- 5 shkronja ----
  "ANIJA", "ANIJE", "ATDHE", "BALTA", "BARKU", "BLETA", "BUJKU",
  "BURRI", "DARKA", "DASMA", "DHOMA", "DIMRI", "DJALI",
  "DREKA", "DRITA", "FTESA", "FUSHA", "GJELI", "GJUHA", "GJUHË",
  "GRURI", "HEKUR", "KËMBA", "KËNGA", "KODRA", "KRAHU", "LEPUR",
  "LIBRI", "LAPSI", "LIQEN", "LULJA", "MBRET", "MIELL", "MOLLA",
  "MOTRA", "NDERI", "PESHK", "PLAKU", "PRAGU", "PULLA", "QIELL",
  "QYTET", "RENDI", "RUAJ", "SHESH", "SHKO", "SHPATA", "SHQIP",
  "THIKA", "UJËRA", "VAJZA", "VATRA", "VENDI", "ZEMRA", "ZONJA",
  "GJUMI", "MJALTI", "BREGU", "PUSHIM", "DARDHA", "FALJA", "FJALA",
  "SHPIE", "PIQ", "HIP", "PESHKU", "SHQIPE", "DJATHI", "FSHATI",
  "GJYSHI", "KAFSHA", "LUGINA", "MBRETI", "MUZIKA", "SËPATA",
  "DHËMBI", "GËZIMI", "QYTETI", "SHESHI", "TEATRI", "ATDHEU",
  "DIELLI", "DIELL", "FLAMUR", "GRUAJA", "GRUA", "KOMBI", "LIQENI",
  "SHKOLLA", "ZJARRI", "ZJARR", "SHQIPJA", "KUZHINA", "PUSHIMI",
  "YLLI", "YLL", "HALL", "SHKOLLË",
];

/* Verifikim bazë: vetëm shkronja të shqipes, pa dublime. */
const ALB = /^[ABCÇDEËFGHIJKLMNOPQRSTUVXYZ]+$/;
const seen = new Set();
const CLEAN = [];
for (const w of LEXICON) {
  if (!ALB.test(w)) throw new Error("Shkronjë e pavlefshme në leksik: " + w);
  if (seen.has(w)) continue;
  seen.add(w);
  CLEAN.push(w);
}

module.exports = { LEXICON: CLEAN };
