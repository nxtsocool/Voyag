const laender = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albanien" },
  { code: "DZ", name: "Algerien" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua und Barbuda" },
  { code: "AR", name: "Argentinien" },
  { code: "AM", name: "Armenien" },
  { code: "AU", name: "Australien" },
  { code: "AT", name: "Österreich" },
  { code: "AZ", name: "Aserbaidschan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesch" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgien" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivien" },
  { code: "BA", name: "Bosnien und Herzegowina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brasilien" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgarien" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Kambodscha" },
  { code: "CM", name: "Kamerun" },
  { code: "CA", name: "Kanada" },
  { code: "CF", name: "Zentralafrikanische Republik" },
  { code: "TD", name: "Tschad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Kolumbien" },
  { code: "KM", name: "Komoren" },
  { code: "CG", name: "Kongo" },
  { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Kroatien" },
  { code: "CU", name: "Kuba" },
  { code: "CY", name: "Zypern" },
  { code: "CZ", name: "Tschechien" },
  { code: "DK", name: "Dänemark" },
  { code: "DJ", name: "Dschibuti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominikanische Republik" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Ägypten" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Äquatorialguinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estland" },
  { code: "ET", name: "Äthiopien" },
  { code: "FJ", name: "Fidschi" },
  { code: "FI", name: "Finnland" },
  { code: "FR", name: "Frankreich" },
  { code: "GA", name: "Gabun" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgien" },
  { code: "DE", name: "Deutschland" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Griechenland" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Ungarn" },
  { code: "IS", name: "Island" },
  { code: "IN", name: "Indien" },
  { code: "ID", name: "Indonesien" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Irak" },
  { code: "IE", name: "Irland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italien" },
  { code: "JM", name: "Jamaika" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordanien" },
  { code: "KZ", name: "Kasachstan" },
  { code: "KE", name: "Kenia" },
  { code: "KI", name: "Kiribati" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kirgisistan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Lettland" },
  { code: "LB", name: "Libanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libyen" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Litauen" },
  { code: "LU", name: "Luxemburg" },
  { code: "MG", name: "Madagaskar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Malediven" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshallinseln" },
  { code: "MR", name: "Mauretanien" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexiko" },
  { code: "FM", name: "Mikronesien" },
  { code: "MD", name: "Moldau" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolei" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Marokko" },
  { code: "MZ", name: "Mosambik" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Niederlande" },
  { code: "NZ", name: "Neuseeland" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norwegen" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua-Neuguinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippinen" },
  { code: "PL", name: "Polen" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Katar" },
  { code: "RO", name: "Rumänien" },
  { code: "RU", name: "Russland" },
  { code: "RW", name: "Ruanda" },
  { code: "KN", name: "St. Kitts und Nevis" },
  { code: "LC", name: "St. Lucia" },
  { code: "VC", name: "St. Vincent und die Grenadinen" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "São Tomé und Príncipe" },
  { code: "SA", name: "Saudi-Arabien" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbien" },
  { code: "SC", name: "Seychellen" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapur" },
  { code: "SK", name: "Slowakei" },
  { code: "SI", name: "Slowenien" },
  { code: "SB", name: "Salomonen" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "Südafrika" },
  { code: "SS", name: "Südsudan" },
  { code: "ES", name: "Spanien" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Schweden" },
  { code: "CH", name: "Schweiz" },
  { code: "SY", name: "Syrien" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tadschikistan" },
  { code: "TZ", name: "Tansania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad und Tobago" },
  { code: "TN", name: "Tunesien" },
  { code: "TR", name: "Türkei" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "Vereinigte Arabische Emirate" },
  { code: "GB", name: "Vereinigtes Königreich" },
  { code: "US", name: "USA" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Usbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Jemen" },
  { code: "ZM", name: "Sambia" },
  { code: "ZW", name: "Simbabwe" },
]
// Nach deutschem Alphabet sortieren
laender.sort((a, b) => a.name.localeCompare(b.name, 'de'))


const countryIds = {
  // Europa
  "008": "AL", // Albanien
  "020": "AD", // Andorra
  "051": "AM", // Armenien
  "040": "AT", // Österreich
  "031": "AZ", // Aserbaidschan
  "070": "BA", // Bosnien-Herzegowina
  "056": "BE", // Belgien
  "100": "BG", // Bulgarien
  "112": "BY", // Belarus
  "196": "CY", // Zypern
  "203": "CZ", // Tschechien
  "276": "DE", // Deutschland
  "208": "DK", // Dänemark
  "233": "EE", // Estland
  "724": "ES", // Spanien
  "246": "FI", // Finnland
  "250": "FR", // Frankreich
  "268": "GE", // Georgien
  "300": "GR", // Griechenland
  "191": "HR", // Kroatien
  "348": "HU", // Ungarn
  "372": "IE", // Irland
  "376": "IL", // Israel
  "380": "IT", // Italien
  "352": "IS", // Island
  "417": "KG", // Kirgisistan
  "398": "KZ", // Kasachstan
  "438": "LI", // Liechtenstein
  "440": "LT", // Litauen
  "442": "LU", // Luxemburg
  "428": "LV", // Lettland
  "492": "MC", // Monaco
  "498": "MD", // Moldau
  "499": "ME", // Montenegro
  "807": "MK", // Nordmazedonien
  "470": "MT", // Malta
  "528": "NL", // Niederlande
  "578": "NO", // Norwegen
  "616": "PL", // Polen
  "620": "PT", // Portugal
  "642": "RO", // Rumänien
  "688": "RS", // Serbien
  "643": "RU", // Russland
  "752": "SE", // Schweden
  "705": "SI", // Slowenien
  "703": "SK", // Slowakei
  "674": "SM", // San Marino
  "792": "TR", // Türkei
  "804": "UA", // Ukraine
  "826": "GB", // Großbritannien
  "336": "VA", // Vatikan

  // Asien
  "004": "AF", // Afghanistan
  "784": "AE", // Vereinigte Arabische Emirate
  "050": "BD", // Bangladesch
  "096": "BN", // Brunei
  "064": "BT", // Bhutan
  "156": "CN", // China
  "360": "ID", // Indonesien
  "356": "IN", // Indien
  "364": "IR", // Iran
  "368": "IQ", // Irak
  "392": "JP", // Japan
  "400": "JO", // Jordanien
  "116": "KH", // Kambodscha
  "410": "KR", // Südkorea
  "408": "KP", // Nordkorea
  "414": "KW", // Kuwait
  "418": "LA", // Laos
  "422": "LB", // Libanon
  "144": "LK", // Sri Lanka
  "462": "MV", // Malediven
  "104": "MM", // Myanmar
  "496": "MN", // Mongolei
  "458": "MY", // Malaysia
  "524": "NP", // Nepal
  "512": "OM", // Oman
  "608": "PH", // Philippinen
  "586": "PK", // Pakistan
  "275": "PS", // Palästina
  "634": "QA", // Katar
  "682": "SA", // Saudi-Arabien
  "702": "SG", // Singapur
  "760": "SY", // Syrien
  "764": "TH", // Thailand
  "762": "TJ", // Tadschikistan
  "795": "TM", // Turkmenistan
  "626": "TL", // Timor-Leste
  "860": "UZ", // Usbekistan
  "704": "VN", // Vietnam
  "887": "YE", // Jemen

  // Afrika
  "024": "AO", // Angola
  "204": "BJ", // Benin
  "854": "BF", // Burkina Faso
  "108": "BI", // Burundi
  "072": "BW", // Botswana
  "140": "CF", // Zentralafrikanische Republik
  "384": "CI", // Elfenbeinküste
  "120": "CM", // Kamerun
  "180": "CD", // DR Kongo
  "178": "CG", // Kongo
  "174": "KM", // Komoren
  "132": "CV", // Kap Verde
  "262": "DJ", // Dschibuti
  "012": "DZ", // Algerien
  "818": "EG", // Ägypten
  "232": "ER", // Eritrea
  "231": "ET", // Äthiopien
  "266": "GA", // Gabun
  "288": "GH", // Ghana
  "324": "GN", // Guinea
  "226": "GQ", // Äquatorialguinea
  "270": "GM", // Gambia
  "624": "GW", // Guinea-Bissau
  "404": "KE", // Kenia
  "430": "LR", // Liberia
  "426": "LS", // Lesotho
  "434": "LY", // Libyen
  "504": "MA", // Marokko
  "450": "MG", // Madagaskar
  "466": "ML", // Mali
  "478": "MR", // Mauretanien
  "480": "MU", // Mauritius
  "454": "MW", // Malawi
  "508": "MZ", // Mosambik
  "516": "NA", // Namibia
  "562": "NE", // Niger
  "566": "NG", // Nigeria
  "646": "RW", // Ruanda
  "678": "ST", // São Tomé und Príncipe
  "686": "SN", // Senegal
  "706": "SO", // Somalia
  "729": "SD", // Sudan
  "694": "SL", // Sierra Leone
  "710": "ZA", // Südafrika
  "728": "SS", // Südsudan
  "748": "SZ", // Eswatini
  "148": "TD", // Tschad
  "768": "TG", // Togo
  "788": "TN", // Tunesien
  "834": "TZ", // Tansania
  "800": "UG", // Uganda
  "690": "SC", // Seychellen
  "894": "ZM", // Sambia
  "716": "ZW", // Simbabwe

  // Amerika
  "032": "AR", // Argentinien
  "028": "AG", // Antigua und Barbuda
  "533": "AW", // Aruba
  "052": "BB", // Barbados
  "084": "BZ", // Belize
  "068": "BO", // Bolivien
  "076": "BR", // Brasilien
  "060": "BM", // Bermuda
  "124": "CA", // Kanada
  "152": "CL", // Chile
  "170": "CO", // Kolumbien
  "188": "CR", // Costa Rica
  "192": "CU", // Kuba
  "531": "CW", // Curaçao
  "212": "DM", // Dominica
  "214": "DO", // Dominikanische Republik
  "218": "EC", // Ecuador
  "238": "FK", // Falklandinseln
  "308": "GD", // Grenada
  "254": "GF", // Französisch-Guayana
  "320": "GT", // Guatemala
  "328": "GY", // Guyana
  "340": "HN", // Honduras
  "332": "HT", // Haiti
  "388": "JM", // Jamaika
  "136": "KY", // Kaimaninseln
  "659": "KN", // St. Kitts und Nevis
  "662": "LC", // St. Lucia
  "484": "MX", // Mexiko
  "558": "NI", // Nicaragua
  "591": "PA", // Panama
  "604": "PE", // Peru
  "630": "PR", // Puerto Rico
  "600": "PY", // Paraguay
  "740": "SR", // Suriname
  "222": "SV", // El Salvador
  "780": "TT", // Trinidad und Tobago
  "840": "US", // USA
  "858": "UY", // Uruguay
  "670": "VC", // St. Vincent
  "862": "VE", // Venezuela
  "092": "VG", // Britische Jungferninseln
  "850": "VI", // US Jungferninseln

  // Ozeanien
  "036": "AU", // Australien
  "242": "FJ", // Fidschi
  "316": "GU", // Guam
  "296": "KI", // Kiribati
  "584": "MH", // Marshallinseln
  "583": "FM", // Mikronesien
  "520": "NR", // Nauru
  "554": "NZ", // Neuseeland
  "585": "PW", // Palau
  "598": "PG", // Papua-Neuguinea
  "090": "SB", // Salomonen
  "776": "TO", // Tonga
  "798": "TV", // Tuvalu
  "548": "VU", // Vanuatu
  "882": "WS", // Samoa
}

export default laender