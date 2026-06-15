#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_hi_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_hi_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-hi.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "HI";
const BATCH_ID = "hi_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?।]$/u;
const DEVANAGARI_RE = /\p{Script=Devanagari}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const HI_TRANSLATIONS_TSV = `source_headword	HI	example_HI
machine	मशीन; यंत्र	यह मशीन कॉफ़ी बनाती है।
magazine	पत्रिका	वह संगीत पत्रिका पढ़ता है।
main	मुख्य	यह मुख्य दरवाज़ा है।
make	बनाना; करना	मैं घर पर दोपहर का खाना बनाता हूँ।
man	आदमी; पुरुष	वह आदमी मेरा शिक्षक है।
many	बहुत; कई	यहाँ बहुत से विद्यार्थी हैं।
map	नक्शा	नक्शे को देखो।
March	मार्च	मेरा जन्मदिन मार्च में है।
market	बाज़ार	हम बाज़ार से फल खरीदते हैं।
married	विवाहित; शादीशुदा	मेरी बहन विवाहित है।
May	मई	स्कूल मई में समाप्त होता है।
maybe	शायद	शायद बारिश होगी।
me	मुझे; मुझको	कृपया मेरी मदद करो।
meal	भोजन; खाना	भोजन गरम है।
mean	मतलब होना; अर्थ होना	इस संकेत का क्या मतलब है?
meaning	अर्थ	इसका अर्थ क्या है?
meat	मांस	मैं रात के खाने में मांस खाता हूँ।
meet	मिलना	हम स्कूल के बाद मिलते हैं।
meeting	बैठक; मुलाकात	बैठक अब शुरू होती है।
member	सदस्य	वह क्लब की सदस्य है।
menu	मेनू; भोजन-सूची	मेनू पढ़ो।
message	संदेश	मैं छोटा संदेश भेजता हूँ।
metre	मीटर	एक मीटर आगे चलो।
midnight	आधी रात	ट्रेन आधी रात को जाती है।
mile	मील	हम एक मील चलते हैं।
milk	दूध	मैं नाश्ते में दूध पीता हूँ।
million	दस लाख; मिलियन	यहाँ दस लाख लोग रहते हैं।
minute1	मिनट	एक मिनट रुको।
miss	याद करना; चूकना	मुझे पुराना स्कूल याद आता है।
mistake	गलती	उत्तर में गलती है।
model	मॉडल; नमूना	यह छोटा मॉडल है।
modern	आधुनिक	रसोई आधुनिक है।
moment	क्षण; पल	एक पल रुको।
Monday	सोमवार	सोमवार को हम काम शुरू करते हैं।
money	पैसा; रुपये	मुझे थोड़ा पैसा चाहिए।
month	महीना	जून गरम महीना है।
more	और; अधिक	मुझे और समय चाहिए।
morning	सुबह	मैं सुबह पढ़ता हूँ।
most	अधिकांश; सबसे ज़्यादा	अधिकांश विद्यार्थियों को संगीत पसंद है।
mother	माँ; माता	मेरी माँ आज काम करती हैं।
mountain	पहाड़	पहाड़ बहुत ऊँचा है।
mouse	चूहा	चूहा कुर्सी के नीचे है।
mouth	मुँह	अपना मुँह खोलो।
move	हिलाना; जाना	कुर्सी को यहाँ हिलाओ।
movie	फ़िल्म	आज रात हम फ़िल्म देखते हैं।
much	बहुत; कितना	यह कितने का है?
mum	मम्मी	मम्मी घर पर हैं।
museum	संग्रहालय	संग्रहालय दस बजे खुलता है।
music	संगीत	मैं संगीत सुनता हूँ।
must modal	ज़रूर करना; होना चाहिए	तुम्हें यहाँ रुकना होगा।
my	मेरा; मेरी; मेरे	यह मेरी किताब है।
name	नाम; नाम रखना	यहाँ अपना नाम लिखो।
natural	प्राकृतिक; स्वाभाविक	यह रस प्राकृतिक है।
near	पास; नज़दीक	बैंक पास है।
need	चाहिए; ज़रूरत	मुझे कलम चाहिए।
negative	नकारात्मक	यह उत्तर नकारात्मक है।
neighbour	पड़ोसी	मेरा पड़ोसी मित्रवत है।
never	कभी नहीं	मैं कभी कॉफ़ी नहीं पीता।
new	नया; नई	यह फ़ोन नया है।
news	समाचार; ख़बरें	आज की ख़बरें अच्छी हैं।
newspaper	अख़बार	वह अख़बार पढ़ता है।
next	अगला; अगली	अगली बस देर से है।
next to	के बगल में	मेरे बगल में बैठो।
nice	अच्छा; सुंदर	कमरा अच्छा है।
night	रात	मैं रात में सोता हूँ।
nine	नौ	यहाँ नौ विद्यार्थी हैं।
nineteen	उन्नीस	वह उन्नीस साल का है।
ninety	नब्बे	मेरे दादा नब्बे साल के हैं।
no	नहीं; कोई नहीं	नहीं, धन्यवाद।
no one	कोई नहीं	कमरे में कोई नहीं है।
nobody	कोई नहीं	घर में कोई नहीं है।
north	उत्तर	स्टेशन उत्तर में है।
nose	नाक	मेरी नाक ठंडी है।
not	नहीं	मैं थका हुआ नहीं हूँ।
note	नोट; टिप्पणी	अब एक नोट लिखो।
nothing	कुछ नहीं	डिब्बे में कुछ नहीं है।
November	नवंबर	मेरा कोर्स नवंबर में शुरू होता है।
now	अब; अभी	अभी यहाँ आओ।
number	संख्या; नंबर	यहाँ संख्या लिखो।
nurse	नर्स	नर्स दयालु है।
object	वस्तु; चीज़	वस्तु को मेज़ पर रखो।
o’clock	बजे	कक्षा नौ बजे शुरू होती है।
October	अक्टूबर	हम अक्टूबर में यात्रा करते हैं।
of	का; की; के	यह चाय का कप है।
off	बंद	बत्ती बंद करो।
office	कार्यालय; दफ़्तर	मेरा दफ़्तर छोटा है।
often	अक्सर	मैं अक्सर पैदल स्कूल जाता हूँ।
oh	ओह; अरे	ओह, अब मैं समझता हूँ।
OK	ठीक है	क्या यह ठीक है?
old	पुराना; बूढ़ा	यह घर पुराना है।
on	पर; चालू	किताब मेज़ पर है।
once	एक बार	मैं सप्ताह में एक बार फ़ोन करता हूँ।
one	एक	मेरी एक बहन है।
onion	प्याज़	एक प्याज़ काटो।
online	ऑनलाइन	मैं ऑनलाइन पढ़ता हूँ।
only	केवल; सिर्फ़	मेरे पास सिर्फ़ एक बैग है।
open	खुला; खोलना	खिड़की खोलो।
opinion	राय	तुम्हारी राय क्या है?
opposite	सामने; विपरीत	दुकान बैंक के सामने है।
or	या	चाय या कॉफ़ी?
orange	संतरा; नारंगी	संतरा मीठा है।
order	ऑर्डर; आदेश	मैं सूप ऑर्डर करता हूँ।
other	दूसरा; अन्य	दूसरा दरवाज़ा इस्तेमाल करो।
our	हमारा; हमारी	यह हमारी कक्षा है।
out	बाहर	दोपहर के खाने के बाद बाहर जाओ।
outside	बाहर	बच्चे बाहर खेलते हैं।
over	ऊपर; के ऊपर	विमान शहर के ऊपर उड़ता है।
own	अपना; अपना होना	मेरा अपना कमरा है।
page	पृष्ठ; पन्ना	दसवाँ पन्ना खोलो।
paint	रंग; रंगना	दीवार को नीला रंगो।
painting	चित्र; पेंटिंग	चित्र सुंदर है।
pair	जोड़ी	मुझे मोज़ों की एक जोड़ी चाहिए।
paper	काग़ज़; पेपर	इस काग़ज़ पर लिखो।
paragraph	अनुच्छेद	पहला अनुच्छेद पढ़ो।
parent	माता-पिता; अभिभावक	एक अभिभावक बाहर इंतज़ार करता है।
park	पार्क; गाड़ी खड़ी करना	हम स्टेशन के पास गाड़ी खड़ी करते हैं।
part	भाग; हिस्सा	यह भाग आसान है।
partner	साथी	अपने साथी के साथ काम करो।
party	पार्टी; समारोह	पार्टी सात बजे शुरू होती है।
passport	पासपोर्ट	पासपोर्ट दिखाओ।
past	अतीत; बीता हुआ	साढ़े छह बजे हैं।
pay	भुगतान करना; देना	मैं कार्ड से भुगतान करता हूँ।
pen	कलम; पेन	यह कलम नीली है।
pencil	पेंसिल	मैं पेंसिल से लिखता हूँ।
people	लोग	यहाँ बहुत लोग हैं।
pepper	काली मिर्च; मिर्च	सूप में काली मिर्च डालो।
perfect	बिलकुल सही; परिपूर्ण	तुम्हारा उत्तर बिलकुल सही है।
period	अवधि; पीरियड	यह पीरियड छोटा है।
person	व्यक्ति; इंसान	एक व्यक्ति इंतज़ार कर रहा है।
personal	निजी; व्यक्तिगत	यह मेरा निजी फ़ोन है।
phone	फ़ोन; फ़ोन करना	मेरा फ़ोन बैग में है।
photo	फ़ोटो; तस्वीर	यहाँ एक फ़ोटो लो।
photograph	तस्वीर; फ़ोटोग्राफ़	तस्वीर पुरानी है।
phrase	वाक्यांश	इस वाक्यांश को दोहराओ।
piano	पियानो	वह पियानो बजाती है।
picture	तस्वीर; चित्र	तस्वीर को देखो।
piece	टुकड़ा	केक का एक टुकड़ा लो।
pig	सूअर	सूअर खेत में है।
pink	गुलाबी	उसका बैग गुलाबी है।
place	जगह; स्थान	जगह शांत है।
plan	योजना	हमें योजना चाहिए।
plane	विमान	विमान देर से है।
plant	पौधा; लगाना	आज पौधे को पानी दो।
play	खेलना; नाटक	बच्चे पार्क में खेलते हैं।
player	खिलाड़ी	खिलाड़ी तेज़ दौड़ता है।
please	कृपया	कृपया यहाँ बैठो।
point	बिंदु; बात	यह बिंदु महत्वपूर्ण है।
police	पुलिस	पुलिस बाहर है।
policeman	पुलिसवाला	पुलिसवाला हमारी मदद करता है।
pool	तालाब; पूल	पूल ठंडा है।
poor	ग़रीब	ग़रीब बच्चा भूखा है।
popular	लोकप्रिय	यह गीत लोकप्रिय है।
positive	सकारात्मक	परिणाम सकारात्मक है।
possible	संभव	क्या यह आज संभव है?
post	पोस्ट; डाक	मैं उसकी पोस्ट ऑनलाइन पढ़ता हूँ।
potato	आलू	मैं एक आलू खाता हूँ।
pound	पाउंड	यह एक पाउंड का है।
practice	अभ्यास	अभ्यास रोज़ मदद करता है।
practise	अभ्यास करना	मैं रोज़ अंग्रेज़ी का अभ्यास करता हूँ।
prefer	अधिक पसंद करना	मैं चाय अधिक पसंद करता हूँ।
prepare	तैयार करना	शाम को बैग तैयार करो।
present	मौजूद; उपहार	वह आज मौजूद है।
pretty	सुंदर; काफ़ी	बगीचा सुंदर है।
price	कीमत	कीमत कम है।
probably	शायद; संभवतः	वह शायद जानता है।
problem	समस्या	समस्या छोटी है।
product	उत्पाद; सामान	उत्पाद नया है।
programme	कार्यक्रम; प्रोग्राम	कार्यक्रम अब शुरू होता है।
project	परियोजना; प्रोजेक्ट	हमारी परियोजना पूरी है।
purple	बैंगनी	कमीज़ बैंगनी है।
put	रखना	किताब यहाँ रखो।
quarter	चौथाई; पंद्रह मिनट	सवा दो बजे हैं।
question	सवाल; प्रश्न	सवाल पूछो।
quick	तेज़; छोटा	यह छोटा टेस्ट है।
quickly	जल्दी	जल्दी जाओ।
quiet	शांत	पुस्तकालय शांत है।
quite	काफ़ी	कमरा काफ़ी छोटा है।
radio	रेडियो	रेडियो तेज़ है।
rain	बारिश; बरसना	अब बारिश शुरू होती है।
read	पढ़ना	यह वाक्य पढ़ो।
reader	पाठक	पाठक को कहानी पसंद है।
reading	पढ़ना; पाठ	पढ़ना सीखने में मदद करता है।
ready	तैयार	रात का खाना तैयार है।
real	असली; वास्तविक	यह असली समस्या है।
really	सचमुच; वाकई	मुझे यह गीत सचमुच पसंद है।
reason	कारण	कारण बताओ।
red	लाल	दरवाज़ा लाल है।
relax	आराम करना	काम के बाद आराम करो।
remember	याद रखना	पासपोर्ट याद रखना।
repeat	दोहराना	वाक्य दोहराओ।
report	रिपोर्ट; प्रतिवेदन	शाम को रिपोर्ट पढ़ो।
restaurant	रेस्तराँ	रेस्तराँ भरा हुआ है।
result	परिणाम	परिणाम अच्छा है।
return	लौटना; वापस करना	किताब कल वापस करो।
rice	चावल	मैं दोपहर के खाने में चावल खाता हूँ।
rich	अमीर	यह शहर अमीर है।
ride	सवारी करना; चलाना	मैं साइकिल से स्कूल जाता हूँ।
right	दायाँ; सही	यहाँ दाएँ मुड़ो।
river	नदी	नदी चौड़ी है।
road	सड़क	सड़क लंबी है।
room	कमरा	मेरा कमरा साफ़ है।
routine	दिनचर्या	मेरी दिनचर्या जल्दी शुरू होती है।
rule	नियम	नियम सरल है।
run	दौड़ना	मैं हर सुबह दौड़ता हूँ।
sad	दुखी	आज मैं दुखी हूँ।
salad	सलाद	सलाद ताज़ा है।
salt	नमक	थोड़ा नमक डालो।
same	वही; समान	हमारे पास वैसा ही बैग है।
sandwich	सैंडविच	मैं सैंडविच खाता हूँ।
Saturday	शनिवार	हम शनिवार को मिलते हैं।
say	कहना	अपना नाम कहो।
school	स्कूल; विद्यालय	मेरा स्कूल पास है।
science	विज्ञान	मैं विज्ञान पढ़ता हूँ।
scientist	वैज्ञानिक	वैज्ञानिक सवाल पूछता है।
sea	समुद्र	समुद्र नीला है।
second1 (unit of time)	सेकंड	एक सेकंड रुको।
section	खंड; भाग	यह खंड पढ़ो।
see	देखना	मैं अपने दोस्त को देखता हूँ।
sell	बेचना	वे ताज़े फल बेचते हैं।
send	भेजना	अब संदेश भेजो।
sentence	वाक्य	वाक्य लिखो।
September	सितंबर	स्कूल सितंबर में शुरू होता है।
seven	सात	यहाँ सात लोग हैं।
seventeen	सत्रह	वह सत्रह साल का है।
seventy	सत्तर	मेरी दादी सत्तर साल की हैं।
share	बाँटना; साझा करना	केक बाँटो।
she	वह; स्त्री	वह मेरी बहन है।
sheep	भेड़	भेड़ घास खाती है।
shirt	कमीज़	कमीज़ साफ़ है।
shoe	जूता	जूता बिस्तर के नीचे है।
shop	दुकान; ख़रीदारी करना	दुकान जल्दी बंद होती है।
shopping	ख़रीदारी	आज ख़रीदारी मज़ेदार है।
short	छोटा; कम	कहानी छोटी है।
should modal	चाहिए	तुम्हें आज आराम करना चाहिए।
show	दिखाना; शो	नक्शा दिखाओ।
shower	शावर; नहाना	मैं सुबह नहाता हूँ।
sick	बीमार	आज मैं बीमार हूँ।
similar	मिलता-जुलता; समान	हमारे बैग मिलते-जुलते हैं।
sing	गाना	मैं कक्षा में गाता हूँ।
singer	गायक; गायिका	गायक प्रसिद्ध है।
sister	बहन	मेरी बहन जवान है।
sit	बैठना	खिड़की के पास बैठो।
situation	स्थिति	स्थिति नई है।
six	छह	यहाँ छह किताबें हैं।
sixteen	सोलह	वह सोलह साल का है।
sixty	साठ	मेरे पिता साठ साल के हैं।
skill	कौशल	यह कौशल उपयोगी है।
skirt	स्कर्ट	स्कर्ट नीली है।
sleep	सोना; नींद	मैं आठ घंटे सोता हूँ।
slow	धीमा	बस धीमी है।
small	छोटा	कमरा छोटा है।
snake	साँप	साँप लंबा है।
snow	बर्फ़; बर्फ़ पड़ना	सर्दियों में बर्फ़ पड़ती है।
so	इसलिए; इतना	मैं थका हूँ, इसलिए आराम करता हूँ।
some	कुछ; थोड़ा	मुझे थोड़ा पानी चाहिए।
somebody	कोई	कोई दरवाज़े पर है।
someone	कोई	किसी ने संदेश छोड़ा।
something	कुछ	मुझे पीने के लिए कुछ चाहिए।
sometimes	कभी-कभी	मैं कभी-कभी पैदल स्कूल जाता हूँ।
son	बेटा	उसका बेटा स्कूल में है।
song	गीत; गाना	यह गीत नया है।
soon	जल्द	हम जल्द मिलेंगे।
sorry	माफ़ कीजिए; दुख है	मुझे दुख है।
sound	आवाज़; ध्वनि	आवाज़ तेज़ है।
soup	सूप	सूप गरम है।
south	दक्षिण	होटल दक्षिण में है।
space	जगह; अंतरिक्ष	कुर्सी के लिए जगह है।
speak	बोलना	कृपया धीरे बोलो।
special	विशेष	आज विशेष दिन है।
spell	हिज्जे बताना	अपना नाम हिज्जे से बताओ।
spelling	वर्तनी	वर्तनी जाँचो।
spend	खर्च करना; बिताना	मैं खाने पर पैसा खर्च करता हूँ।
sport	खेल	फ़ुटबॉल लोकप्रिय खेल है।
spring	वसंत; स्प्रिंग	वसंत में फूल उगते हैं।
stand	खड़ा होना	दरवाज़े के पास खड़े हो जाओ।
star	तारा	मैं चमकीला तारा देखता हूँ।
start	शुरू करना; शुरुआत	कक्षा अभी शुरू करो।
statement	कथन; बयान	कथन सही है।
station	स्टेशन	स्टेशन पास है।
stay	रुकना; रहना	आज घर पर रहो।
still	अभी भी	मैं अभी भी भूखा हूँ।
stop	रुकना; स्टॉप	कोने पर रुको।
story	कहानी	कहानी सुनाओ।
street	गली; सड़क	गली शांत है।
strong	मज़बूत	वह मज़बूत है।
student	विद्यार्थी; छात्र	विद्यार्थी किताब पढ़ता है।
study	पढ़ना; अध्ययन करना	मैं अंग्रेज़ी पढ़ता हूँ।
style	शैली	मुझे यह शैली पसंद है।
subject	विषय	अंग्रेज़ी मेरा विषय है।
success	सफलता	सफलता के लिए अभ्यास चाहिए।
sugar	चीनी	चाय में चीनी डालो।
summer	गर्मी; ग्रीष्म	यहाँ गर्मी गरम होती है।
sun	सूरज	सूरज चमकता है।
Sunday	रविवार	हम रविवार को आराम करते हैं।
supermarket	सुपरमार्केट	सुपरमार्केट खुला है।
sure	निश्चित; ज़रूर	मैं निश्चित हूँ।
sweater	स्वेटर	मेरा स्वेटर गरम है।
swim	तैरना	मैं हर हफ़्ते तैरता हूँ।
swimming	तैराकी	तैराकी अच्छा अभ्यास है।
table	मेज़	चाबियाँ मेज़ पर हैं।`;

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/u);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

function parseTsv(tsv) {
  const [headerLine, ...lines] = tsv.trim().split(/\r?\n/u);
  if (headerLine !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${headerLine}`);
  }
  if (lines.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Hindi rows, found ${lines.length}`);
  }

  const map = new Map();
  for (const [lineIndex, line] of lines.entries()) {
    const cells = line.split("\t");
    if (cells.length !== 3) {
      throw new Error(`Invalid TSV cell count at data line ${lineIndex + 2}: ${line}`);
    }
    const [sourceHeadword, display, example] = cells.map((cell) => cell.trim());
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Blank TSV value at data line ${lineIndex + 2}: ${line}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Hindi example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!DEVANAGARI_RE.test(display) || !DEVANAGARI_RE.test(example)) {
      throw new Error(`Hindi display/example must contain Devanagari text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Hindi display/example contains unexpected non-Devanagari script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Hindi translation row for ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

async function readJsonl(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function buildSupportRow(row, translation) {
  return {
    release_id: row.release_id,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_candidate_id: row.source_candidate_id,
    source_headword: row.source_headword,
    reviewed_display_headword: row.reviewed_display_headword,
    reviewed_part_of_speech: row.reviewed_part_of_speech,
    example_EN: row.example_EN,
    [LANGUAGE]: translation.display,
    [`example_${LANGUAGE}`]: translation.example,
    translation_status: "draft_native_style_needs_source_assisted_qa",
    example_translation_status: "draft_scene_preserving_needs_source_assisted_qa",
    target_language_transcription_status: "not_included_for_support_language",
    article_display_included: false,
    batch_id: BATCH_ID,
    batch_language: LANGUAGE,
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    generated_at: new Date().toISOString(),
  };
}

function updateContract(contract, outputPath, summaryPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    path: outputPath,
    summary_path: summaryPath,
    languages: [LANGUAGE],
    rows: rows.length,
    display_cells: rows.length,
    example_cells: rows.length,
    target_language_transcriptions_included: false,
    article_display_included: false,
    closes_gate_layer: [],
    does_not_close: [
      "support_translation_meaning_check",
      "support_example_scene_check",
      "weak_language_targeted_review",
      "support_translation_sample_review",
      "support_translation_source_backed_audit",
      "support_example_quality_audit",
      "support_article_display_repair_check",
      "final_delivery_approval_check",
    ],
  };

  const existing = Array.isArray(contract.latest_support_translation_batches)
    ? contract.latest_support_translation_batches.filter((item) => item.batch_id !== BATCH_ID)
    : [];
  contract.latest_support_translation_batches = [...existing, batch];
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.next_stage_options = [
    "Generate BN support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after BN.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  contract.updated_at = new Date().toISOString();
  return contract;
}

async function main() {
  const args = parseArgs();
  const contractPath = args.get("contract");
  if (!contractPath) {
    throw new Error(`Usage: node ${SCRIPT_PATH} --contract=<contract.json>`);
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== RELEASE_ID) {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(HI_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Hindi translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Hindi translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Hindi; display cells use Devanagari base/citation forms, with verbs in infinitive/citation form
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: HI Devanagari display/example cells, sentence punctuation and unexpected-script leakage guard
- Target-language transcriptions: not included
- Postgres import: false
- Google Sheet delivery: false

This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.
`;
  await writeFile(SUMMARY_PATH, summary);

  const updatedContract = updateContract(contract, JSONL_PATH, SUMMARY_PATH, outputRows);
  await writeFile(contractPath, `${JSON.stringify(updatedContract, null, 2)}\n`);

  console.log(JSON.stringify({
    release_id: releaseId,
    batch_id: BATCH_ID,
    languages: [LANGUAGE],
    rows: outputRows.length,
    display_cells: outputRows.length,
    example_cells: outputRows.length,
    path: JSONL_PATH,
    contract_updated: contractPath,
    completed_support_languages: updatedContract.latest_support_translation_batches.length,
    next_language: "BN",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
