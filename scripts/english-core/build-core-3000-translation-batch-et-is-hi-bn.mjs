#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";
const inputPath = path.resolve(
  args.get("input") ??
    `outputs/english-core-3000/en-transcriptions/${releaseId}_en_transcriptions_v1.jsonl`
);
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/translation-batches");

const translations = {
  core3000_0001: { ET: ["määrav artikkel", "Uks on lahti."], IS: ["ákveðinn greinir", "Hurðin er opin."], HI: ["निश्चित आर्टिकल", "दरवाज़ा खुला है।"], BN: ["নির্দিষ্ট আর্টিকেল", "দরজাটা খোলা।"] },
  core3000_0002: { ET: ["olema", "Ma tahan valmis olla."], IS: ["vera", "Ég vil vera tilbúinn."], HI: ["होना", "मैं तैयार होना चाहता हूँ।"], BN: ["হওয়া", "আমি প্রস্তুত হতে চাই।"] },
  core3000_0003: { ET: ["ja", "Tee ja vesi on laual."], IS: ["og", "Te og vatn eru á borðinu."], HI: ["और", "चाय और पानी मेज़ पर हैं।"], BN: ["এবং", "চা এবং পানি টেবিলে আছে।"] },
  core3000_0004: { ET: ["-st; omastav", "Tass teed on kuum."], IS: ["af; eignarfall", "Tebollinn er heitur."], HI: ["का; की; के", "चाय का कप गर्म है।"], BN: ["-এর; সম্বন্ধ", "চায়ের কাপটা গরম।"] },
  core3000_0005: { ET: ["da-tegevusnimi; juurde", "Ma tahan koju minna."], IS: ["nafnháttur; til", "Ég vil fara heim."], HI: ["करना; को", "मैं घर जाना चाहता हूँ।"], BN: ["করতে; দিকে", "আমি বাড়ি যেতে চাই।"] },
  core3000_0006: { ET: ["umbmäärane artikkel", "Mul on raamat."], IS: ["óákveðinn greinir", "Ég er með bók."], HI: ["अनिश्चित आर्टिकल", "मेरे पास एक किताब है।"], BN: ["অনির্দিষ্ট আর্টিকেল", "আমার একটা বই আছে।"] },
  core3000_0007: { ET: ["sees; -s", "Võti on kotis."], IS: ["í", "Lykillinn er í töskunni."], HI: ["में", "चाबी बैग में है।"], BN: ["মধ্যে", "চাবিটা ব্যাগে আছে।"] },
  core3000_0008: { ET: ["omama; mul on", "Mul on telefon."], IS: ["hafa; vera með", "Ég er með síma."], HI: ["पास होना", "मेरे पास फ़ोन है।"], BN: ["থাকা; আছে", "আমার ফোন আছে।"] },
  core3000_0009: { ET: ["see; ta", "See on kotis."], IS: ["það; hann; hún", "Það er í töskunni."], HI: ["यह; वह", "यह बैग में है।"], BN: ["এটা; ওটা", "এটা ব্যাগে আছে।"] },
  core3000_0010: { ET: ["sina; teie", "Sa oled mu sõber."], IS: ["þú; þið", "Þú ert vinur minn."], HI: ["तुम; आप", "तुम मेरे दोस्त हो।"], BN: ["তুমি; আপনি", "তুমি আমার বন্ধু।"] },
  core3000_0011: { ET: ["tema", "Ta on koolis."], IS: ["hann", "Hann er í skólanum."], HI: ["वह", "वह स्कूल में है।"], BN: ["সে", "সে স্কুলে আছে।"] },
  core3000_0012: { ET: ["jaoks", "See kingitus on sulle."], IS: ["fyrir", "Þessi gjöf er fyrir þig."], HI: ["के लिए", "यह तोहफ़ा तुम्हारे लिए है।"], BN: ["জন্য", "এই উপহারটা তোমার জন্য।"] },
  core3000_0013: { ET: ["nemad; nad", "Nad on kodus."], IS: ["þeir; þær; þau", "Þau eru heima."], HI: ["वे", "वे घर पर हैं।"], BN: ["তারা", "তারা বাড়িতে আছে।"] },
  core3000_0014: { ET: ["ei", "Ma ei ole väsinud."], IS: ["ekki", "Ég er ekki þreyttur."], HI: ["नहीं", "मैं थका नहीं हूँ।"], BN: ["না", "আমি ক্লান্ত নই।"] },
  core3000_0015: { ET: ["see; too", "Too raamat on minu oma."], IS: ["sá; sú; það", "Sú bók er mín."], HI: ["वह", "वह किताब मेरी है।"], BN: ["ওই; সেই", "ওই বইটা আমার।"] },
  core3000_0016: { ET: ["meie", "Me oleme valmis."], IS: ["við", "Við erum tilbúin."], HI: ["हम", "हम तैयार हैं।"], BN: ["আমরা", "আমরা প্রস্তুত।"] },
  core3000_0017: { ET: ["peal", "Tass on laual."], IS: ["á", "Bollinn er á borðinu."], HI: ["पर", "कप मेज़ पर है।"], BN: ["উপর", "কাপটা টেবিলের উপর আছে।"] },
  core3000_0018: { ET: ["koos; -ga", "Ma olen perega."], IS: ["með", "Ég er með fjölskyldunni minni."], HI: ["के साथ", "मैं अपने परिवार के साथ हूँ।"], BN: ["সঙ্গে", "আমি আমার পরিবারের সঙ্গে আছি।"] },
  core3000_0019: { ET: ["see", "See raamat on uus."], IS: ["þessi", "Þessi bók er ný."], HI: ["यह", "यह किताब नई है।"], BN: ["এই", "এই বইটা নতুন।"] },
  core3000_0020: { ET: ["mina", "Ma olen kodus."], IS: ["ég", "Ég er heima."], HI: ["मैं", "मैं घर पर हूँ।"], BN: ["আমি", "আমি বাড়িতে আছি।"] },
  core3000_0021: { ET: ["tegema", "Ma teen kodutööd."], IS: ["gera", "Ég geri heimavinnu."], HI: ["करना", "मैं गृहकार्य कर रहा हूँ।"], BN: ["করা", "আমি বাড়ির কাজ করছি।"] },
  core3000_0022: { ET: ["nagu; kui", "Ta töötab õpetajana."], IS: ["sem", "Hún vinnur sem kennari."], HI: ["के रूप में", "वह शिक्षिका के रूप में काम करती है।"], BN: ["হিসেবে", "সে শিক্ষক হিসেবে কাজ করে।"] },
  core3000_0023: { ET: ["juures; koolis", "Kohtu minuga koolis."], IS: ["hjá; í skóla", "Hittu mig í skólanum."], HI: ["पर; में", "मुझसे स्कूल में मिलो।"], BN: ["এ; কাছে", "স্কুলে আমার সঙ্গে দেখা করো।"] },
  core3000_0024: { ET: ["tema", "Ta on mu õde."], IS: ["hún", "Hún er systir mín."], HI: ["वह", "वह मेरी बहन है।"], BN: ["সে", "সে আমার বোন।"] },
  core3000_0025: { ET: ["aga", "Ma olen väsinud, aga õnnelik."], IS: ["en", "Ég er þreyttur en ánægður."], HI: ["लेकिन", "मैं थका हूँ, लेकिन खुश हूँ।"], BN: ["কিন্তু", "আমি ক্লান্ত, কিন্তু খুশি।"] },
  core3000_0026: { ET: ["-st; pärit", "Ma olen Kanadast."], IS: ["frá", "Ég er frá Kanada."], HI: ["से", "मैं कनाडा से हूँ।"], BN: ["থেকে", "আমি কানাডা থেকে এসেছি।"] },
  core3000_0027: { ET: ["juures; kõrval", "Kott on ukse kõrval."], IS: ["við; hjá", "Taskan er við hurðina."], HI: ["के पास", "बैग दरवाज़े के पास है।"], BN: ["কাছে", "ব্যাগটা দরজার কাছে আছে।"] },
  core3000_0028: { ET: ["tuleviku abiverb", "Ma helistan sulle."], IS: ["mun; skal", "Ég mun hringja í þig."], HI: ["करूँगा; करूँगी", "मैं तुम्हें फ़ोन करूँगा।"], BN: ["করব; করবে", "আমি তোমাকে ফোন করব।"] },
  core3000_0029: { ET: ["või", "Tee või kohv sobib."], IS: ["eða", "Te eða kaffi er í lagi."], HI: ["या", "चाय या कॉफ़ी ठीक रहेगी।"], BN: ["অথবা", "চা অথবা কফি চলবে।"] },
  core3000_0030: { ET: ["ütlema", "Ütle palun oma nimi."], IS: ["segja", "Segðu nafnið þitt, vinsamlegast."], HI: ["कहना; बताना", "कृपया अपना नाम बताओ।"], BN: ["বলা", "দয়া করে তোমার নাম বলো।"] },
  core3000_0031: { ET: ["minema", "Pärast kooli lähen koju."], IS: ["fara", "Ég fer heim eftir skóla."], HI: ["जाना", "स्कूल के बाद मैं घर जाता हूँ।"], BN: ["যাওয়া", "স্কুলের পরে আমি বাড়ি যাই।"] },
  core3000_0032: { ET: ["seega; nii", "On hilja, seega lähen koju."], IS: ["svo; því", "Það er seint, svo ég fer heim."], HI: ["इसलिए", "देर हो गई है, इसलिए मैं घर जा रहा हूँ।"], BN: ["তাই", "দেরি হয়েছে, তাই আমি বাড়ি যাচ্ছি।"] },
  core3000_0033: { ET: ["kõik", "Kõik õpilased on siin."], IS: ["allir; allt", "Allir nemendur eru hér."], HI: ["सभी", "सभी विद्यार्थी यहाँ हैं।"], BN: ["সব", "সব ছাত্রছাত্রী এখানে আছে।"] },
  core3000_0034: { ET: ["sinna; seal", "Pane kott sinna."], IS: ["þar; þangað", "Settu töskuna þangað."], HI: ["वहाँ", "बैग वहाँ रखो।"], BN: ["সেখানে", "ব্যাগটা সেখানে রাখো।"] },
  core3000_0035: { ET: ["teadma; tundma", "Ma tean vastust."], IS: ["vita; þekkja", "Ég veit svarið."], HI: ["जानना", "मुझे उत्तर पता है।"], BN: ["জানা", "আমি উত্তরটা জানি।"] },
  core3000_0036: { ET: ["saama", "Täna saan uue raamatu."], IS: ["fá", "Ég fæ nýja bók í dag."], HI: ["पाना; मिलना", "मुझे आज नई किताब मिलेगी।"], BN: ["পাওয়া", "আজ আমি নতুন বই পাব।"] },
  core3000_0037: { ET: ["mõtlema; arvama", "Ma arvan, et see on õige."], IS: ["hugsa; halda", "Ég held að þetta sé rétt."], HI: ["सोचना", "मुझे लगता है कि यह सही है।"], BN: ["ভাবা", "আমি মনে করি এটা ঠিক।"] },
  core3000_0038: { ET: ["tegema; valmistama", "Ma valmistan kodus lõuna."], IS: ["gera; búa til", "Ég bý til hádegismat heima."], HI: ["बनाना", "मैं घर पर दोपहर का खाना बनाता हूँ।"], BN: ["বানানো", "আমি বাড়িতে দুপুরের খাবার বানাই।"] },
  core3000_0039: { ET: ["aeg", "Aeg on tähtis."], IS: ["tími", "Tími er mikilvægur."], HI: ["समय", "समय महत्वपूर्ण है।"], BN: ["সময়", "সময় গুরুত্বপূর্ণ।"] },
  core3000_0040: { ET: ["nägema", "Ma näen maja."], IS: ["sjá", "Ég sé hús."], HI: ["देखना", "मुझे एक घर दिखाई देता है।"], BN: ["দেখা", "আমি একটা বাড়ি দেখি।"] },
  core3000_0041: { ET: ["väljas; välja", "Mine palun nüüd välja."], IS: ["úti; út", "Farðu út núna, vinsamlegast."], HI: ["बाहर", "कृपया अब बाहर जाओ।"], BN: ["বাইরে", "দয়া করে এখন বাইরে যাও।"] },
  core3000_0042: { ET: ["hea", "See on hea päev."], IS: ["góður", "Þetta er góður dagur."], HI: ["अच्छा", "यह अच्छा दिन है।"], BN: ["ভালো", "এটা ভালো দিন।"] },
  core3000_0043: { ET: ["inimesed", "Siin on palju inimesi."], IS: ["fólk", "Hér er margt fólk."], HI: ["लोग", "यहाँ बहुत लोग हैं।"], BN: ["মানুষ", "এখানে অনেক মানুষ আছে।"] },
  core3000_0044: { ET: ["aasta", "Aastas on kaksteist kuud."], IS: ["ár", "Í ári eru tólf mánuðir."], HI: ["साल; वर्ष", "एक साल में बारह महीने होते हैं।"], BN: ["বছর", "এক বছরে বারো মাস।"] },
  core3000_0045: { ET: ["võtma", "Võta palun see kott."], IS: ["taka", "Taktu þessa tösku, vinsamlegast."], HI: ["लेना", "कृपया यह बैग लो।"], BN: ["নেওয়া", "দয়া করে এই ব্যাগটা নাও।"] },
  core3000_0046: { ET: ["hästi", "Ta loeb hästi."], IS: ["vel", "Hún les vel."], HI: ["अच्छी तरह", "वह अच्छी तरह पढ़ती है।"], BN: ["ভালোভাবে", "সে ভালোভাবে পড়ে।"] },
  core3000_0047: { ET: ["väga", "See tuba on väga väike."], IS: ["mjög", "Þetta herbergi er mjög lítið."], HI: ["बहुत", "यह कमरा बहुत छोटा है।"], BN: ["খুব", "এই ঘরটা খুব ছোট।"] },
  core3000_0048: { ET: ["ainult; just", "Mul on vaja ainult vett."], IS: ["bara; rétt", "Ég þarf bara vatn."], HI: ["सिर्फ़; अभी-अभी", "मुझे सिर्फ़ पानी चाहिए।"], BN: ["শুধু", "আমার শুধু পানি দরকার।"] },
  core3000_0049: { ET: ["tulema", "Tule palun siia."], IS: ["koma", "Komdu hingað, vinsamlegast."], HI: ["आना", "कृपया यहाँ आओ।"], BN: ["আসা", "দয়া করে এখানে এসো।"] },
  core3000_0050: { ET: ["töötama", "Ma töötan koolis."], IS: ["vinna", "Ég vinn í skóla."], HI: ["काम करना", "मैं स्कूल में काम करता हूँ।"], BN: ["কাজ করা", "আমি স্কুলে কাজ করি।"] },
  core3000_0051: { ET: ["kasutama", "Ma kasutan seda telefoni iga päev."], IS: ["nota", "Ég nota þennan síma á hverjum degi."], HI: ["इस्तेमाल करना", "मैं यह फ़ोन हर दिन इस्तेमाल करता हूँ।"], BN: ["ব্যবহার করা", "আমি এই ফোনটা প্রতিদিন ব্যবহার করি।"] },
  core3000_0052: { ET: ["siis; pärast seda", "Söö hommikusöök, siis mine kooli."], IS: ["svo; þá", "Borðaðu morgunmat, farðu svo í skólann."], HI: ["फिर", "नाश्ता करो, फिर स्कूल जाओ।"], BN: ["তারপর", "নাশতা করো, তারপর স্কুলে যাও।"] },
  core3000_0053: { ET: ["ka", "Ma räägin ka inglise keelt."], IS: ["líka; einnig", "Ég tala líka ensku."], HI: ["भी", "मैं अंग्रेज़ी भी बोलता हूँ।"], BN: ["ও; এছাড়াও", "আমি ইংরেজিও বলি।"] },
  core3000_0054: { ET: ["ainult", "Mul on ainult üks pastakas."], IS: ["aðeins", "Ég er aðeins með einn penna."], HI: ["केवल", "मेरे पास केवल एक पेन है।"], BN: ["মাত্র; শুধু", "আমার কাছে মাত্র একটা কলম আছে।"] },
  core3000_0055: { ET: ["vaatama", "Vaata tahvlit."], IS: ["horfa; líta", "Líttu á töfluna."], HI: ["देखना", "बोर्ड को देखो।"], BN: ["দেখা", "বোর্ডটা দেখো।"] },
  core3000_0056: { ET: ["tahtma; soovima", "Ma tahan uut raamatut."], IS: ["vilja", "Ég vil nýja bók."], HI: ["चाहना", "मुझे नई किताब चाहिए।"], BN: ["চাওয়া", "আমি নতুন বই চাই।"] },
  core3000_0057: { ET: ["andma", "Anna mulle palun pastakas."], IS: ["gefa", "Gefðu mér penna, vinsamlegast."], HI: ["देना", "कृपया मुझे पेन दो।"], BN: ["দেওয়া", "দয়া করে আমাকে কলম দাও।"] },
  core3000_0058: { ET: ["esimene", "See on minu esimene päev."], IS: ["fyrstur; fyrsta", "Þetta er fyrsti dagurinn minn."], HI: ["पहला", "यह मेरा पहला दिन है।"], BN: ["প্রথম", "এটা আমার প্রথম দিন।"] },
  core3000_0059: { ET: ["uus", "Mul on uus telefon."], IS: ["nýr", "Ég er með nýjan síma."], HI: ["नया", "मेरे पास नया फ़ोन है।"], BN: ["নতুন", "আমার নতুন ফোন আছে।"] },
  core3000_0060: { ET: ["viis; tee", "See on hea viis õppida."], IS: ["leið", "Þetta er góð leið til að læra."], HI: ["तरीका; रास्ता", "यह सीखने का अच्छा तरीका है।"], BN: ["উপায়; পথ", "এটা শেখার ভালো উপায়।"] },
  core3000_0061: { ET: ["leidma", "Ma leian võtmed laualt."], IS: ["finna", "Ég finn lyklana á borðinu."], HI: ["ढूँढ़ना; मिलना", "मुझे चाबियाँ मेज़ पर मिलती हैं।"], BN: ["খুঁজে পাওয়া", "আমি টেবিলে চাবিগুলো পাই।"] },
  core3000_0062: { ET: ["päev", "Päev võib olla väga kiire."], IS: ["dagur", "Dagurinn getur verið mjög annasamur."], HI: ["दिन", "दिन बहुत व्यस्त हो सकता है।"], BN: ["দিন", "দিনটা খুব ব্যস্ত হতে পারে।"] },
  core3000_0063: { ET: ["asi", "See asi on kasulik."], IS: ["hlutur", "Þessi hlutur er gagnlegur."], HI: ["चीज़; बात", "यह चीज़ उपयोगी है।"], BN: ["জিনিস; বিষয়", "এই জিনিসটা কাজে লাগে।"] },
  core3000_0064: { ET: ["õige; paremal", "Sinu vastus on õige."], IS: ["réttur; til hægri", "Svarið þitt er rétt."], HI: ["सही; दायाँ", "तुम्हारा उत्तर सही है।"], BN: ["সঠিক; ডান", "তোমার উত্তর সঠিক।"] },
  core3000_0065: { ET: ["kuidas", "Kuidas su nime kirjutatakse?"], IS: ["hvernig", "Hvernig er nafnið þitt skrifað?"], HI: ["कैसे", "तुम्हारा नाम कैसे लिखा जाता है?"], BN: ["কীভাবে", "তোমার নাম কীভাবে লেখা হয়?"] },
  core3000_0066: { ET: ["tagasi; selg", "Tule palun varsti tagasi."], IS: ["til baka; bak", "Komdu fljótlega til baka, vinsamlegast."], HI: ["वापस; पीठ", "कृपया जल्दी वापस आओ।"], BN: ["ফিরে; পিঠ", "দয়া করে শিগগির ফিরে এসো।"] },
  core3000_0067: { ET: ["tähendama", "Mida see sõna tähendab?"], IS: ["þýða", "Hvað þýðir þetta orð?"], HI: ["मतलब होना", "इस शब्द का क्या मतलब है?"], BN: ["মানে হওয়া", "এই শব্দের মানে কী?"] },
  core3000_0068: { ET: ["isegi", "Isegi laps saab seda teha."], IS: ["jafnvel", "Jafnvel barn getur gert þetta."], HI: ["यहाँ तक कि", "यहाँ तक कि बच्चा भी यह कर सकता है।"], BN: ["এমনকি", "এমনকি একটা শিশুও এটা করতে পারে।"] },
  core3000_0069: { ET: ["siin; siia", "Istu palun siia."], IS: ["hér; hingað", "Sestu hér, vinsamlegast."], HI: ["यहाँ", "कृपया यहाँ बैठो।"], BN: ["এখানে", "দয়া করে এখানে বসো।"] },
  core3000_0070: { ET: ["laps", "Laps mängib väljas."], IS: ["barn", "Barnið leikur sér úti."], HI: ["बच्चा", "बच्चा बाहर खेल रहा है।"], BN: ["শিশু; বাচ্চা", "বাচ্চাটা বাইরে খেলছে।"] },
  core3000_0071: { ET: ["ütlema; rääkima", "Ütle mulle palun oma nimi."], IS: ["segja; segja frá", "Segðu mér nafnið þitt, vinsamlegast."], HI: ["बताना; कहना", "कृपया मुझे अपना नाम बताओ।"], BN: ["বলা; জানানো", "দয়া করে আমাকে তোমার নাম বলো।"] },
  core3000_0072: { ET: ["tõesti; väga", "Mulle tõesti meeldib see raamat."], IS: ["í alvöru; mjög", "Mér líkar þessi bók mjög vel."], HI: ["सचमुच; बहुत", "मुझे यह किताब सचमुच पसंद है।"], BN: ["সত্যিই", "এই বইটা আমার সত্যিই ভালো লাগে।"] },
  core3000_0073: { ET: ["helistama; kutsuma", "Ma helistan emale iga päev."], IS: ["hringja; kalla", "Ég hringi í mömmu á hverjum degi."], HI: ["फ़ोन करना; बुलाना", "मैं माँ को हर दिन फ़ोन करता हूँ।"], BN: ["ফোন করা; ডাকা", "আমি মাকে প্রতিদিন ফোন করি।"] },
  core3000_0074: { ET: ["ettevõte; firma", "Ettevõte müüb neid telefone."], IS: ["fyrirtæki", "Fyrirtækið selur þessa síma."], HI: ["कंपनी", "कंपनी ये फ़ोन बेचती है।"], BN: ["কোম্পানি", "কোম্পানিটা এই ফোনগুলো বিক্রি করে।"] },
  core3000_0075: { ET: ["näitama", "Näita mulle palun kaarti."], IS: ["sýna", "Sýndu mér kortið, vinsamlegast."], HI: ["दिखाना", "कृपया मुझे नक्शा दिखाओ।"], BN: ["দেখানো", "দয়া করে আমাকে মানচিত্রটা দেখাও।"] },
  core3000_0076: { ET: ["elu", "Elu on siin teistsugune."], IS: ["líf", "Lífið er öðruvísi hér."], HI: ["जीवन", "यहाँ जीवन अलग है।"], BN: ["জীবন", "এখানে জীবন আলাদা।"] },
  core3000_0077: { ET: ["mees", "Mees ootab väljas."], IS: ["maður", "Maðurinn bíður úti."], HI: ["आदमी; पुरुष", "आदमी बाहर इंतज़ार कर रहा है।"], BN: ["পুরুষ; মানুষ", "লোকটা বাইরে অপেক্ষা করছে।"] },
  core3000_0078: { ET: ["muutma; muutuma", "Plaanid muutuvad kiiresti."], IS: ["breyta; breytast", "Áætlanir breytast hratt."], HI: ["बदलना", "योजनाएँ जल्दी बदलती हैं।"], BN: ["বদলানো; বদলে যাওয়া", "পরিকল্পনাগুলো দ্রুত বদলায়।"] },
  core3000_0079: { ET: ["koht", "See koht on vaikne."], IS: ["staður", "Þessi staður er rólegur."], HI: ["जगह", "यह जगह शांत है।"], BN: ["জায়গা", "এই জায়গাটা শান্ত।"] },
  core3000_0080: { ET: ["pikk", "See on pikk tee."], IS: ["langur", "Þetta er löng leið."], HI: ["लंबा", "यह लंबा रास्ता है।"], BN: ["লম্বা", "এটা লম্বা রাস্তা।"] },
  core3000_0081: { ET: ["end tundma", "Ma tunnen end täna hästi."], IS: ["líða; finna fyrir", "Mér líður vel í dag."], HI: ["महसूस करना", "मैं आज अच्छा महसूस कर रहा हूँ।"], BN: ["অনুভব করা", "আজ আমার ভালো লাগছে।"] },
  core3000_0082: { ET: ["liiga; ka", "See kott on liiga raske."], IS: ["of; líka", "Þessi taska er of þung."], HI: ["बहुत ज़्यादा; भी", "यह बैग बहुत ज़्यादा भारी है।"], BN: ["অতিরিক্ত; খুব বেশি", "এই ব্যাগটা খুব বেশি ভারী।"] },
  core3000_0083: { ET: ["ikka veel", "Ma elan ikka veel siin."], IS: ["ennþá", "Ég bý ennþá hér."], HI: ["अभी भी", "मैं अभी भी यहाँ रहता हूँ।"], BN: ["এখনও", "আমি এখনও এখানে থাকি।"] },
  core3000_0084: { ET: ["probleem", "See on väike probleem."], IS: ["vandamál", "Þetta er lítið vandamál."], HI: ["समस्या", "यह एक छोटी समस्या है।"], BN: ["সমস্যা", "এটা একটা ছোট সমস্যা।"] },
  core3000_0085: { ET: ["kirjutama", "Kirjuta palun oma nimi."], IS: ["skrifa", "Skrifaðu nafnið þitt, vinsamlegast."], HI: ["लिखना", "कृपया अपना नाम लिखो।"], BN: ["লেখা", "দয়া করে তোমার নাম লেখো।"] },
  core3000_0086: { ET: ["suurepärane; suur", "See on suurepärane mõte."], IS: ["frábær; mikill", "Þetta er frábær hugmynd."], HI: ["शानदार; बड़ा", "यह एक शानदार विचार है।"], BN: ["দারুণ; বড়", "এটা দারুণ ভাবনা।"] },
  core3000_0087: { ET: ["proovima; püüdma", "Ma püüan iga päev õppida."], IS: ["reyna", "Ég reyni að læra á hverjum degi."], HI: ["कोशिश करना", "मैं हर दिन पढ़ने की कोशिश करता हूँ।"], BN: ["চেষ্টা করা", "আমি প্রতিদিন পড়ার চেষ্টা করি।"] },
  core3000_0088: { ET: ["lahkuma; jätma", "Me lahkume kell kaheksa."], IS: ["fara; yfirgefa", "Við förum klukkan átta."], HI: ["जाना; छोड़ना", "हम आठ बजे निकलते हैं।"], BN: ["যাওয়া; ছেড়ে যাওয়া", "আমরা আটটায় বের হই।"] },
  core3000_0089: { ET: ["number; arv", "Kirjuta number siia."], IS: ["númer; tala", "Skrifaðu númerið hér."], HI: ["संख्या; नंबर", "यहाँ संख्या लिखो।"], BN: ["সংখ্যা; নম্বর", "এখানে সংখ্যাটা লেখো।"] },
  core3000_0090: { ET: ["osa", "See osa on tähtis."], IS: ["hluti", "Þessi hluti er mikilvægur."], HI: ["भाग", "यह भाग महत्वपूर्ण है।"], BN: ["অংশ", "এই অংশটা গুরুত্বপূর্ণ।"] },
  core3000_0091: { ET: ["punkt; mõte", "See punkt on selge."], IS: ["punktur; atriði", "Þetta atriði er skýrt."], HI: ["बिंदु; बात", "यह बात साफ़ है।"], BN: ["বিন্দু; কথা", "এই কথাটা পরিষ্কার।"] },
  core3000_0092: { ET: ["aitama", "Ma aitan oma sõpra."], IS: ["hjálpa", "Ég hjálpa vini mínum."], HI: ["मदद करना", "मैं अपने दोस्त की मदद करता हूँ।"], BN: ["সাহায্য করা", "আমি আমার বন্ধুকে সাহায্য করি।"] },
  core3000_0093: { ET: ["küsima; paluma", "Esita palun küsimus."], IS: ["spyrja; biðja", "Spurðu spurningu, vinsamlegast."], HI: ["पूछना; माँगना", "कृपया सवाल पूछो।"], BN: ["জিজ্ঞেস করা; অনুরোধ করা", "দয়া করে প্রশ্ন করো।"] },
  core3000_0094: { ET: ["kohtuma; tutvuma", "Me kohtume koolis."], IS: ["hitta; kynnast", "Við hittumst í skólanum."], HI: ["मिलना", "हम स्कूल में मिलते हैं।"], BN: ["দেখা করা", "আমরা স্কুলে দেখা করি।"] },
  core3000_0095: { ET: ["algama; alustama", "Tund algab kell üheksa."], IS: ["byrja", "Kennslan byrjar klukkan níu."], HI: ["शुरू होना", "कक्षा नौ बजे शुरू होती है।"], BN: ["শুরু হওয়া", "ক্লাসটা নয়টায় শুরু হয়।"] },
  core3000_0096: { ET: ["rääkima", "Ma räägin õpetajaga."], IS: ["tala", "Ég tala við kennarann."], HI: ["बात करना; बोलना", "मैं शिक्षक से बात करता हूँ।"], BN: ["কথা বলা", "আমি শিক্ষকের সঙ্গে কথা বলি।"] },
  core3000_0097: { ET: ["panema", "Pane raamat lauale."], IS: ["setja; leggja", "Settu bókina á borðið."], HI: ["रखना", "किताब मेज़ पर रखो।"], BN: ["রাখা", "বইটা টেবিলে রাখো।"] },
  core3000_0098: { ET: ["saama; muutuma", "Ma tahan õpetajaks saada."], IS: ["verða", "Ég vil verða kennari."], HI: ["बनना", "मैं शिक्षक बनना चाहता हूँ।"], BN: ["হয়ে ওঠা", "আমি শিক্ষক হতে চাই।"] },
  core3000_0099: { ET: ["huvi", "Muusika huvitab teda."], IS: ["áhugi", "Hún hefur áhuga á tónlist."], HI: ["रुचि", "उसे संगीत में रुचि है।"], BN: ["আগ্রহ", "তার সংগীতে আগ্রহ আছে।"] },
  core3000_0100: { ET: ["riik; maa", "Kanada on suur riik."], IS: ["land; ríki", "Kanada er stórt land."], HI: ["देश", "कनाडा बड़ा देश है।"], BN: ["দেশ", "কানাডা বড় দেশ।"] },
  core3000_0101: { ET: ["vana", "See on vana maja."], IS: ["gamall", "Þetta er gamalt hús."], HI: ["पुराना", "यह पुराना घर है।"], BN: ["পুরোনো", "এটা পুরোনো বাড়ি।"] },
  core3000_0102: { ET: ["kool", "Minu maja lähedal on kool."], IS: ["skóli", "Það er skóli nálægt húsinu mínu."], HI: ["स्कूल", "मेरे घर के पास स्कूल है।"], BN: ["স্কুল", "আমার বাড়ির কাছে স্কুল আছে।"] },
  core3000_0103: { ET: ["hiline; hilinema", "Ma jään tundi hiljaks."], IS: ["seinn; seint", "Ég er seinn í tíma."], HI: ["देर; देर होना", "मुझे कक्षा में देर हो रही है।"], BN: ["দেরি; দেরি হওয়া", "ক্লাসে আমার দেরি হচ্ছে।"] },
  core3000_0104: { ET: ["kõrge", "Sein on kõrge."], IS: ["hár", "Veggurinn er hár."], HI: ["ऊँचा", "दीवार ऊँची है।"], BN: ["উঁচু", "দেয়ালটা উঁচু।"] },
  core3000_0105: { ET: ["erinev", "Need kaks raamatut on erinevad."], IS: ["ólíkur; öðruvísi", "Þessar tvær bækur eru ólíkar."], HI: ["अलग", "ये दो किताबें अलग हैं।"], BN: ["ভিন্ন; আলাদা", "এই দুইটা বই আলাদা।"] },
  core3000_0106: { ET: ["lõpp", "Loo lõpp on kurb."], IS: ["endir", "Endir sögunnar er sorglegur."], HI: ["अंत", "कहानी का अंत दुखद है।"], BN: ["শেষ", "গল্পের শেষটা দুঃখের।"] },
  core3000_0107: { ET: ["elama", "Ma elan väikeses linnas."], IS: ["búa; lifa", "Ég bý í litlum bæ."], HI: ["रहना; जीना", "मैं छोटे शहर में रहता हूँ।"], BN: ["থাকা; বাঁচা", "আমি ছোট শহরে থাকি।"] },
  core3000_0108: { ET: ["miks", "Miks sa siin oled?"], IS: ["af hverju", "Af hverju ertu hér?"], HI: ["क्यों", "तुम यहाँ क्यों हो?"], BN: ["কেন", "তুমি এখানে কেন?"] },
  core3000_0109: { ET: ["maailm", "Inimesed elavad üle kogu maailma."], IS: ["heimur", "Fólk býr um allan heim."], HI: ["दुनिया", "लोग पूरी दुनिया में रहते हैं।"], BN: ["পৃথিবী; দুনিয়া", "মানুষ সারা পৃথিবীতে থাকে।"] },
  core3000_0110: { ET: ["nädal", "Nädalas on seitse päeva."], IS: ["vika", "Í viku eru sjö dagar."], HI: ["सप्ताह", "सप्ताह में सात दिन होते हैं।"], BN: ["সপ্তাহ", "এক সপ্তাহে সাত দিন।"] },
  core3000_0111: { ET: ["mängima", "Lapsed mängivad pargis."], IS: ["leika; spila", "Börnin leika sér í garðinum."], HI: ["खेलना", "बच्चे पार्क में खेलते हैं।"], BN: ["খেলা", "বাচ্চারা পার্কে খেলে।"] },
  core3000_0112: { ET: ["koju; kodus", "Pärast tööd lähen koju."], IS: ["heim; heima", "Ég fer heim eftir vinnu."], HI: ["घर; घर पर", "काम के बाद मैं घर जाता हूँ।"], BN: ["বাড়ি; বাড়িতে", "কাজের পরে আমি বাড়ি যাই।"] },
  core3000_0113: { ET: ["mitte kunagi", "Ma ei söö kunagi liha."], IS: ["aldrei", "Ég borða aldrei kjöt."], HI: ["कभी नहीं", "मैं कभी मांस नहीं खाता।"], BN: ["কখনও না", "আমি কখনও মাংস খাই না।"] },
  core3000_0114: { ET: ["sisaldama; hõlmama", "Hommikusöök võib olla hinna sees."], IS: ["fela í sér; innihalda", "Morgunmatur getur verið innifalinn í verðinu."], HI: ["शामिल करना", "नाश्ता कीमत में शामिल हो सकता है।"], BN: ["অন্তর্ভুক্ত করা", "নাশতা দামের মধ্যে থাকতে পারে।"] },
  core3000_0115: { ET: ["kursus; õppeaine", "See kursus algab täna."], IS: ["námskeið", "Þetta námskeið byrjar í dag."], HI: ["कोर्स", "यह कोर्स आज शुरू होता है।"], BN: ["কোর্স", "এই কোর্সটা আজ শুরু হচ্ছে।"] },
  core3000_0116: { ET: ["maja", "Kooli lähedal on maja."], IS: ["hús", "Það er hús nálægt skólanum."], HI: ["घर", "स्कूल के पास घर है।"], BN: ["বাড়ি", "স্কুলের কাছে বাড়ি আছে।"] },
  core3000_0117: { ET: ["aruanne", "Aruanne on lühike."], IS: ["skýrsla", "Skýrslan er stutt."], HI: ["रिपोर्ट", "रिपोर्ट छोटी है।"], BN: ["রিপোর্ট", "রিপোর্টটা ছোট।"] },
  core3000_0118: { ET: ["rühm; grupp", "Rühm õpilasi ootab."], IS: ["hópur", "Hópur nemenda bíður."], HI: ["समूह", "विद्यार्थियों का समूह इंतज़ार कर रहा है।"], BN: ["দল; গোষ্ঠী", "ছাত্রছাত্রীদের একটা দল অপেক্ষা করছে।"] },
  core3000_0119: { ET: ["juhtum; kord", "See juhtum on teistsugune."], IS: ["tilvik; mál", "Þetta mál er öðruvísi."], HI: ["मामला; केस", "यह मामला अलग है।"], BN: ["ক্ষেত্র; ঘটনা", "এই ঘটনা আলাদা।"] },
  core3000_0120: { ET: ["naine", "Naine ootab väljas."], IS: ["kona", "Konan bíður úti."], HI: ["महिला", "महिला बाहर इंतज़ार कर रही है।"], BN: ["নারী; মহিলা", "মহিলাটি বাইরে অপেক্ষা করছেন।"] },
  core3000_0121: { ET: ["raamat", "See raamat on uus."], IS: ["bók", "Þessi bók er ný."], HI: ["किताब", "यह किताब नई है।"], BN: ["বই", "এই বইটা নতুন।"] },
  core3000_0122: { ET: ["pere; perekond", "Mu pere on kodus."], IS: ["fjölskylda", "Fjölskyldan mín er heima."], HI: ["परिवार", "मेरा परिवार घर पर है।"], BN: ["পরিবার", "আমার পরিবার বাড়িতে আছে।"] },
  core3000_0123: { ET: ["näima; tunduma", "Sa tundud väsinud."], IS: ["virðast", "Þú virðist þreyttur."], HI: ["लगना", "तुम थके हुए लगते हो।"], BN: ["মনে হওয়া", "তোমাকে ক্লান্ত মনে হচ্ছে।"] },
  core3000_0124: { ET: ["lubama; laskma", "Luba mul aidata."], IS: ["leyfa", "Leyfðu mér að hjálpa."], HI: ["देने देना; अनुमति देना", "मुझे मदद करने दो।"], BN: ["করতে দেওয়া", "আমাকে সাহায্য করতে দাও।"] },
  core3000_0125: { ET: ["jälle; uuesti", "Ütle seda palun veel kord."], IS: ["aftur", "Segðu það aftur, vinsamlegast."], HI: ["फिर; दोबारा", "कृपया यह फिर से कहो।"], BN: ["আবার", "দয়া করে এটা আবার বলো।"] },
  core3000_0126: { ET: ["liik", "See teeliik on hea."], IS: ["tegund", "Þessi tegund af tei er góð."], HI: ["प्रकार", "इस प्रकार की चाय अच्छी है।"], BN: ["ধরন", "এই ধরনের চা ভালো।"] },
  core3000_0127: { ET: ["hoidma; jätma", "Jäta oma telefon siia."], IS: ["halda; skilja eftir", "Skildu símann þinn eftir hér."], HI: ["रखना; छोड़ना", "अपना फ़ोन यहाँ छोड़ दो।"], BN: ["রাখা; রেখে যাওয়া", "তোমার ফোন এখানে রেখে যাও।"] },
  core3000_0128: { ET: ["kuulma", "Ma kuulen väljas muusikat."], IS: ["heyra", "Ég heyri tónlist úti."], HI: ["सुनना", "मुझे बाहर संगीत सुनाई दे रहा है।"], BN: ["শোনা", "আমি বাইরে গান শুনছি।"] },
  core3000_0129: { ET: ["süsteem", "See süsteem on lihtne."], IS: ["kerfi", "Þetta kerfi er einfalt."], HI: ["प्रणाली; सिस्टम", "यह प्रणाली सरल है।"], BN: ["ব্যবস্থা; সিস্টেম", "এই ব্যবস্থাটা সহজ।"] },
  core3000_0130: { ET: ["küsimus", "Esita nüüd küsimus."], IS: ["spurning", "Spurðu spurningu núna."], HI: ["सवाल; प्रश्न", "अब सवाल पूछो।"], BN: ["প্রশ্ন", "এখন প্রশ্ন করো।"] },
  core3000_0131: { ET: ["alati", "Ta tuleb alati vara."], IS: ["alltaf", "Hún kemur alltaf snemma."], HI: ["हमेशा", "वह हमेशा जल्दी आती है।"], BN: ["সবসময়", "সে সবসময় তাড়াতাড়ি আসে।"] },
  core3000_0132: { ET: ["suur", "See on suur tuba."], IS: ["stór", "Þetta er stórt herbergi."], HI: ["बड़ा", "यह बड़ा कमरा है।"], BN: ["বড়", "এটা বড় ঘর।"] },
  core3000_0133: { ET: ["komplekt", "Selles komplektis on kuus tassi."], IS: ["sett", "Í þessu setti eru sex bollar."], HI: ["सेट", "इस सेट में छह कप हैं।"], BN: ["সেট", "এই সেটে ছয়টা কাপ আছে।"] },
  core3000_0134: { ET: ["väike", "See on väike tuba."], IS: ["lítill", "Þetta er lítið herbergi."], HI: ["छोटा", "यह छोटा कमरा है।"], BN: ["ছোট", "এটা ছোট ঘর।"] },
  core3000_0135: { ET: ["õppima", "Ma õpin inglise keelt iga päev."], IS: ["læra; stunda nám", "Ég læri ensku á hverjum degi."], HI: ["पढ़ना; सीखना", "मैं हर दिन अंग्रेज़ी पढ़ता हूँ।"], BN: ["পড়া; শেখা", "আমি প্রতিদিন ইংরেজি পড়ি।"] },
  core3000_0136: { ET: ["järgima; järgnema", "Järgne palun õpetajale."], IS: ["fylgja", "Fylgdu kennaranum, vinsamlegast."], HI: ["पीछे चलना; पालन करना", "कृपया शिक्षक के पीछे चलो।"], BN: ["অনুসরণ করা", "দয়া করে শিক্ষকের পেছনে চলো।"] },
  core3000_0137: { ET: ["alustama; algama", "Tund võib nüüd alata."], IS: ["byrja", "Tíminn getur byrjað núna."], HI: ["शुरू करना", "कक्षा अब शुरू हो सकती है।"], BN: ["শুরু করা", "ক্লাস এখন শুরু হতে পারে।"] },
  core3000_0138: { ET: ["tähtis; oluline", "See küsimus on tähtis."], IS: ["mikilvægur", "Þessi spurning er mikilvæg."], HI: ["महत्वपूर्ण", "यह सवाल महत्वपूर्ण है।"], BN: ["গুরুত্বপূর্ণ", "এই প্রশ্নটা গুরুত্বপূর্ণ।"] },
  core3000_0139: { ET: ["jooksma", "Ma jooksen pargis."], IS: ["hlaupa", "Ég hleyp í garðinum."], HI: ["दौड़ना", "मैं पार्क में दौड़ता हूँ।"], BN: ["দৌড়ানো", "আমি পার্কে দৌড়াই।"] },
  core3000_0140: { ET: ["pöörama", "Pööra ukse juures vasakule."], IS: ["beygja; snúa", "Beygðu til vinstri við hurðina."], HI: ["मुड़ना", "दरवाज़े के पास बाएँ मुड़ो।"], BN: ["মোড় নেওয়া; ঘোরানো", "দরজার কাছে বাঁ দিকে মোড় নাও।"] },
  core3000_0141: { ET: ["tooma", "Too palun oma raamat."], IS: ["koma með; færa", "Komdu með bókina þína, vinsamlegast."], HI: ["लाना", "कृपया अपनी किताब लाओ।"], BN: ["আনা", "দয়া করে তোমার বই আনো।"] },
  core3000_0142: { ET: ["varane; vara", "Me peame vara alustama."], IS: ["snemma; snemmbúinn", "Við verðum að byrja snemma."], HI: ["जल्दी; प्रारंभिक", "हमें जल्दी शुरू करना होगा।"], BN: ["তাড়াতাড়ি; আগের", "আমাদের তাড়াতাড়ি শুরু করতে হবে।"] },
  core3000_0143: { ET: ["käsi", "Tõsta käsi."], IS: ["hönd", "Réttu upp höndina."], HI: ["हाथ", "अपना हाथ उठाओ।"], BN: ["হাত", "হাত তোলো।"] },
  core3000_0144: { ET: ["osariik; riik", "California on suur osariik."], IS: ["ríki; fylki", "Kalifornía er stórt fylki."], HI: ["राज्य", "कैलिफ़ोर्निया बड़ा राज्य है।"], BN: ["রাজ্য", "ক্যালিফোর্নিয়া বড় রাজ্য।"] },
  core3000_0145: { ET: ["liigutama; nihutama", "Liiguta palun tooli."], IS: ["færa; hreyfa", "Færðu stólinn, vinsamlegast."], HI: ["हिलाना; सरकाना", "कृपया कुर्सी सरकाओ।"], BN: ["সরানো; নড়ানো", "দয়া করে চেয়ারটা সরাও।"] },
  core3000_0146: { ET: ["raha", "Mul on lõuna jaoks raha vaja."], IS: ["peningar", "Ég þarf peninga fyrir hádegismat."], HI: ["पैसा", "मुझे दोपहर के खाने के लिए पैसे चाहिए।"], BN: ["টাকা", "দুপুরের খাবারের জন্য আমার টাকা দরকার।"] },
  core3000_0147: { ET: ["tõsiasi; fakt", "See tõsiasi on tähtis."], IS: ["staðreynd", "Þessi staðreynd er mikilvæg."], HI: ["तथ्य", "यह तथ्य महत्वपूर्ण है।"], BN: ["তথ্য", "এই তথ্যটা গুরুত্বপূর্ণ।"] },
  core3000_0148: { ET: ["siiski; kuid", "On hilja, kuid võime siiski oodata."], IS: ["hins vegar; þó", "Það er seint, en við getum þó beðið."], HI: ["हालाँकि; फिर भी", "देर हो गई है, फिर भी हम इंतज़ार कर सकते हैं।"], BN: ["তবে; তবুও", "দেরি হয়েছে, তবুও আমরা অপেক্ষা করতে পারি।"] },
  core3000_0149: { ET: ["piirkond; ala", "See piirkond on rahulik."], IS: ["svæði", "Þetta svæði er rólegt."], HI: ["क्षेत्र", "यह क्षेत्र शांत है।"], BN: ["এলাকা; ক্ষেত্র", "এই এলাকাটা শান্ত।"] },
  core3000_0150: { ET: ["pakkuma; tagama", "Kool saab lõuna pakkuda."], IS: ["útvega; veita", "Skólinn getur útvegað hádegismat."], HI: ["प्रदान करना", "स्कूल दोपहर का खाना दे सकता है।"], BN: ["দেওয়া; সরবরাহ করা", "স্কুল দুপুরের খাবার দিতে পারে।"] },
};

const languages = ["ET", "IS", "HI", "BN"];

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, rows) {
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

const sourceRows = await readJsonl(inputPath);
const outputRows = sourceRows.map((row) => {
  const localized = translations[row.core_item_id];
  if (!localized) throw new Error(`Missing ET/IS/HI/BN translation for ${row.core_item_id}.`);
  const out = {
    release_id: releaseId,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_headword: row.source_headword,
    part_of_speech: row.part_of_speech,
    en_display: row.en_display,
    example_EN: row.example_EN,
    translation_batch: "et_is_hi_bn_v0",
    translation_status: "draft_native_style_qa_v3_checked",
    source_note: "Internal LunaCards draft translation layer; native-style QA v1/v2/v3 checked, final QA and source-assisted checks still required before delivery.",
  };
  for (const language of languages) {
    const [display, example] = localized[language] ?? [];
    out[language] = normalizeText(display);
    out[`example_${language}`] = normalizeText(example);
  }
  return out;
});

await fs.mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_et_is_hi_bn_v0.jsonl`);
await writeJsonl(outputPath, outputRows);

const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_et_is_hi_bn_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Translation Batch ET/IS/HI/BN v0: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    "- Languages: ET, IS, HI, BN",
    "- Fields: display word plus translated example only",
    "- Target-language transcription fields: not generated",
    "- Status: draft_native_style_qa_v3_checked",
    "",
    "This artifact does not import Postgres rows and does not create a Google Sheet.",
    "Estonian and Icelandic use native Latin orthography. Hindi uses Devanagari. Bengali uses Bengali script.",
    "Function words may use learner-facing glosses where a direct one-word target equivalent is misleading.",
    "Native-style QA v1/v2 repaired obvious naturalness/copy issues during drafting; final QA evidence is still not created.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 ET/IS/HI/BN translation batch written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length}`
);
