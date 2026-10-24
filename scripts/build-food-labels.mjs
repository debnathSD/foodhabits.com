#!/usr/bin/env node
/**
 * Builds src/data/food-labels.json from the AIY food model's label map.
 *
 * Every class the model can predict is assigned one of the food categories in
 * src/data/categories.ts (which carry the nutrition and gut-health profile),
 * plus a diet and allergens inferred from the dish name. Edit OVERRIDES below
 * to fix a dish, then run:
 *
 *   node scripts/build-food-labels.mjs
 *
 * Output: an array aligned with the model's output indices. Each entry is
 * [displayName, category, diet | null, allergens] or null for classes the app
 * should never show (the background class and unnamed Knowledge Graph ids).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const csv = readFileSync(join(root, 'scripts/data/aiy-food-v1-labels.csv'), 'utf8');

export const CATEGORIES = [
  'bread', 'wholegrain_bread', 'fried_bread', 'stuffed_bread', 'savory_pastry',
  'rice_plain', 'rice_dish', 'fried_rice', 'porridge', 'oats_cereal',
  'noodle_soup', 'noodles', 'pasta', 'creamy_pasta', 'dumplings', 'fermented_batter',
  'pizza', 'burger', 'sandwich', 'hot_dog', 'taco_burrito', 'fries', 'potato',
  'fried_snack', 'chaat', 'fried_meat', 'fried_seafood', 'grilled_meat', 'red_meat',
  'processed_meat', 'meat_stew', 'curry_meat', 'curry_creamy', 'curry_veg', 'legumes', 'stir_fry',
  'tofu_soy', 'fish', 'seafood', 'raw_fish', 'egg_dish', 'salad', 'creamy_salad',
  'veg_dish', 'fried_veg', 'soup_clear', 'soup_creamy', 'soup_veg', 'fermented_veg',
  'casserole', 'cheese_dish', 'yogurt', 'cake_pastry', 'fried_sweet', 'milk_sweet',
  'frozen_dessert', 'sweets_candy', 'steamed_sweet', 'fish_curry', 'sweet_yogurt', 'chutney', 'pancake_waffle', 'breakfast_plate',
  'fruit', 'fruit_dessert', 'nuts_seeds', 'dips', 'mixed_plate', 'mixed',
];

/** First match wins. Names are matched case-insensitively. */
const RULES = [
  ['pizza', /pizza|pissaladière|flammekueche|sardenara|coca$/],
  ['hot_dog', /hot dog|chili dog|cheese dog|corn dog|bagel dog|hamdog|dodger dog|hot wiener|half-smoke|pigs in a blanket|frikandel|pepperoni roll|polish$/],
  ['burger', /burger|jucy lucy|patty melt/],
  ['raw_fish', /sushi|sashimi|\bpoke\b|ceviche|aguachile|gravlax|yusheng|hinava/],
  ['fried_seafood', /fried fish|fried shrimp|tempura|ikan goreng|prawn ball|clam cake|moules-frites|rolled oyster|oysters en brochette|crab cake|fish and chips/],
  ['fried_meat', /fried chicken|chicken nugget|chicken fingers|schnitzel|katsu(?!don)|chicken fried|karaage|kotlet|cordon bleu|escalope|buffalo wing|swiss wing|hot chicken|orange chicken|sesame chicken|ayam goreng|har cheong gai|double down|chicken française|finger steaks|chicken fried bacon/],
  ['sandwich', /sandwich|po' boy|muffuletta|\bblt\b|wrap$|gyro|shawarma|french dip|beef on weck|italian beef|cheesesteak|sloppy joe|runza|pan bagnat|jibarito|cemita|pambazo|^torta$|mollete|smørrebrød|lobster roll|spiedie|francesinha|mitraillette|fluffernutter|pastrami on rye|beef manhattan|hot brown|turkey devonshire|bridie|barm cake|stottie|kaya toast|french toast|milk toast|pa amb tomàquet|bolillo|pistolette/],
  ['taco_burrito', /taco|burrito|quesadilla|enchilada|nachos|tostada|chimichanga|fajita|chalupa|gordita|huarache|\bsope\b|tlayuda|tlacoyo|panucho|salbute|taquito|chilaquiles|entomatada|memela|molote|sincronizada|gringas|arizona cheese crisp/],
  ['fries', /fries|chips and dip|potato skins|hash brown|potato wedges|potatoes o'brien|rösti|boxty|totopo|chocolate-covered potato chips/],
  ['fried_rice', /fried rice|chahan|arroz chaufa/],
  ['noodle_soup', /noodle soup|ramen|\bpho\b|udon(?! yaki)|\bsoba\b|laksa|khao soi|thukpa|lamian|hulatang|bún bò|bún riêu|bún ốc|soto mie|wonton noodles|janchi-guksu|kal-guksu|naengmyeon|mak-guksu|misua|mixian|crossing-the-bridge|yaka mein|champon|nam ngiao|boat noodles|bánh canh|mie kocok|ohn no khao swè|meeshay|mont di|acorn noodle|duck blood and vermicelli/],
  ['noodles', /noodle|chow mein|lo mein|pad thai|yakisoba|yaki udon|chow fun|char kway teow|japchae|zhajiangmian|dandan|biangbiang|liangpi|hiyashi|yi mein|lai fun|shahe fen|banmian|ants climbing|drunken noodles|phat si-io|mi krop|cumian|youmian|mee pok|mee siam|kesme|mie kangkung|liangfen/],
  ['creamy_pasta', /carbonara|macaroni and cheese|lasagne|alfredo|pastitsio|tetrazzini|johnny marzetti|chicken riggies|dirty macaroni|american chop suey|giouvetsi|pizzoccheri|túrós csusza|bryndzové halušky|strapačky|kaassoufflé/],
  ['creamy_salad', /pasta salad|macaroni salad|potato salad|coleslaw|waldorf salad|salată de boeuf|seven-layer salad|cobb salad|snickers salad|cookie salad|jello salad|watergate salad|frogeye salad|ambrosia|celery victor|michigan salad|shrimp louie|crab louie/],
  ['pasta', /spaghetti|pasta|garganelli|malloreddus|pansotti|passatelli|pisarei|gnocchi|spätzle|halušky|kopytka|schupfnudel|toasted ravioli|macaroni soup|mlinci|sweet shells/],
  ['dumplings', /dumpling|jiaozi|gyoza|wonton|pierogi|khinkali|manti|mandu|xiaolongbao|shumai|har gow|baozi|bánh bao|nikuman|cha siu bao|maultasche|chuchvara|kalduny|knödel|knedle|dim sum|fun guo|kozhukkatta|momo$|kroppkaka|pelmeni|kibinai|kūčiukai|germknödel|dampfnudel|leberknödel|mantou|bánh bột lọc|corunda|tamale|zongzi|bánh chưng/],
  ['fermented_batter', /idli|dosa|dhokla|appam|idiyappam|puttu|injera|lahoh|kenkey|sanna|enduri pitha|ponganalu|punugulu|baghrir|bánh xèo|bánh cuốn|bibingka|puto$|kutsinta|khanom chan/],
  ['fermented_veg', /kimchi(?! fried rice|-jjigae|-buchimgae)|sauerkraut|pickled cucumber|tsukemono|gundruk|dongchimi|curtido|murături|pao cai|tempoyak|nabak-kimchi|baek-kimchi|namasu|kinema|nattō|natto|stinky tofu|tapai|jiuniang|shiokara|cincalok|rakfisk|lutefisk|fesikh|umeboshi/],
  ['rice_dish', /biryani|pilaf|pulao|paella|risotto|jambalaya|arroz|jollof|nasi |dirty rice|spanish rice|majboos|\bmandi\b|maqluba|bibimbap|claypot|chicken rice|duck rice|omurice|loco moco|hayashi rice|curry rice|donburi|gyūdon|katsudon|oyakodon|tekkadon|takikomi|kamameshi|kateh|chitranna|puliyogare|vangibath|galinhada|waakye|thieboudienne|red rice|cơm tấm|xôi|lo mai gai|onigiri|gimbap|spam musubi|tamago kake gohan|chazuke|zosui|sekihan|ogok-bap|red beans and rice|rice and gravy|dal bhat|kushari|bento|ketupat|lontong|nasi|kedgeree|kitcha|chicken bog|hoppin' john|fideuà|lemang|ambuyat|suman$|sadhya|cachupa|glorified rice/],
  ['rice_plain', /white rice|coconut rice/],
  ['porridge', /congee|porridge|grits|polenta|upma|ugali|fufu|banku|\beba\b|amala|nshima|\bpap\b|mămăligă|kačamak|žganci|tuwo|asida|\bogi\b|akple|kokonte|konkonte|funge|garri|\bgari\b|attiéké|gachas|mudde|champorado|canjica|vispipuuro|kutia|harees|haleem|keşkek|tarhana|pirao|frangollo|gofio|hasty pudding|ostropel|popara|dhindo|kondowole|ogi$|koozh|sago$|zarangollo|jolpan|panjiri|tuo zaafi|omo tuo|wotou|khichdi|khichu|sabudana khichadi|bazin|kisra|talo$|aseeda|ciulama/],
  ['oats_cereal', /oatmeal|muesli|granola|oat |havregrynskugle|cranachan|protein bar/],
  ['curry_creamy', /butter chicken|tikka masala|korma|shahi paneer|pasanda|malai|makhani|murgh musallam|khoya|navratan/],
  ['curry_meat', /curry|rogan josh|vindaloo|karahi|nihari|xacuti|qeema|keema|rendang|gulai|massaman|phanaeng|kaeng|asam pedas|opor|kare-kare|caldereta|kaldereta|machher jhol|sarapatel|balchão|cafreal|chicken chettinad|bhuna|jalfrezi|ayam masak merah|amok trey|kedjenou|yassa|muamba|moambe|wat$|doro wat|sukka|fesenjān|gheimeh|ghormeh sabzi|khoresh|tajine|tagine|mrouzia|chakapuli|chanakhi|kharcho|chikhirtma|satsivi|kalduny/],
  ['curry_veg', /aloo gobi|dum aloo|palak paneer|sarson da saag|baingan|bhindi|chakalaka|sayur lodeh|sayur asem|ghugni|usal|misal|kadhi|jhunka|majjige huli|pachi pulusu|ema datshi|kosambari|undhiyu|avial|thoran|poriyal|mulukhiyah|ndolé|efo riro|ogbono|miyan kuka|caruru|kaipen|sabzi|bhaji$|zunka/],
  ['legumes', /\bdal\b|dal makhani|rajma|chana|chole(?! bhature)|sambar|hummus|lentil|bean soup|bean pie|fasolada|fasole|pasulj|lobio|gigandes|revithia|ful medames|shahan ful|fabada|feijão|feijoada|frijoles|refried|baked beans|cowboy beans|pork and beans|succotash|umngqusho|minestra di ceci|shiro|misir|kik alicha|moin moin|akara|acarajé|koki|harira|lablabi|tavče gravče|pasta e fagioli|senate bean|pea soup|split pea|cassoulet|chili con carne|cincinnati chili|frejon|ezogelin|ash reshteh|baghali ghatogh|leblebi|falafel|bean$|beans$|edamame|soybean sprout|dhal|panchmel/],
  ['tofu_soy', /tofu|doufu|douhua|tahu|tempeh|yuba|tofu skin|buddha's delight|burmese tofu|tahu sumedang|tahu goreng|tahu tek-tek|hiyayakko|agedashi/],
  ['seafood', /shrimp|prawn|crab|lobster|clam|oyster|mussel|scallop|squid|octopus|cuttlefish|calamari|scampi|cockle|sea cucumber|seafood|étouffée|bouillabaisse|caldeirada|buridda|cioppino|paling|eel|unagi|abalone|conch|san-nakji|baccalà|bacalhau|brandade|psarosoupa|ukha|fisherman's soup|caldo de siete mares|caldillo|matelote|zuppa di pesce|cullen skink|finnan haddie|arbroath smokie|kipper|rollmops|dressed herring|herring|sardine|anchov|tarama|karasumi|pollock roe|shrimp roe|ankimo|fugu|masgouf|yin yang fish|fish head|fish slice|fish ball|huachinango|sambal stingray|stingray|tuna pot|vitello tonnato/],
  ['fish', /fish|salmon|tuna|cod\b|haddock|mackerel|trout|tilapia|pomfret|hilsa|bass|snapper|halibut|ikan|amok/],
  ['egg_dish', /omelet|omelette|frittata|shakshouka|shakshuka|eggs benedict|eggs sardou|eggs neptune|huevos|menemen|çılbır|scrambled|deviled egg|century egg|tea egg|soy egg|chawanmushi|gyeran|steamed eggs|tamagoyaki|egg drop|oeufs|egg$|eggs$|khai yat sai|yam khai dao|hangtown fry|creamed eggs|kerak telor|egg curry|chinese steamed eggs|stir-fried tomato and scrambled eggs|tomato and egg/],
  ['processed_meat', /sausage|salami|pepperoni|bratwurst|kielbasa|chorizo|andouille|wurst|bologna|mortadella|prosciutto|jamón|jamon|\bham\b|bacon|pâté|pate\b|black pudding|blood sausage|boudin|merguez|chistorra|fuet|ciauscolo|loukaniko|cudighi|debrecener|landjäger|andouillette|botifarra|kabanos|frankfurter|spam|chinese sausage|lap cheong|bakkwa|lebanon bologna|pemmican|kilishi|jerky|salo$|ciccioli|cecina|skilandis|smoked meat|corned beef|pastrami|pork roll|scrapple|goetta|leberkäse|falukorv|isterband|prinskorv|fläskkorv|medisterpølse|rullepølse|moronga|morcilla|blodpalt|mustamakkara|kalakukko|balkenbrij|qazı|sai ua|chả lụa|naem|kokoretsi|mititei|ćevapi|pljeskavica|frikadeller|slavink|bamischijf|sheftalia|skilpadjies|sundae$/],
  ['grilled_meat', /kebab|kabab|satay|sate|yakitori|souvlaki|shashlik|tandoori|tikka|shish|churrasco|espetada|suya|sosatie|arrosticini|chislic|pincho|anticucho|yakiniku|jingisukan|bulgogi|galbi|dak-galbi|kai yang|ayam bakar|mu kratha|barbecue|bbq|roast chicken|cornish game hen|squab|peking duck|duck|turkey|turducken|chicken|frigărui|ćevap/],
  ['meat_stew', /stew|goulash|gulyás|coq au vin|bourguignon|stroganoff|ragout|ragù|carbonade|cocido|olla|pot-au-feu|potée|garbure|cawl|scotch broth|burgoo|booyah|mulligan|lapskaus|labskaus|stamppot|hachee|pörkölt|paprikash|chakapuli|beef stew|irish stew|daube|navarin|blanquette|fricassée|fricasse|tajine|adobo|kaldereta|menudo|pozole|birria|barbacoa|carnitas|cochinita|ropa vieja|picadillo|machaca|chilorio|nikujaga|sukiyaki|shabu-shabu|hot pot|jeongol|jjigae|tang$|-tang|guk$|-guk|bak kut teh|seolleongtang|samgye-tang|haejang|chueo|beshbarmak|naryn|kuurdak|dimlama|lagman|khash|harissa|piti|bozbash|sopa|caldo|ciorbă|chorba|solyanka|rassolnik|shchi|borscht|okroshka|kharcho/],
  ['red_meat', /steak|beef|roast|lamb|mutton|pork|veal|venison|ribs|brisket|oxtail|tripe|liver|kidney|tongue|meatball|meatloaf|meat|köttbullar|kofta|kibbeh|chops|loin|filet|schweinshaxe|suckling pig|lechazo|méchoui|pinnekjøtt|smalahove|fårikål|tafelspitz|sauerbraten|svíčková|char siu|siu yuk|kakuni|jokbal|bossam|pork belly|carne|bistek|bò |thịt|babi|gepuk|empal|tongseng|sop |sarburma|qutab|bolani|zrazy|frikadel|millionbøf|salisbury|swiss steak|london broil|grillades|burnt ends|bull roast|stuffed ham|rostbrätel|vanillerostbraten|saltimbocca|veal orloff|tantuni|horumonyaki|gopchang|makchang|mala mogodu|dobradinha|tripes|pieds|sarapatel|kitfo|gored gored|laap|larb|nam tok|laping|choila|chaku|sekuwa|bo 7 món/],
  ['soup_creamy', /chowder|bisque|cream of|vichyssoise|creamed corn|corn crab soup|she-crab|cullen|bookbinder|lobster newberg/],
  ['soup_clear', /miso soup|consommé|dashi|broth|egg drop soup|wonton soup|suimono|tom yum|tom kha|caldo de pollo|soto|sinigang|rasam|clear soup|chicken soup|avgolemono|magiritsa|zōni|tteokguk|mandu-guk|miyeok-guk|bún|oden|samgye|galbi-tang|ori-tang|maeun-tang|lung fung|turtle soup|shark fin|buddha jumps|cantonese seafood soup|hochzeitssuppe|ciorbă de perișoare|chikhirtma|tekwan|bakso|draw soup|peppersoup|pepper soup|toyga|tarator|fugu chiri|pork blood soup|liver soup|tripe soup|oxtail soup|sopa de gato|dak-bokkeum-tang/],
  ['soup_veg', /soup|gazpacho|salmorejo|ajoblanco|minestrone|ribollita|acquacotta|garmugia|pappa al pomodoro|borscht|shchi|okroshka|harira|solkadhi|pakhala|rose hip|cucumber soup|lettuce soup|leek soup|sorrel|cabbage soup|tomato compote|consommé|gazpachuelo|porra|zuppa|potage|velouté|bread soup|sop saudara/],
  ['salad', /salad|fattoush|tabbouleh|kachumbari|vinegret|caprese|niçoise|som tam|gado-gado|ketoprak|urap|lawar|pecel|kosambari|asinan|rujak|miang kham|larb|yam |gỏi|namul|chwinamul|pkhali|dakos|kachumber|pico de gallo|chermoula|matbukha|zaalouk|kisir|jeow|lalab|ulam|hoe$/],
  ['veg_dish', /ratatouille|caponata|baba ghanoush|escalivada|pisto|piperade|ajapsandali|lecsó|sataraš|ghivetch|stuffed peppers|punjena paprika|dolma|sarma|cabbage roll|gołąbki|stuffed squash|imam bayıldı|karnıyarık|alinazik|tepsi baytinijan|makdous|spanakorizo|chanpurū|buddha's delight|mashed pumpkin|nopalito|elote|esquites|creamed spinach|greens$|utica greens|colcannon|champ$|stoemp|trinxat|tavë|fasolakia|bamia|okra|aloo|sabzi|bharta|chokha|saag|gai lan|kangkung|kale|spinach|broccoli|cauliflower|eggplant|zucchini|mushroom|vegetable|veggie|stir-fried|chop suey|dovga|chakhchoukha|florina pepper|rajas con crema|urnebes|tirokafteri|ajvar|kopanisti|baba|pinakbet|laulau|kalakukko|santula|serundeng/],
  ['fried_veg', /fried eggplant|onion ring|fried green tomatoes|fried plantain|plantain|alloco|dodo|tostones|fried okra|fried zucchini|carciofi alla giudia|tempura vegetables|bhaji$|bakwan|panelle|milho frito|lekor|tahu goreng|mücver/],
  ['fried_snack', /samosa|pakora|bhaji|kachori|vada|spring roll|egg roll|chả giò|popiah|lumpia|croquette|korokke|arancini|fritter|hushpuppy|mozzarella sticks|jalapeño popper|falafel|empanada|briouat|bolani|murtabak|pirozhki|pirog|calzone|stromboli|panzerotti|chebureki|curry bread|pastel$|taquito|kroket|bitterballen|takoyaki|okonomiyaki|pajeon|buchimgae|bindaetteok|jeon$|kushikatsu|pakoda|bhajji|bonda|tikki|cutlet|vadai|bajji|mirchi|sev|chakli|murukku|bombay mix|namkeen|mathri|khakhra|thalipeeth|nimki|nippattu|chivda|mixture|banana chips|papad|chips$|crisps$|crackers|pretzel|cheese straw|taralli|grissini|potato chips|tortilla chips|nachos$|cuchifritos|alcapurria|bacalaíto|pastelillo|coxinha|kibbeh$|acarajé|akara|puff puff|chin chin|kokis|murukku|chakodi|baji$/],
  ['chaat', /chaat|pani puri|golgappa|bhel|sev puri|dahi puri|papdi|dahi vada|aloo tikki|pav bhaji|vada pav|ragda|samosa chaat|kachori chaat|dabeli|misal pav|kombdi vade/],
  ['fried_bread', /puri$|bhatura|bhature|luchi|frybread|fry bread|fried dough|youtiao|sel roti|gnocco fritto|lángos|vetkoek|sopaipilla|oliebol|bambalouni|sfenj|boortsog|ka'ak|pampushka|uštipci|fritule|beignet|langos|calas|zeppole|mandazi|mekitsa|pathiri|bakarkhani/],
  ['stuffed_bread', /paratha|kulcha|khachapuri|lobiani|gözleme|piadina|crescentina|borlengo|bolo do caco|manakish|laobing|shaobing|cong you bing|bing$|jianbing|roti jala|murtabak|qutab|bolani|chapati|litti|kesra|pita|pide|lavash|naan|kulich|focaccia|schiacciata|fougasse|coca$|pizza bagel|torta pasqualina|erbazzone|scacciata|crescia|tigella|farinata|socca|cheese dream|stottie/],
  ['savory_pastry', /pie$|pot pie|pasty|pastie|quiche|börek|burek|banitsa|spanakopita|tiropita|kolokythopita|karydopita|empanada|pastel|coulibiac|pastilla|bastilla|pirog|pirozhki|knish|sausage roll|vol-au-vent|bridie|bedfordshire clanger|natchitoches|scotch pie|karelian pasty|kalakukko|plăcintă|zelnik|gibanica|flaouna|samsa|sfiha|fatayer|chebureki|calzone|tourtière|pithivier|bougatsa|galette|gougère|cheese straw|quiche|torta|tart$|tarte flambée|vatrushka/],
  ['bread', /bread|loaf|roll$|bun$|buns$|bagel|baguette|brioche|challah|ciabatta|toast|rusk|biscuit$|biscuits$|scone|muffin|crumpet|english muffin|pretzel|focaccia|khubz|pita|naan|kulcha|pav$|mantou|anpan|melonpan|kifli|bolillo|manchet|farl|cottage loaf|parker house|popover|zopf|korovai|kalach|paska|tsoureki|cozonac|panettone|kulich|babka|stollen|pane |pan de|pain|broa|cornbread|johnnycake|spoonbread|corn bread|potbrood|blaa|bap|barm|cob|stottie|veda|bara brith|barmbrack|teacake|beaten biscuit|pogača|pogacha|lepinja|somun|simit|bublik|obi non|tandir|lavash|yufka|pane carasau|tortell/],
  ['wholegrain_bread', /rye bread|pumpernickel|wholemeal|whole wheat|multigrain|bhakri|jolada rotti|ragi|roti$|chapati|phulka|thepla|missi|makki|bajra|jowar|thalipeeth|nachni|dhebra|khakhra|injera|kisra|ploye|tortilla$/],
  ['pancake_waffle', /pancake|waffle|crêpe|crepe|blini|blintz|palatschinke|pannenkoek|poffertjes|dutch baby|syrniki|racuchy|fläskpannkaka|hotteok|dorayaki|apam balik|martabak manis|kaiserschmarrn|ploye|crumpet|johnnycake|hoppang|pajeon|jeon|bánh xèo|okonomiyaki|chilla|cheela|uttapam|pesarattu|malpua|crumpets/],
  ['frozen_dessert', /ice cream|sundae|frozen yogurt|kulfi|gelato|sorbet|sorbetes|shaved ice|shave ice|kakigōri|halo-halo|ais kacang|falooda|knickerbocker|banana split|frozen banana|popsicle|granita|arctic roll|baked alaska|spumoni|semifreddo|patbingsu|bingsu|cendol|chè|tong sui|bionico/],
  ['milk_sweet', /kheer|payasam|rice pudding|rasgulla|rasmalai|ras malai|basundi|kalakand|sandesh|chhena|chomchom|cham cham|rabri|rabdi|shrikhand|doodhpak|phirni|firni|halwa|barfi|burfi|peda|kaju katli|mysore pak|kalakand|pantua|sheer khurma|qubani|double ka meetha|shahi tukda|flan|crème brûlée|creme brulee|crème caramel|custard|pudding|panna cotta|bavarian cream|blancmange|mousse|trifle|tiramisu|tres leches|risalamande|teurgoule|muhallebi|sütlaç|malabi|mahalabia|haupia|tapioca|sago pudding|tembleque|natilla|dulce de leche|cajeta|leche flan|floating island|zabaglione|syllabub|eton mess|posset|fool$|flummery|kissel|kisel|watalappam|leche|khir|khira sagara|basbousa|sfouf|kanafeh|knafeh|ghevar|modak|ladoo|laddu|gajar|pumpkin-coconut custard|douhua|annin tofu|mango pudding|grass jelly|guilinggao|chongos|cocada|quindim|brigadeiro|beijinho/],
  ['fried_sweet', /doughnut|donut|churro|jalebi|imarti|gulab jamun|funnel cake|beignet|lokma|loukoumades|luqaimat|malpua|balushahi|khaja|anarsa|sfenj|bambalouni|zeppole|sopapilla|oliebol|berliner|krofne|krapfen|pączki|paczki|bomboloni|fritule|struffoli|chiacchiere|angel wings|kroštule|diples|crostoli|bugnes|cronut|maple bacon donut|boston cream doughnut|tulumba|bamiyeh|zalabia|koeksister|gujia|karanji|shakarpara|chhena jalebi|mandazi|puff puff|fried pie|fried ice cream|fried coke|apple fritter|youtiao|jian dui|sesame ball|kuih|nian gao|sachima|kokis|cartellate|chakli|pootharekulu|ariselu|arisa pitha|enduri|kakara pitha|teurgoule/],
  ['steamed_sweet', /mochi|dango|daifuku|taiyaki|bungeo-ppang|imagawayaki|dorayaki|manjū|manju|namagashi|higashi|uirō|warabimochi|yokan|anpan|mooncake|hong dou tang|red bean|black sesame soup|tangyuan|zongzi|nian gao|tteok|chapssal-tteok|hanabiramochi|gyūhi|amanattō|yaksik|kuih|seri muka|sapin-sapin|kalamay|palitaw|suman|puto|kutsinta|bibingka|bánh|xôi|che$|chè|thapthim krop|khanom|tub tim krob|lod chong|sticky rice|mango sticky rice|kakigōri|guilinggao|grass jelly|douhua|tong sui|yin si juan|hotteok|gyeran-ppang|hoppang|mamoul|ma'amoul|melonpan/],
  ['sweets_candy', /candy|chocolate(?! cake| pudding| chip cookie| brownie)|fudge|toffee|caramel|nougat|turrón|torrone|halva|halwa$|jelly bean|marshmallow|brittle|praline|marzipan|lollipop|liquorice|licorice|taffy|gumdrop|krówki|szaloncukor|polkagris|calisson|candied|sugar|sweets|chikki|gajak|rewri|tilkut|til|soan papdi|patisa|sohan|petha|murabba|ladoo|laddu|peda|barfi|kaju katli|mysore pak|churchkhela|gozinaki|panellets|turron|alfajor|brigadeiro|cocada|dulce|panocha|pinole|dodol|kalu dodol|sesame seed candy|candied almonds|rice krispies treats|scotcheroos|haystack|s'more|tanghulu|sukhdi|sutarfeni|boondi|thekua|anarsa|ghari|balushahi|mohanthal|kansar|churma|panjiri|kozhukkatta/],
  ['cake_pastry', /cake|torte|tart$|tarte|tartlet|pie$|cheesecake|brownie|blondie|cookie|biscuit|biscotti|shortbread|macaron|macaroon|madeleine|financier|éclair|eclair|profiterole|choux|croquembouche|mille-feuille|napoleon|croissant|pain au chocolat|danish|cinnamon roll|strudel|baklava|pakhlava|kanafeh|galaktoboureko|bougatsa|sfogliatella|cannoli|pastry|pastel de nata|kouign-amann|kringle|babka|kolach|kolache|rugelach|hamantash|whoopie|snickerdoodle|speculaas|stroopwafel|gingerbread|lebkuchen|pfeffernüsse|panforte|fruitcake|stollen|panettone|pandoro|bundt|gugelhupf|kugelhopf|savarin|rum baba|charlotte|bavarois|dacquoise|opera|pavlova|meringue|muffin|cupcake|scone|bun$|buchteln|bear claw|kürtőskalács|trdelník|šakotis|spettekaka|baumkuchen|chiffon|roll cake|swiss roll|yule log|bûche|parfait|dessert bar|lemon bar|nanaimo|ma'amoul|ghoriba|makroudh|kaak|ka'ak|melomakarono|finikia|koulourakia|kourabiedes|polvorón|alfajores|chocotorta|choco pie|marie biscuit|fortune cookie|wafer|waffle cookie|langue de chat|amaretti|brandy snaps|florentine|tuile|cobbler|crumble|crisp$|grunt|slump|buckle|pandowdy|betty|clafoutis|far breton|vlaai|rijstevlaai|bossche bol|tompouce|bolus|krentenbol|gebak|sachertorte|dobos|esterházy|linzer|rigó jancsi|krempita|kremšnita|bundevara|gibanica|princess cake|prinsesstårta|semla|kanelbulle|runeberg|mazurek|makowiec|sernik|piernik|pączki|kołacz|medovik|napoleon|ptichye moloko|korovai|kulich|paskha|vatrushka|syrniki|mince pie|bakewell|treacle tart|eccles|banbury|chelsea bun|bath bun|london bun|saffron bun|hot cross|teacake|lardy|bara brith|barmbrack|welsh cake|singing hinny|stottie|parkin|flapjack|jam roly-poly|spotted dick|sticky toffee|bread and butter pudding|summer pudding|christmas pudding|figgy pudding|sussex pond|clootie|cabinet pudding|eve's pudding|malvern pudding|cottage pudding|waldorf pudding|persimmon pudding|corn pudding|suet pudding|tipsy cake|press cake|pound cake|angel food|devil's food|red velvet|carrot cake|black forest|tres leches|boston cream|mississippi mud|key lime|pecan pie|pumpkin pie|sweet potato pie|apple pie|cherry pie|blueberry pie|blackberry pie|rhubarb pie|grape pie|chess pie|shoofly|buttermilk pie|cream pie|banoffee|lemon meringue|chiffon pie|black bottom|maraca pie|bob andy|sugar cream|derby pie|lemon ice box|icebox cake|dirt cake|stack cake|jam cake|hummingbird|lane cake|lady baltimore|doberge|gooey butter|marry girl|happy faces|snack cake|honey cake|coconut cake|apple cake|hot milk cake|ice cream cake|ostkaka|smulpaj|kladdkaka|bienenstich|zwetschgenkuchen|schuxen|magenbrot|nut roll|nusstorte|tarta de santiago|torta caprese|torta tre monti|spongata|pastiera|cassata|zuppa inglese|castella|kasutera|bolo|broa$|pan dulce|concha|rosca de reyes|pan de muerto|king cake|galette des rois|tortell|vasilopita|tsoureki|cozonac|panettone|paska|folar|ensaïmada|coca|tortas de aceite|gâteau|petit gâteau|torta/],
  ['fruit_dessert', /bananas foster|cherries jubilee|apple dumpling|tarte tatin|apple crisp|apple strudel|compote|kompot|rødgrød|kissel|poached pear|stewed|fruit salad|ambrosia|tufahije|slatko|mostarda|moustalevria|sour cherry soup|rose hip soup|blåbärssoppa|fruktsoppa|brown betty|bionico|frozen banana|banana pudding|strawberry delight|eton mess|summer pudding|apple cake|clafoutis|cobbler|crumble/],
  ['fruit', /^fruit|fruit platter|mango$|apple$|banana$|orange$|grape$|watermelon|papaya$|pineapple$|guava|berries|strawberr|melon$/],
  ['nuts_seeds', /nut$|nuts$|almond|peanut$|cashew|pistachio$|walnut|trail mix|candied almonds|kuli-kuli|chikki|seeds$/],
  ['yogurt', /yogurt|yoghurt|curd$|raita|lassi|kefir|skyr|labneh|tzatziki|cacık|tarator|ayran|dahi$|shrikhand|mishti doi|buttermilk koldskål|majjige|chaas|obatzda|quark|quarkkäulchen|túró|cottage cheese/],
  ['cheese_dish', /cheese|raclette|fondue|welsh rarebit|rarebit|halloumi|saganaki|frico|aligot|truffade|tartiflette|smažený sýr|ġbejna|queijo|queso|paneer$|obatzda|kartoffelkäse|liptauer|mozzarella|burrata|brie|camembert|raclette|kaasstengels/],
  ['casserole', /casserole|gratin|moussaka|shepherd|cottage pie|tartiflette|hotdish|janssons|funeral potatoes|baeckeoffe|lasagna|pastitsio|parmigiana|tavë kosi|green bean casserole|tuna casserole|chicken divan|chicken à la king|chicken vesuvio|hawaiian haystack|johnny marzetti|american goulash|tetrazzini|kugel|börek|sformato|timballo|sartù|tiella|cassoulet|potato bake|scalloped|dauphinois|savoyarde|soufflé|mac and cheese|tamale pie|pot pie|cottage|tourtière|meatcake|smörgåstårta|žemlovka|ollada/],
  ['potato', /potato|patate|kartoffel|aloo|papas|batata|mash$|mashed|salt potatoes|baked potato|pyttipanna|stamppot|colcannon|champ|boxty|rösti|tortilla española|patatnik|kroppkaka|kopytka|draniki|latke|aligot|truffade|pommes|jacket/],
  ['dips', /hummus|guacamole|salsa|chutney|tahini|baba ghanoush|tzatziki|skordalia|taramasalata|tarama|tirokafteri|muhammara|ajvar|pesto|aioli|dip$|dips$|spread$|relish|corn relish|pico de gallo|chimichurri|jeow bong|sambal|nam phrik|mostarda|matbukha|zhug|harissa|toum|piccalilli|chow chow|achar|pickle$|jam$/],
  ['breakfast_plate', /full breakfast|fry-up|english breakfast|biscuits and gravy|sausage gravy|breakfast burrito|eggs and bacon|bife a cavalo|arroz a la cubana|loco moco|hangtown fry|brotzeit|dyrlægens natmad|æbleflæsk|surf and turf|new england boiled dinner|rice and gravy|plate lunch|chicken and waffles|breakfast sausage/],
  ['mixed_plate', /thali|bento|meze|mezze|platter|combination|osechi|nasi campur|gujeolpan|sadhya|dal bhat|rijsttafel|tapas|antipasto|smörgåsbord|anju|kaiseki|sinseollo|bò 7 món|sampler|plate$|bowl$|nasi lemak|nasi padang|cơm|banchan|ulam|lalab|hawaiian haystack|ploughman/],
];

/**
 * Explicit fixes, applied before the rules. Value is a category, optionally
 * followed by ":diet" (vegan | veg | egg | fish | meat) and/or a display name
 * after "=" for labels that read oddly in the app.
 */
const OVERRIDES = {
  'Machher Jhol': 'fish_curry:fish=Macher jhol',
  // On pizza photos the model often answers with the topping.
  Pepperoni: 'pizza:meat=Pepperoni pizza',
  // Labels the CSV truncates.
  'Peanut butter': 'sandwich:veg=Peanut butter sandwich',
  Bacon: 'processed_meat:meat=Bacon',

  // Breads, sweet breads and flatbreads
  'Arctic roll': 'frozen_dessert', 'Almond biscuit': 'cake_pastry', Laverbread: 'veg_dish:vegan',
  'Flying Jacob': 'casserole:meat', 'Iced bun': 'cake_pastry', 'Marie biscuit': 'cake_pastry',
  'Cinnamon roll': 'cake_pastry', 'Pain au chocolat': 'cake_pastry', Cobbler: 'fruit_dessert',
  'Swiss roll': 'cake_pastry', 'Ruske kape': 'cake_pastry', Melonpan: 'cake_pastry', Babka: 'cake_pastry',
  Panettone: 'cake_pastry', 'Punsch-roll': 'cake_pastry', 'Bath bun': 'cake_pastry',
  'Chelsea bun': 'cake_pastry', 'London bun': 'cake_pastry', 'Saffron bun': 'cake_pastry',
  'Nut roll': 'cake_pastry', Tsoureki: 'cake_pastry', Cozonac: 'cake_pastry', Paska: 'cake_pastry',
  Korovai: 'cake_pastry', Kulich: 'cake_pastry', "Fool's Gold Loaf": 'sandwich:meat',
  'Poppyseed muffin': 'cake_pastry', 'Bara brith': 'cake_pastry', Barmbrack: 'cake_pastry',
  'Rye bread': 'wholegrain_bread', Anpan: 'steamed_sweet', 'Pan de muerto': 'cake_pastry',
  Tortell: 'cake_pastry', 'Hot water corn bread': 'fried_bread', Thalipeeth: 'wholegrain_bread',
  Khakhra: 'wholegrain_bread', Litti: 'wholegrain_bread', Bambalouni: 'fried_sweet', "Ka'ak": 'bread',
  Beignet: 'fried_sweet', 'Chole bhature': 'fried_bread:vegan', Bakarkhani: 'stuffed_bread', Calas: 'fried_sweet',
  Sfenj: 'fried_sweet', Khachapuri: 'stuffed_bread:egg', Pathiri: 'bread', Oliebol: 'fried_sweet',
  Fritule: 'fried_sweet', Pampushka: 'bread', Kolokythopita: 'savory_pastry', Karydopita: 'cake_pastry',
  Spanakopita: 'savory_pastry', Tiropita: 'savory_pastry', 'Torta Pasqualina': 'savory_pastry:egg',
  Erbazzone: 'savory_pastry', Vasilopita: 'cake_pastry', 'Cheese dream': 'sandwich:veg', Fougasse: 'bread',
  'Bolo do caco': 'bread', Lobiani: 'stuffed_bread:vegan', Kitcha: 'bread', Wotou: 'bread', Talo: 'bread',
  'Crescentina modenese': 'bread', Mantou: 'bread', 'Yin si juan': 'bread', 'Cockle bread': 'bread',
  Sabaayad: 'bread', Himbasha: 'bread', 'Fouée': 'bread', Torricado: 'bread:vegan', Taralli: 'bread',
  'Kaya toast': 'bread:egg', 'Milk toast': 'bread:veg', 'Stottie cake': 'bread', Pistolette: 'bread',
  'Barm cake': 'bread', Bolillo: 'bread', 'Pa amb tomàquet': 'bread:vegan', Lazarakia: 'cake_pastry',
  'Gyeran-ppang': 'cake_pastry:egg', 'Puran poli': 'stuffed_bread:veg', 'Bint al-sahn': 'cake_pastry',
  Sgabeo: 'fried_bread', Zhaliang: 'fried_bread', 'Aloo paratha': 'stuffed_bread:veg',
  Casatiello: 'stuffed_bread:meat', Bolani: 'stuffed_bread:vegan', Qutab: 'stuffed_bread',
  'Fit-fit': 'fermented_batter', Kisra: 'fermented_batter', Ploye: 'pancake_waffle',

  // Sweet pies and tarts the savoury-pastry rule caught
  'Chiffon pie': 'cake_pastry', 'Black bottom pie': 'cake_pastry', 'Maraca pie': 'cake_pastry',
  'Apple pie': 'cake_pastry', 'Pumpkin pie': 'cake_pastry', 'Cherry pie': 'cake_pastry',
  'Key lime pie': 'cake_pastry', 'Buttermilk pie': 'cake_pastry', Tart: 'cake_pastry',
  'Bakewell tart': 'cake_pastry', 'Choco pie': 'cake_pastry', 'Torta Tre Monti': 'cake_pastry',
  'Chess pie': 'cake_pastry', 'Lemon ice box pie': 'cake_pastry', 'Shoofly pie': 'cake_pastry',
  'Pecan pie': 'cake_pastry', 'Bob Andy pie': 'cake_pastry', Pastiera: 'cake_pastry',
  'Whoopie pie': 'cake_pastry', 'Cream pie': 'cake_pastry', 'Tortas de aceite': 'cake_pastry',
  'Banoffee pie': 'cake_pastry', 'Boston cream pie': 'cake_pastry', 'Grape pie': 'cake_pastry',
  'Derby pie': 'cake_pastry', 'Fried pie': 'fried_sweet', Vatrushka: 'cake_pastry',
  'Mississippi mud pie': 'cake_pastry', 'Rhubarb pie': 'cake_pastry', 'Gypsy tart': 'cake_pastry',
  Bougatsa: 'cake_pastry', 'Pastel de nata': 'cake_pastry', 'Treacle tart': 'cake_pastry',
  'Blackberry pie': 'cake_pastry', 'Mince pie': 'cake_pastry', 'Blueberry pie': 'cake_pastry',
  'Sweet potato pie': 'cake_pastry', 'Shaker lemon pie': 'cake_pastry', 'Međimurska gibanica': 'cake_pastry',
  'Pastel azteca': 'casserole:meat', 'Bean pie': 'cake_pastry', 'Torta caprese': 'cake_pastry',
  'Ox-tongue pastry': 'cake_pastry:veg', 'Rum baba': 'cake_pastry', Croquembouche: 'cake_pastry',
  "Ma'amoul": 'cake_pastry', 'Figgy pudding': 'cake_pastry', 'Cottage Pudding': 'cake_pastry',
  'Sussex pond pudding': 'cake_pastry', Basbousa: 'cake_pastry', 'Suet pudding': 'cake_pastry',
  'Waldorf pudding': 'cake_pastry', Sfouf: 'cake_pastry', 'Malva pudding': 'cake_pastry',
  Kanafeh: 'cake_pastry', 'Persimmon pudding': 'cake_pastry', 'Chantilly cake': 'cake_pastry',
  'Pan dulce': 'cake_pastry', 'Bolo de arroz': 'cake_pastry', Gibassier: 'cake_pastry',
  'Sweet shells': 'cake_pastry', Capirotada: 'cake_pastry', 'Pie à la Mode': 'cake_pastry',
  Paskha: 'milk_sweet', Parfait: 'milk_sweet', 'Biscuits and gravy': 'breakfast_plate:meat',

  // Rice, grains and porridges
  Carrozza: 'fried_snack:veg', Bento: 'mixed_plate', Kedgeree: 'rice_dish:fish', Cachupa: 'meat_stew',
  'Nasi campur': 'mixed_plate', Ketupat: 'rice_plain', Lontong: 'rice_plain', Suman: 'steamed_sweet',
  Sadhya: 'mixed_plate:veg', Kushari: 'rice_dish:vegan', 'Dal bhat': 'mixed_plate:vegan',
  'Red beans and rice': 'legumes', "Hoppin' John": 'legumes', Ambuyat: 'porridge',
  'Glorified rice': 'milk_sweet', Zosui: 'porridge', Fideuà: 'pasta:fish', 'Spam musubi': 'processed_meat:meat',
  Omurice: 'fried_rice:egg', 'Tamago kake gohan': 'egg_dish:egg', 'Hainanese curry rice': 'curry_meat:meat',
  Tekkadon: 'raw_fish:fish', Kateh: 'rice_plain', Sekihan: 'rice_dish:vegan', Waakye: 'legumes',
  'Portuguese seafood rice': 'rice_dish:fish', 'Riso patate e cozze': 'rice_dish:fish',
  'Hawaiian haystack': 'rice_dish:meat', Saleeg: 'rice_dish:meat', Couscous: 'rice_dish',
  Kiritanpo: 'rice_dish:vegan', Cabidela: 'rice_dish:meat', Wachipa: 'rice_dish:meat', Erkuai: 'rice_dish',
  'Arròs negre': 'rice_dish:fish', Cifantuan: 'rice_dish', Kabuni: 'rice_dish:meat', Quzi: 'rice_dish:meat',
  Tahri: 'rice_dish:veg', Baji: 'rice_plain:vegan=Baji (beaten rice)', Kottu: 'fried_rice:egg',
  'Nam Khao': 'fried_rice:meat', Bulgogi: 'grilled_meat:meat', Haleem: 'meat_stew:meat',
  Harees: 'meat_stew:meat', 'Keşkek': 'meat_stew:meat', Panjiri: 'sweets_candy', Canjica: 'milk_sweet',
  Zarangollo: 'veg_dish:egg', Tarhana: 'soup_veg:veg', Ostropel: 'meat_stew:meat', Ciulama: 'casserole:meat',
  Sago: 'steamed_sweet', Frangollo: 'milk_sweet', Vispipuuro: 'fruit_dessert', 'Mämmi': 'porridge',
  'Ga\'at': 'porridge', 'Lâpa': 'porridge', 'Øllebrød': 'porridge', Cranachan: 'milk_sweet',
  Havregrynskugle: 'sweets_candy', 'Protein bar': 'sweets_candy', 'Shrimp and grits': 'porridge:fish',

  // Noodles, pasta, dumplings
  'Yaki udon': 'noodles', Katsudon: 'fried_meat:meat', 'Toasted ravioli': 'fried_snack',
  'American chop suey': 'pasta:meat', 'American goulash': 'pasta:meat', Kaassoufflé: 'fried_snack:veg',
  'Cincinnati chili': 'pasta:meat', Pizokel: 'pasta', Fusi: 'pasta', Laping: 'noodles:vegan',
  'Khauk swè thoke': 'noodles', 'Nan gyi thohk': 'noodles:meat', 'Rat na': 'noodles', Hōtō: 'noodle_soup',
  Soki: 'noodle_soup:meat', 'Apple dumpling': 'fruit_dessert', Dampfnudel: 'cake_pastry',
  Germknödel: 'cake_pastry', Knedle: 'fruit_dessert', Kozhukkatta: 'steamed_sweet:vegan',
  Leberknödel: 'soup_clear:meat', 'Mandu-guk': 'soup_clear:meat', 'Suanla chaoshou': 'dumplings:meat',
  Quenelle: 'dumplings:fish', 'Bánh bèo': 'dumplings:fish', 'Bánh cuốn': 'dumplings:meat',
  Kutsinta: 'steamed_sweet', Punugulu: 'fried_snack:vegan', Watalappam: 'milk_sweet',
  'Bánh xèo': 'fried_snack:meat', Bibingka: 'steamed_sweet', 'Khanom chan': 'steamed_sweet',
  Idiyappam: 'rice_plain:vegan', Puttu: 'rice_plain:vegan', Modak: 'steamed_sweet:veg',
  'Lo mai chi': 'steamed_sweet', Kulolo: 'steamed_sweet', Kralan: 'steamed_sweet', Koba: 'steamed_sweet',
  'Pitsi-pitsî': 'steamed_sweet', Pitha: 'steamed_sweet', Patoleo: 'steamed_sweet',

  // Pizza, burgers, sandwiches, Mexican
  'Carne pizzaiola': 'red_meat:meat', Stromboli: 'pizza', 'Limburger sandwich': 'sandwich:veg',
  'French toast': 'pancake_waffle:egg', Bridie: 'savory_pastry:meat', 'Texas Tommy': 'hot_dog:meat',
  'Mother-in-law': 'sandwich:meat', Tantuni: 'sandwich:meat', 'Smörgåstårta': 'sandwich:fish',
  'Dyrlægens natmad': 'sandwich:meat', Molote: 'fried_snack', 'Al pastor': 'taco_burrito:meat',
  'Chocolate-covered potato chips': 'sweets_candy', 'Rösti': 'fries', Boxty: 'potato', Stoemp: 'potato',
  Colcannon: 'potato', Champ: 'potato', Trinxat: 'potato:meat', 'Papet vaudois': 'potato:meat',
  'Brændende kærlighed': 'potato:meat', 'Tatws Pum Munud': 'potato:meat', Stamppot: 'potato',
  'Mince and tatties': 'meat_stew:meat',

  // Fried snacks, chaat and street food
  'Pozharsky cutlet': 'fried_meat:meat', Empanada: 'savory_pastry', 'Dahi vada': 'chaat:veg',
  Popiah: 'veg_dish', Pirog: 'savory_pastry', 'Cheese straw': 'savory_pastry', 'Puff Puff': 'fried_sweet',
  'Soan papdi': 'sweets_candy', 'Kombdi vade': 'curry_meat:meat', 'Samay Baji': 'mixed_plate:meat',
  'Curry bread': 'fried_snack', 'Glamorgan sausage': 'fried_snack:veg', Bamischijf: 'fried_snack',
  Bhaji: 'fried_snack:vegan=Onion bhaji', 'Pie tee': 'fried_snack:fish', 'Shkedei marak': 'fried_snack:vegan',
  'Chile relleno': 'fried_snack:veg', 'Chai tow kway': 'fried_snack:egg', 'Ngo hiang': 'fried_snack:meat',
  Acarajé: 'fried_snack:fish', Kokis: 'fried_snack:vegan', Kalakukko: 'savory_pastry:fish',
  'Pâté aux pommes de terre': 'savory_pastry:veg', 'Natchitoches meat pie': 'savory_pastry:meat',
  Sarburma: 'savory_pastry:meat', Patty: 'savory_pastry:meat=Jamaican patty', Hornazo: 'savory_pastry:meat',
  Sultsina: 'savory_pastry:veg',

  // Meat
  'Fujian red wine chicken': 'meat_stew:meat', 'Chicken Divan': 'casserole:meat', 'City chicken': 'fried_meat:meat',
  'Kung Pao chicken': 'stir_fry:meat', 'Galbi-jjim': 'meat_stew:meat', 'Galbi-tang': 'soup_clear:meat',
  'Chicken paprikash': 'meat_stew:meat', 'Chicken Maryland': 'fried_meat:meat', 'Chicken à la King': 'casserole:meat',
  'Chicken and waffles': 'fried_meat:meat', 'Paneer tikka': 'grilled_meat:veg', 'Dak-galbi': 'stir_fry:meat',
  'Sop saudara': 'soup_clear:meat', 'Pork blood soup': 'soup_clear:meat', 'Oxtail soup': 'soup_clear:meat',
  'Liver soup': 'soup_clear:meat', 'Tripe soup': 'soup_clear:meat', 'Pork Bones': 'soup_clear:meat',
  'Bò lúc lắc': 'stir_fry:meat', 'Thịt kho tàu': 'meat_stew:meat', Kakuni: 'meat_stew:meat',
  'Red braised pork belly': 'meat_stew:meat', Larb: 'salad:meat', 'Nam tok': 'salad:meat',
  Chaku: 'sweets_candy:veg', Choila: 'grilled_meat:meat', 'Sweet and sour pork': 'fried_meat:meat',
  'Twice-cooked pork': 'stir_fry:meat', 'Moo shu pork': 'stir_fry:meat', 'Bò nướng lá lốt': 'grilled_meat:meat',
  'Bò 7 món': 'mixed_plate:meat', 'Carne asada': 'grilled_meat:meat', 'Méchoui': 'grilled_meat:meat',
  'Mala Mogodu': 'meat_stew:meat', Dobradinha: 'meat_stew:meat', 'Tripes à la mode de Caen': 'meat_stew:meat',
  'Pieds paquets': 'meat_stew:meat', 'Empal gentong': 'curry_meat:meat', Tongseng: 'curry_meat:meat',
  'Instant-boiled mutton': 'meat_stew:meat', 'Meat from tiblica': 'processed_meat:meat',
  'Carne a la tampiqueña': 'grilled_meat:meat', Grillades: 'meat_stew:meat', 'Svíčková': 'meat_stew:meat',
  Fårikål: 'meat_stew:meat', Pinnekjøtt: 'processed_meat:meat', 'Vitello tonnato': 'red_meat:meat',
  'Surf and turf': 'red_meat:meat', 'New England boiled dinner': 'meat_stew:meat', Brotzeit: 'mixed_plate:meat',
  Frikadeller: 'red_meat:meat', 'Ćevapi': 'grilled_meat:meat', Pljeskavica: 'grilled_meat:meat',
  Mititei: 'grilled_meat:meat', Sheftalia: 'grilled_meat:meat', Skilpadjies: 'grilled_meat:meat',
  Kokoretsi: 'grilled_meat:meat', Slavink: 'red_meat:meat', 'Maple bacon donut': 'fried_sweet',
  'Golden Opulence Sundae': 'frozen_dessert', Sundae: 'frozen_dessert', Laulau: 'meat_stew:meat',
  Chaudin: 'processed_meat:meat', Rinflajš: 'red_meat:meat', Bruckfleisch: 'meat_stew:meat',
  'Caltaboș': 'processed_meat:meat', 'Jambon persillé': 'processed_meat:meat', Baodu: 'red_meat:meat',
  'Shab Deg': 'meat_stew:meat', 'Foie gras': 'red_meat:meat', Gumbo: 'meat_stew', 'Fuqi feipian': 'red_meat:meat',
  Saltah: 'meat_stew:meat', Imoni: 'soup_clear:meat', 'Chim chum': 'meat_stew:meat', Motsunabe: 'meat_stew:meat',
  Maafe: 'curry_meat:meat', Yahni: 'meat_stew:meat', Escargot: 'seafood:meat', Mixiote: 'red_meat:meat',
  Boerewors: 'processed_meat:meat', Chireta: 'processed_meat:meat', 'Pringá': 'meat_stew:meat',
  Afelia: 'red_meat:meat', Aspic: 'red_meat:meat', 'Pölsa': 'meat_stew:meat', Czernina: 'soup_clear:meat',
  Tharid: 'meat_stew:meat', Yuxiang: 'stir_fry:meat', Fahsa: 'meat_stew:meat',
  'Zürcher Geschnetzeltes': 'meat_stew:meat', 'Sautéed reindeer': 'red_meat:meat', Guaiwei: 'grilled_meat:meat',
  'Rössypottu': 'meat_stew:meat', Frikkadel: 'red_meat:meat', 'Harihari-nabe': 'soup_clear:meat',
  Slinger: 'breakfast_plate:meat', 'Nuea phat phrik': 'stir_fry:meat', 'Thai suki': 'soup_clear',
  Podvarak: 'casserole:meat', Pihtije: 'processed_meat:meat', Ambelopoulia: 'grilled_meat:meat',
  'Galinha à portuguesa': 'curry_meat:meat', 'Galinha à africana': 'grilled_meat:meat', Musakhan: 'grilled_meat:meat',
  'Kig ha farz': 'meat_stew:meat', 'Karađorđeva šnicla': 'fried_meat:meat', Minchee: 'meat_stew:meat',
  'Mykyrokka': 'meat_stew:meat', 'Phat khing': 'stir_fry', 'Jing Jiang Rou Si': 'stir_fry:meat',
  Shuizhu: 'stir_fry', 'Cozido à portuguesa': 'meat_stew:meat', 'Mućkalica': 'meat_stew:meat',
  Seswaa: 'meat_stew:meat', Pichelsteiner: 'meat_stew:meat', 'Phat phrik khing': 'stir_fry',
  Wallenbergare: 'red_meat:meat', Flæskesteg: 'red_meat:meat', 'Tochitură': 'meat_stew:meat',
  Laziji: 'fried_meat:meat', Kuchmachi: 'red_meat:meat', 'Poc Chuc': 'grilled_meat:meat',
  'Sulu köfte': 'meat_stew:meat', Konro: 'soup_clear:meat', 'Torta de gazpacho': 'meat_stew:meat',
  Chakhchoukha: 'meat_stew:meat', 'Draw soup': 'meat_stew', 'Ogbono soup': 'meat_stew', Banga: 'curry_meat',
  Woku: 'curry_meat', Geng: 'curry_meat', Beondegi: 'mixed:meat=Beondegi (silkworm pupae)',

  // Stews and soups
  'Caldo de queso': 'soup_creamy:veg', 'Hong dou tang': 'steamed_sweet:vegan', Borscht: 'soup_veg',
  'Miyeok-guk': 'soup_clear', 'Caldo de pollo': 'soup_clear:meat', 'Haejang-guk': 'soup_clear:meat',
  'Sundubu-jjigae': 'tofu_soy', Shchi: 'soup_veg', Rassolnik: 'soup_veg', Okroshka: 'soup_veg',
  'Doenjang-jjigae': 'tofu_soy', 'Bak kut teh': 'soup_clear:meat', 'Shabu-shabu': 'soup_clear:meat',
  Sopaipilla: 'fried_bread', 'Samgye-tang': 'soup_clear:meat', Tteokguk: 'soup_clear:meat',
  Seolleongtang: 'soup_clear:meat', 'Sopa de Gato': 'soup_veg:vegan', 'Bob chorba': 'legumes',
  'Maeun-tang': 'soup_clear:fish', 'Scotch broth': 'soup_clear:meat', 'Ciorbă': 'soup_veg', Chorba: 'soup_clear',
  'Ciorbă de perișoare': 'soup_clear:meat', 'Caldo tlalpeño': 'soup_clear:meat', 'Caldo gallego': 'soup_veg:meat',
  'Chueo-tang': 'soup_clear:fish', Kharcho: 'meat_stew:meat', Chakapuli: 'meat_stew:meat', Chanakhi: 'meat_stew:meat',
  Chikhirtma: 'soup_clear:meat', 'Ghormeh sabzi': 'meat_stew:meat', Gheimeh: 'meat_stew:meat',
  'Fesenjān': 'meat_stew:meat', Tajine: 'meat_stew', Mrouzia: 'meat_stew:meat', Kaldereta: 'meat_stew:meat',
  'Khanom mo kaeng': 'milk_sweet:egg', 'Bookbinder soup': 'soup_clear:meat', 'Creamed corn': 'veg_dish:veg',
  'Palóc soup': 'soup_veg:meat', 'Sago soup': 'fruit_dessert', 'Black sesame soup': 'steamed_sweet:vegan',
  'Sour cherry soup': 'fruit_dessert', 'Rose hip soup': 'fruit_dessert', 'Tomato compote': 'dips:vegan',
  'Zuppa toscana': 'soup_creamy:meat', 'She-crab soup': 'soup_creamy:fish', 'Clam chowder': 'soup_creamy:fish',
  'Lobster stew': 'soup_creamy:fish', 'Cullen skink': 'soup_creamy:fish', 'Corn crab soup': 'soup_clear:fish',
  Psarosoupa: 'soup_clear:fish', Ukha: 'soup_clear:fish', "Fisherman's soup": 'soup_clear:fish',
  'Caldo de siete mares': 'soup_clear:fish', 'Cantonese seafood soup': 'soup_clear:fish',
  'Caldillo de perro': 'soup_clear:fish', 'Fugu chiri': 'soup_clear:fish', Tarator: 'yogurt:veg',
  'Toyga soup': 'soup_veg:veg', Dovga: 'soup_veg:veg', 'Egg drop soup': 'soup_clear:egg',
  'Tomato and egg soup': 'soup_clear:egg', Stracciatella: 'soup_clear:egg', Ginestrata: 'soup_clear:egg',
  Sciusceddu: 'soup_clear:meat', Zoque: 'soup_veg:vegan', Brenebon: 'legumes:meat', Maccu: 'legumes:vegan',
  'Açorda': 'soup_veg:egg', Wodzionka: 'soup_veg', Panada: 'soup_veg', Tourin: 'soup_veg:egg',
  Butajiru: 'soup_clear:meat', Bagnun: 'soup_clear:fish', Ohaw: 'soup_clear:fish', Maneštra: 'legumes:meat',
  Douzhi: 'fermented_veg:vegan',

  // Curries, vegetables and legumes
  Satsivi: 'curry_meat:meat', 'Ras malai': 'milk_sweet:veg', 'Dal makhani': 'legumes:veg', Kosambari: 'salad:vegan',
  Ghugni: 'legumes:vegan', Misal: 'legumes:vegan', Usal: 'legumes:vegan', Solkadhi: 'soup_veg:vegan',
  Kaipen: 'veg_dish:vegan', 'Efo riro': 'curry_veg', Caruru: 'curry_veg:fish', 'Pachi Pulusu': 'soup_veg:vegan',
  'Jelly bean': 'sweets_candy', 'Kakara pitha': 'fried_sweet', 'Soybean sprout': 'veg_dish:vegan',
  'Chili con carne': 'legumes:meat', Cassoulet: 'legumes:meat', Feijoada: 'legumes:meat',
  'Fabada asturiana': 'legumes:meat', 'Pork and beans': 'legumes:meat', 'Cowboy beans': 'legumes:meat',
  'Boston baked beans': 'legumes:meat', 'Fasole cu cârnați': 'legumes:meat', 'Frijoles charros': 'legumes:meat',
  'Jókai bean soup': 'legumes:meat', 'Senate bean soup': 'legumes:meat', Harira: 'legumes:meat',
  'Annin tofu': 'milk_sweet', 'Stinky tofu': 'tofu_soy:vegan', 'Tavë Kosi': 'casserole:meat',
  'Fried eggplant': 'fried_veg', 'Karnıyarık': 'veg_dish:meat', 'Tepsi baytinijan': 'veg_dish:meat',
  Makdous: 'fermented_veg:vegan', 'Baba ghanoush': 'dips:vegan', Falooda: 'frozen_dessert',
  Tirokafteri: 'dips:veg', Urnebes: 'dips:veg', Serundeng: 'dips:vegan', Panellets: 'sweets_candy',
  'Kalu dodol': 'sweets_candy', Lekor: 'fried_seafood:fish', Chadachadi: 'curry_veg:vegan',
  Khatkhate: 'curry_veg:vegan', 'Enne gai': 'curry_veg:vegan=Ennai kathirikai', Romeritos: 'curry_veg:fish',
  Ekuru: 'legumes:vegan', Keledoş: 'legumes:veg', Caparrones: 'legumes:meat', 'Fabes con almejas': 'legumes:fish',
  Fatteh: 'legumes:veg', Shimotsukare: 'veg_dish:fish', Nimono: 'veg_dish', Kuluban: 'salad:vegan',
  Buntil: 'veg_dish:fish', Botok: 'tofu_soy', 'Yong tau foo': 'tofu_soy:fish', Jhunka: 'curry_veg:vegan',

  // Fish and seafood
  'Tuna casserole': 'casserole:fish', 'Finnan haddie': 'fish:fish', 'Baccalà alla lucana': 'fish:fish',
  Bacalhau: 'fish:fish', 'Bacalhau à Zé do Pipo': 'fish:fish', 'Bacalhau com natas': 'casserole:fish',
  'Bacalhau à Gomes de Sá': 'fish:fish', 'Bacalhau à Brás': 'fish:fish', 'Bacalhau com todos': 'fish:fish',
  Masgouf: 'fish:fish', 'Fish slice': 'fish:fish', Rollmops: 'fish:fish', 'Dressed herring': 'creamy_salad:fish',
  Kipper: 'fish:fish', 'Arbroath smokie': 'fish:fish', 'Yin Yang fish': 'fried_seafood:fish', Unagi: 'fish:fish',
  'Huachinango a la Veracruzana': 'fish:fish', 'Sambal stingray': 'fish:fish', 'Tuna pot': 'fish:fish',
  Brandade: 'fish:fish', Tarama: 'dips:fish', Karasumi: 'fish:fish', 'Pollock roe': 'fish:fish',
  Ankimo: 'fish:fish', Lutefisk: 'fish:fish', 'Crappit heid': 'fish:fish', 'Cabbie claw': 'fish:fish',
  'Agwi-jjim': 'fish:fish', 'Paling in \'t groen': 'fish:fish', 'Mas riha': 'curry_meat:fish',
  Calulu: 'curry_meat:fish', Matbukha: 'dips:vegan', 'Lobster Newberg': 'casserole:fish',
  'Oyster omelette': 'egg_dish:fish', Hoe: 'raw_fish:fish', Koi: 'raw_fish:fish', 'Pecel Lele': 'fried_seafood:fish',
  Nanbanzuke: 'fried_seafood:fish', 'Cappon magro': 'seafood:fish', 'Seafood birdsnest': 'seafood:fish',
  Shiokara: 'fermented_veg:fish', Cincalok: 'fermented_veg:fish', Fesikh: 'fermented_veg:fish',
  Rakfisk: 'fermented_veg:fish', Oden: 'soup_clear:fish', Tekwan: 'soup_clear:fish', Janssons: 'casserole:fish',
  'Janssons frestelse': 'casserole:fish',

  // Eggs, salads, dairy
  'Sabich salad': 'salad:egg', 'Torta caprese_': 'cake_pastry', Chermoula: 'dips:vegan', 'Jeow bong': 'dips:fish',
  'Gỏi cuốn': 'salad:fish', 'Michigan salad': 'salad:veg', 'Celery Victor': 'salad:vegan',
  'Snickers salad': 'milk_sweet', 'Cookie salad': 'milk_sweet', 'Jello salad': 'fruit_dessert',
  'Watergate salad': 'milk_sweet', 'Frogeye salad': 'milk_sweet', Ambrosia: 'fruit_dessert',
  'Pico de gallo': 'salad:vegan', Lawar: 'salad:meat', 'Cobb salad': 'creamy_salad:meat',
  Quarkkäulchen: 'pancake_waffle:egg', Obatzda: 'dips:veg', 'Túró Rudi': 'sweets_candy:veg', Thiakry: 'yogurt:veg',
  'Zagorski Štrukli': 'casserole:veg', 'Smažený sýr': 'cheese_dish:veg', 'Kartoffelkäse': 'dips:veg',
  'Corn pudding': 'casserole:egg', 'Žemlovka': 'fruit_dessert', Tsukudani: 'dips', Mostarda: 'dips:vegan',

  // Desserts and sweets
  'Spotted dick': 'cake_pastry', 'Brown Betty': 'fruit_dessert', 'Apple crisp': 'fruit_dessert',
  Clafoutis: 'fruit_dessert', Smulpaj: 'fruit_dessert', 'Eve\'s pudding': 'fruit_dessert',
  'Malvern pudding': 'fruit_dessert', 'Eton mess': 'fruit_dessert', Bionico: 'fruit_dessert',
  'Qubani-ka-Meetha': 'fruit_dessert:vegan', Kissel: 'fruit_dessert', Kuih: 'steamed_sweet', 'Nian gao': 'steamed_sweet',
  Pootharekulu: 'sweets_candy', Pantua: 'fried_sweet', 'Chhena gaja': 'fried_sweet', Ghevar: 'fried_sweet',
  'Chhena jalebi': 'fried_sweet', 'Chhena Jhili': 'fried_sweet', Malpua: 'fried_sweet', 'Mysore pak': 'sweets_candy',
  'Kaju katli': 'sweets_candy', Barfi: 'sweets_candy', Cocada: 'sweets_candy', 'Grass jelly': 'steamed_sweet:vegan',
  Guilinggao: 'steamed_sweet:vegan', 'Chè': 'steamed_sweet', 'Tong sui': 'steamed_sweet', Hoppang: 'steamed_sweet',
  Amanattō: 'steamed_sweet:vegan', Jiuniang: 'steamed_sweet:vegan', Boondi: 'fried_sweet', Thekua: 'fried_sweet',
  Boeber: 'milk_sweet', Mattentaart: 'cake_pastry', 'Roccocò': 'cake_pastry', 'Kwareżimal': 'cake_pastry',
  'Couque de Dinant': 'cake_pastry', Bibikkan: 'cake_pastry', 'Sirop de Liège': 'sweets_candy',
  Khabees: 'sweets_candy', 'Chao hong guo': 'sweets_candy', 'Coconut bar': 'sweets_candy', Dhondas: 'cake_pastry',
  'Café liégeois': 'frozen_dessert', Qatayef: 'fried_sweet', Sklandrausis: 'cake_pastry', Coyotas: 'cake_pastry',
  'Fios de ovos': 'sweets_candy:egg', 'Bonus Jack': 'frozen_dessert', Krumkake: 'cake_pastry',
  Mustacciuoli: 'cake_pastry', 'Assidat Zgougou': 'milk_sweet', Shekerbura: 'cake_pastry', Mucenici: 'cake_pastry',
  'Rönttönen': 'cake_pastry', Carac: 'cake_pastry', 'Gosh-e Fil': 'fried_sweet', 'Rožata': 'milk_sweet:egg',
  Poornalu: 'fried_sweet', Lakhamari: 'fried_sweet', Amandine: 'cake_pastry', 'Cornulețe': 'cake_pastry',
  Pustakari: 'sweets_candy', Tinginys: 'cake_pastry', Sunnundallu: 'sweets_candy', Modjeska: 'sweets_candy',
  'Thong yip': 'sweets_candy:egg',

  // Plates and other
  'Chataamari': 'pancake_waffle:egg', 'Burkinabe cuisine': 'mixed_plate', 'Selat solo': 'red_meat:meat',
  'Sinseollo': 'meat_stew:meat',
};

const DIET_RULES = [
  ['fish', /fish|salmon|tuna|cod\b|haddock|shrimp|prawn|crab|lobster|clam|oyster|mussel|scallop|squid|octopus|cuttlefish|calamari|scampi|cockle|anchov|sardine|herring|mackerel|eel|unagi|bacalhau|baccalà|seafood|roe|ikan|fugu|stingray|kipper|smokie|haddie|sushi|sashimi|ceviche|poke|gravlax|lutefisk|rakfisk|fesikh|karasumi|tarama|brandade|bouillabaisse|caldeirada|matelote|ukha|psarosoupa|cullen skink|étouffée|sea cucumber|shark|abalone|ankimo|shiokara|cincalok|dashi|amok|machher|masgouf|chowder/],
  ['meat', /chicken|beef|pork|lamb|mutton|goat|veal|venison|duck|turkey|goose|quail|squab|pigeon|rabbit|hare|bacon|ham\b|sausage|salami|pepperoni|chorizo|meat|steak|burger(?!.*veg)|hot dog|liver|tripe|kidney|oxtail|tongue|brain|blood|kebab|kabab|keema|qeema|biryani|rogan josh|nihari|haleem|bulgogi|galbi|yakitori|satay|tandoori|souvlaki|gyro|shawarma|bratwurst|kielbasa|prosciutto|jamón|pâté|foie gras|meatball|köttbullar|kofta|kibbeh|shashlik|suya|churrasco|carnitas|barbacoa|birria|al pastor|cochinita|ropa vieja|picadillo|machaca|pozole|menudo|goulash|stroganoff|bourguignon|coq au vin|cassoulet|feijoada|chili con carne|jambalaya|gumbo|adobo|rendang|char siu|siu yuk|peking|katsu|tonkatsu|schnitzel|cordon bleu|nugget|wing|drumstick|jerky|spam|bologna|mortadella|turducken|pastrami|corned|brisket|ribs|rib\b|chop|loin|roast beef|carne|frikadel|ćevap|pljeskavica|merguez|wurst|andouille|boudin|haggis|scrapple|goetta|black pudding|lardo|salo|ciccioli|chicharr|cuchifritos|lechon|suckling|méchoui|kitfo|gored|larb|laap|nam tok|bossam|jokbal|samgye|seolleongtang|bak kut teh|hainanese|soto ayam|opor|ayam|babi|bò |thịt|gà|murgh|kozhi|kombdi|mamsam|gosht|maans|chop suey|kung pao|moo shu|sweet and sour pork|twice-cooked pork|mapo|dong'an|bon bon|white cut|soy sauce chicken|wenchang|beggar's chicken|zhangcha|laziji|kare-kare|sinigang|bistek|lechazo|pinnekjøtt|smalahove|fårikål|sauerbraten|tafelspitz|svíčková|schweinshaxe|flæskesteg|leberkäse|frikandel|kroket|bitterballen|kapsalon|francesinha|bife|cabidela|sarapatel|chanfana|alheira|cozido|cocido|fabada|lacón|torrezno|pringá|olla podrida|escudella|caldo gallego|botifarra|fuet|chistorra|lomo|presa|pluma|secreto|carrillada|rabo de toro|callos|morcilla/],
  ['egg', /egg|omelet|omelette|frittata|quiche|shakshouka|shakshuka|huevos|menemen|çılbır|tamago|tamagoyaki|chawanmushi|gyeran|oeufs|deviled|benedict|sardou|neptune|meringue|soufflé|custard|crème brûlée|flan|pavlova|macaron|mayonnaise|carbonara|fried rice|omurice|khai/],
];

const ALLERGEN_RULES = [
  ['gluten', /bread|bun|roll|toast|sandwich|burger|pizza|pasta|spaghetti|macaroni|lasagne|noodle|ramen|udon|soba|dumpling|wonton|pie|pastry|cake|cookie|biscuit|cracker|croissant|bagel|pretzel|waffle|pancake|crêpe|naan|roti|paratha|chapati|puri|bhatura|bhature|kulcha|samosa|kachori|couscous|bulgur|tabbouleh|seitan|beer|barley|rye|wheat|flour|tempura|katsu|schnitzel|breaded|battered|nugget|fried chicken|doughnut|donut|churro|jalebi|baklava|börek|burek|strudel|tart|muffin|scone|brownie|panettone|stollen|empanada|pierogi|gnocchi|halva|semolina|upma|sooji|rava|suji|seviyan|vermicelli|falooda|muesli|granola|oat|barley|malt/],
  ['dairy', /cheese|cream|butter|paneer|yogurt|yoghurt|curd|milk|ghee|kheer|kulfi|ice cream|lassi|raita|custard|pudding|cheesecake|pizza|lasagne|carbonara|alfredo|korma|makhani|malai|shahi|rabri|rabdi|basundi|kalakand|rasgulla|rasmalai|ras malai|sandesh|chhena|burfi|barfi|peda|halwa|panna cotta|tiramisu|tres leches|mousse|fondue|raclette|gratin|quiche|béchamel|moussaka|mac and cheese|queso|quesadilla|nachos|tzatziki|labneh|kefir|skyr|whey|mozzarella|parmesan|feta|halloumi|ricotta|mascarpone|brie|burrata|paneer|cottage|quark|túró|obatzda|frico|aligot|tartiflette|truffade|saganaki|khachapuri|pastitsio|shrikhand|doodhpak|phirni|firni|sheer khurma|falooda|milkshake|latte|cappuccino|chai|flan|crème|dulce de leche|cajeta|eclair|éclair|profiterole|cannoli|cassata|panettone|brioche|croissant/],
  ['egg', /egg|omelet|omelette|frittata|quiche|mayonnaise|mayo|aioli|custard|crème brûlée|flan|meringue|pavlova|macaron|soufflé|carbonara|cake|brownie|cookie|pancake|waffle|crêpe|french toast|brioche|challah|eclair|éclair|profiterole|choux|mousse|tiramisu|fried rice|omurice|egg noodle|chow mein|lo mein|pad thai|tamago|chawanmushi|benedict|shakshouka|huevos|menemen|çılbır|caesar|coleslaw|potato salad|egg salad|kedgeree|nasi goreng|bibimbap/],
  ['nuts', /nut|almond|peanut|cashew|kaju|pistachio|walnut|hazelnut|pecan|macadamia|praline|marzipan|nougat|baklava|pakhlava|kanafeh|satay|sate|gado-gado|pecel|kare-kare|maafe|mafe|groundnut|kuli-kuli|chikki|turrón|torrone|frangipane|bakewell|financier|amaretti|biscotti|korma|pasanda|shahi|mughlai|kozhukkatta|modak|gujia|halwa|barfi|burfi|kheer|payasam|falooda|fesenjān|satsivi|muhammara|pesto|romesco|ajoblanco|tarator|churchkhela|gozinaki|panellets|calisson|nusstorte|nut roll|linzer|derby pie|pecan pie|snickers|kaju katli|mysore pak|chhena gaja|qubani|sheer khurma|dry fruit|trail mix/],
  ['sesame', /sesame|tahini|halva|halwa(?! )|hummus|baba ghanoush|til|tilkut|gajak|benne|gomasio|sesame seed|black sesame|jian dui|zaatar|za'atar|manakish|simit|bagel|sunnundallu|ellu/],
  ['soy', /tofu|soy|miso|natto|nattō|tempeh|edamame|doufu|douhua|doenjang|tahu|yuba|soybean|teriyaki|shoyu|tamari|kinema|bean curd|dou|mapo/],
  ['fish', /fish|salmon|tuna|cod\b|haddock|anchov|sardine|herring|mackerel|bacalhau|baccalà|ikan|eel|unagi|kipper|lutefisk|rakfisk|fesikh|karasumi|tarama|brandade|roe|gravlax|ceviche|sushi|sashimi|poke|dashi|bonito|katsuobushi|fish sauce|nam pla|amok|machher|masgouf|smokie|haddie|cullen skink|bouillabaisse|caldeirada|ukha|psarosoupa|fugu|stingray|ankimo|vitello tonnato|caesar|worcestershire|kedgeree|thieboudienne|yusheng/],
  ['shellfish', /shrimp|prawn|crab|lobster|clam|oyster|mussel|scallop|squid|octopus|cuttlefish|calamari|scampi|cockle|crawfish|crayfish|langoustine|sea cucumber|abalone|conch|whelk|shiokara|cincalok|étouffée|gumbo|paella|bouillabaisse|cioppino|seafood|surf and turf|chilli crab|san-nakji|balchão|squid|tom yum|laksa|pad thai|har gow|shumai|wonton/],
];

function matches(rules, name) {
  return rules.filter(([, pattern]) => pattern.test(name)).map(([key]) => key);
}

function parseOverride(value) {
  const [spec, displayName] = value.split('=');
  const [category, diet] = spec.split(':');
  return { category, diet: diet || null, displayName: displayName || null };
}

const lines = csv.trim().split('\n').slice(1);
const unknownCategories = new Set();
const labels = lines.map((line) => {
  const comma = line.indexOf(',');
  const name = line.slice(comma + 1).replace(/"/g, '').trim();
  if (name === '__background__' || name.startsWith('/')) return null;

  const lower = name.toLowerCase();
  const override = OVERRIDES[name] ? parseOverride(OVERRIDES[name]) : null;
  const category = override?.category ?? RULES.find(([, pattern]) => pattern.test(lower))?.[0] ?? 'mixed';
  if (!CATEGORIES.includes(category)) unknownCategories.add(`${name} -> ${category}`);

  const diet = override?.diet ?? matches(DIET_RULES, lower)[0] ?? null;
  const allergens = matches(ALLERGEN_RULES, lower);
  return [override?.displayName ?? name, category, diet, allergens];
});

if (unknownCategories.size) {
  console.error('Unknown categories:\n' + [...unknownCategories].join('\n'));
  process.exit(1);
}

writeFileSync(join(root, 'src/data/food-labels.json'), JSON.stringify(labels) + '\n');

if (process.argv.includes('--report')) {
  const byCategory = new Map();
  for (const label of labels) {
    if (!label) continue;
    byCategory.set(label[1], [...(byCategory.get(label[1]) ?? []), label[0]]);
  }
  for (const category of CATEGORIES) {
    const names = byCategory.get(category) ?? [];
    console.log(`\n## ${category} (${names.length})\n${names.join(' | ')}`);
  }
} else {
  console.log(`Wrote ${labels.filter(Boolean).length} labels to src/data/food-labels.json`);
}
