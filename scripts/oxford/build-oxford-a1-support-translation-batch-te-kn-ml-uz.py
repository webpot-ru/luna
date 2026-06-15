#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["TE", "KN", "ML", "UZ"]
SENTENCE_END_RE = re.compile(r"[.!?।။။]$")
TELUGU_RE = re.compile(r"[\u0C00-\u0C7F]")
KANNADA_RE = re.compile(r"[\u0C80-\u0CFF]")
MALAYALAM_RE = re.compile(r"[\u0D00-\u0D7F]")


TRANSLATIONS_TSV = """source_headword	TE	example_TE	KN	example_KN	ML	example_ML	UZ	example_UZ
a, an	నిర్దిష్టం కాని ఆర్టికల్	నా దగ్గర ఒక పెన్ ఉంది.	ಅನಿರ್ದಿಷ್ಟ ಆರ್ಟಿಕಲ್	ನನ್ನ ಬಳಿ ಒಂದು ಪೆನ್ ಇದೆ.	അനിശ്ചിത ആർട്ടിക്കിൾ	എന്റെ കൈയിൽ ഒരു പേന ഉണ്ട്.	noaniq artikl	Menda bitta ruchka bor.
about	గురించి; సుమారు	మేము ఆహారం గురించి మాట్లాడుతాము.	ಬಗ್ಗೆ; ಸುಮಾರು	ನಾವು ಆಹಾರದ ಬಗ್ಗೆ ಮಾತನಾಡುತ್ತೇವೆ.	കുറിച്ച്; ഏകദേശം	ഞങ്ങൾ ഭക്ഷണത്തെ കുറിച്ച് സംസാരിക്കുന്നു.	haqida; taxminan	Biz ovqat haqida gaplashamiz.
above	పైన	గడియారం తలుపు పైన ఉంది.	ಮೇಲೆ	ಗಡಿಯಾರ ಬಾಗಿಲಿನ ಮೇಲೆ ಇದೆ.	മുകളിൽ	ഘടികാരം വാതിലിന് മുകളിലാണ്.	ustida	Soat eshik ustida.
across	అవతల; దాటుగా	దుకాణం వీధి అవతల ఉంది.	ಅಡ್ಡಲಾಗಿ; ಆ ಪಾರ್ಶ್ವದಲ್ಲಿ	ಅಂಗಡಿ ರಸ್ತೆಯ ಆ ಪಾರ್ಶ್ವದಲ್ಲಿದೆ.	അപ്പുറം; കുറുകെ	കട തെരുവിന്റെ മറുവശത്താണ്.	narigi tomonda; bo'ylab	Do'kon ko'chaning narigi tomonida.
action	చర్య	అతని చర్య నాకు సహాయపడుతుంది.	ಕ್ರಿಯೆ; ಕ್ರಮ	ಅವನ ಕ್ರಿಯೆ ನನಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ.	പ്രവൃത്തി; നടപടി	അവന്റെ പ്രവൃത്തി എന്നെ സഹായിക്കുന്നു.	harakat; amal	Uning harakati menga yordam beradi.
activity	కార్యకలాపం	ఈత ఒక సరదా కార్యకలాపం.	ಚಟುವಟಿಕೆ	ಈಜುವುದು ಮೋಜಿನ ಚಟುವಟಿಕೆ.	പ്രവർത്തനം	നീന്തൽ രസകരമായ ഒരു പ്രവർത്തനമാണ്.	mashg'ulot	Suzish qiziqarli mashg'ulot.
actor	నటుడు	నటుడు ఒక సినిమాలో ఉన్నాడు.	ನಟ	ನಟನು ಒಂದು ಚಿತ್ರದಲ್ಲಿದ್ದಾನೆ.	നടൻ	നടൻ ഒരു സിനിമയിലാണ്.	aktyor	Aktyor filmda.
actress	నటి	నటి మాకు నవ్వుతుంది.	ನಟಿ	ನಟಿ ನಮಗೆ ನಗುತ್ತಾಳೆ.	നടി	നടി ഞങ്ങളോട് പുഞ്ചിരിക്കുന്നു.	aktrisa	Aktrisa bizga jilmayadi.
add	చేర్చు	నీ పేరును ఇక్కడ చేర్చు.	ಸೇರಿಸು	ನಿನ್ನ ಹೆಸರನ್ನು ಇಲ್ಲಿ ಸೇರಿಸು.	ചേർക്കുക	നിന്റെ പേര് ഇവിടെ ചേർക്കൂ.	qo'shmoq	Ismingni shu yerga qo'sh.
address	చిరునామా	నా చిరునామా ఈ కార్డుపై ఉంది.	ವಿಳಾಸ	ನನ್ನ ವಿಳಾಸ ಈ ಕಾರ್ಡ್ ಮೇಲೆ ಇದೆ.	വിലാസം	എന്റെ വിലാസം ഈ കാർഡിലുണ്ട്.	manzil	Mening manzilim shu kartada.
adult	పెద్దవాడు	ఒక పెద్దవాడు తలుపు దగ్గర కూర్చున్నాడు.	ವಯಸ್ಕ	ಒಬ್ಬ ವಯಸ್ಕ ಬಾಗಿಲಿನ ಹತ್ತಿರ ಕುಳಿತಿದ್ದಾನೆ.	മുതിർന്നവൻ	ഒരു മുതിർന്നവൻ വാതിലിനരികിൽ ഇരിക്കുന്നു.	kattalar	Bir katta odam eshik yonida o'tiradi.
advice	సలహా	ఆమె సలహా సులభంగా ఉంది.	ಸಲಹೆ	ಅವಳ ಸಲಹೆ ಸರಳವಾಗಿದೆ.	ഉപദേശം	അവളുടെ ഉപദേശം ലളിതമാണ്.	maslahat	Uning maslahati oddiy.
afraid	భయపడిన	పిల్లవాడు భయపడ్డాడు.	ಭಯಗೊಂಡ	ಮಗು ಭಯಗೊಂಡಿದೆ.	ഭയപ്പെട്ട	കുട്ടിക്ക് ഭയമാണ്.	qo'rqqan	Bola qo'rqqan.
after	తర్వాత	నేను తరగతి తర్వాత తింటాను.	ನಂತರ	ನಾನು ತರಗತಿಯ ನಂತರ ತಿನ್ನುತ್ತೇನೆ.	ശേഷം	ഞാൻ ക്ലാസിന് ശേഷം ഭക്ഷണം കഴിക്കുന്നു.	keyin	Men darsdan keyin ovqatlanaman.
afternoon	మధ్యాహ్నం తర్వాత	నేను మధ్యాహ్నం తర్వాత చదువుతాను.	ಮಧ್ಯಾಹ್ನದ ನಂತರ	ನಾನು ಮಧ್ಯಾಹ್ನದ ನಂತರ ಓದುತ್ತೇನೆ.	ഉച്ചയ്ക്ക് ശേഷം	ഞാൻ ഉച്ചയ്ക്ക് ശേഷം പഠിക്കുന്നു.	tushdan keyin	Men tushdan keyin o'qiyman.
again	మళ్లీ	దయచేసి దాన్ని మళ్లీ చెప్పు.	ಮತ್ತೆ	ದಯವಿಟ್ಟು ಅದನ್ನು ಮತ್ತೆ ಹೇಳು.	വീണ്ടും	ദയവായി അത് വീണ്ടും പറയൂ.	yana	Iltimos, buni yana ayt.
age	వయసు	నీ వయసు ఎంత?	ವಯಸ್ಸು	ನಿನ್ನ ವಯಸ್ಸು ಎಷ್ಟು?	പ്രായം	നിന്റെ പ്രായം എത്രയാണ്?	yosh	Yoshing nechada?
ago	క్రితం	నేను రెండు రోజుల క్రితం ఇక్కడికి వచ్చాను.	ಹಿಂದೆ	ನಾನು ಎರಡು ದಿನಗಳ ಹಿಂದೆ ಇಲ್ಲಿಗೆ ಬಂದೆ.	മുമ്പ്	ഞാൻ രണ്ട് ദിവസം മുമ്പ് ഇവിടെ വന്നു.	oldin	Men bu yerga ikki kun oldin keldim.
agree	అంగీకరించు	నేను నీతో అంగీకరిస్తున్నాను.	ಒಪ್ಪಿಕೊಳ್ಳು	ನಾನು ನಿನ್ನೊಂದಿಗೆ ಒಪ್ಪುತ್ತೇನೆ.	സമ്മതിക്കുക	ഞാൻ നിന്നോട് സമ്മതിക്കുന്നു.	rozi bo'lmoq	Men sen bilan roziman.
air	గాలి	గాలి చల్లగా ఉంది.	ಗಾಳಿ	ಗಾಳಿ ಚಳಿಯಾಗಿದೆ.	വായു; കാറ്റ്	കാറ്റ് തണുപ്പാണ്.	havo	Havo sovuq.
airport	విమానాశ్రయం	మేము విమానాశ్రయంలో ఉన్నాము.	ವಿಮಾನ ನಿಲ್ದಾಣ	ನಾವು ವಿಮಾನ ನಿಲ್ದಾಣದಲ್ಲಿದ್ದೇವೆ.	വിമാനത്താവളം	ഞങ്ങൾ വിമാനത്താവളത്തിലാണ്.	aeroport	Biz aeroportdamiz.
all	అన్నీ; అందరూ	అన్ని విద్యార్థులు ఇక్కడ ఉన్నారు.	ಎಲ್ಲ; ಎಲ್ಲರೂ	ಎಲ್ಲ ವಿದ್ಯಾರ್ಥಿಗಳು ಇಲ್ಲಿ ಇದ್ದಾರೆ.	എല്ലാം; എല്ലാവരും	എല്ലാ വിദ്യാർത്ഥികളും ഇവിടെയുണ്ട്.	hamma; barcha	Barcha talabalar shu yerda.
also	కూడా	నాకు టీ కూడా ఇష్టం.	ಕೂಡ	ನನಗೂ ಚಹಾ ಇಷ್ಟ.	കൂടി	എനിക്കും ചായ ഇഷ്ടമാണ്.	ham	Men ham choyni yoqtiraman.
always	ఎప్పుడూ	ఆమె ఎప్పుడూ నీరు తాగుతుంది.	ಯಾವಾಗಲೂ	ಅವಳು ಯಾವಾಗಲೂ ನೀರು ಕುಡಿಯುತ್ತಾಳೆ.	എപ്പോഴും	അവൾ എപ്പോഴും വെള്ളം കുടിക്കുന്നു.	har doim	U har doim suv ichadi.
amazing	అద్భుతమైన	ఈ దృశ్యం అద్భుతంగా ఉంది.	ಅದ್ಭುತವಾದ	ಈ ನೋಟ ಅದ್ಭುತವಾಗಿದೆ.	അത്ഭുതകരമായ	ഈ കാഴ്ച അത്ഭുതകരമാണ്.	ajoyib	Manzara ajoyib.
and	మరియు	టామ్ మరియు అన్నా స్నేహితులు.	ಮತ್ತು	ಟಾಮ್ ಮತ್ತು ಅನ್ನಾ ಸ್ನೇಹಿತರು.	മറ്റും	ടോമും അന്നയും സുഹൃത്തുക്കളാണ്.	va	Tom va Anna do'stlar.
angry	కోపంగా	అతను ఇప్పుడు కోపంగా ఉన్నాడు.	ಕೋಪಗೊಂಡ	ಅವನು ಈಗ ಕೋಪಗೊಂಡಿದ್ದಾನೆ.	കോപമുള്ള	അവൻ ഇപ്പോൾ കോപത്തിലാണ്.	jahldor	U hozir jahldor.
animal	జంతువు	కుక్క ఒక జంతువు.	ಪ್ರಾಣಿ	ನಾಯಿ ಒಂದು ಪ್ರಾಣಿ.	മൃഗം	നായ ഒരു മൃഗമാണ്.	hayvon	It hayvon.
another	మరొకటి	నాకు మరొక కప్పు కావాలి.	ಇನ್ನೊಂದು	ನನಗೆ ಇನ್ನೊಂದು ಕಪ್ ಬೇಕು.	മറ്റൊരു	എനിക്ക് മറ്റൊരു കപ്പ് വേണം.	boshqa; yana bitta	Menga yana bitta piyola kerak.
answer	సమాధానం	సమాధానాన్ని ఇక్కడ వ్రాయి.	ಉತ್ತರ	ಉತ್ತರವನ್ನು ಇಲ್ಲಿ ಬರೆ.	ഉത്തരം	ഉത്തരം ഇവിടെ എഴുതൂ.	javob	Javobni shu yerga yoz.
any	ఏదైనా; కొంత	నీ దగ్గర ఏమైనా డబ్బు ఉందా?	ಯಾವುದಾದರೂ; ಸ್ವಲ್ಪ	ನಿನ್ನ ಬಳಿ ಹಣ ಇದೆಯೇ?	ഏതെങ്കിലും	നിന്റെ കൈയിൽ പണമുണ്ടോ?	har qanday; biror	Senda pul bormi?
anyone	ఎవరైనా	ఎవరైనా సహాయం కావాలా?	ಯಾರಾದರೂ	ಯಾರಿಗಾದರೂ ಸಹಾಯ ಬೇಕೆ?	ആരെങ്കിലും	ആർക്കെങ്കിലും സഹായം വേണമോ?	kimdir; har kim	Kimdir yordamga muhtojmi?
anything	ఏదైనా; ఏమీ	నాకు ఏమీ కనిపించడం లేదు.	ಏನಾದರೂ; ಏನೂ	ನನಗೆ ಏನೂ ಕಾಣುತ್ತಿಲ್ಲ.	എന്തെങ്കിലും; ഒന്നും	എനിക്ക് ഒന്നും കാണുന്നില്ല.	biror narsa; hech narsa	Men hech narsa ko'rmayapman.
apartment	అపార్ట్‌మెంట్	నా అపార్ట్‌మెంట్ చిన్నది.	ಅಪಾರ್ಟ್‌ಮೆಂಟ್	ನನ್ನ ಅಪಾರ್ಟ್‌ಮೆಂಟ್ ಚಿಕ್ಕದು.	അപ്പാർട്ട്മെന്റ്	എന്റെ അപ്പാർട്ട്മെന്റ് ചെറുതാണ്.	kvartira	Mening kvartiram kichik.
apple	ఆపిల్	ఈ ఆపిల్ ఎర్రగా ఉంది.	ಸೇಬು	ಈ ಸೇಬು ಕೆಂಪಾಗಿದೆ.	ആപ്പിൾ	ഈ ആപ്പിൾ ചുവപ്പാണ്.	olma	Bu olma qizil.
April	ఏప్రిల్	నా పుట్టినరోజు ఏప్రిల్‌లో ఉంది.	ಏಪ್ರಿಲ್	ನನ್ನ ಜನ್ಮದಿನ ಏಪ್ರಿಲ್‌ನಲ್ಲಿ ಇದೆ.	ഏപ്രിൽ	എന്റെ ജന്മദിനം ഏപ്രിലിലാണ്.	aprel	Mening tug'ilgan kunim aprelda.
area	ప్రాంతం	ఈ ప్రాంతం నిశ్శబ్దంగా ఉంది.	ಪ್ರದೇಶ	ಈ ಪ್ರದೇಶ ಶಾಂತವಾಗಿದೆ.	പ്രദേശം	ഈ പ്രദേശം ശാന്തമാണ്.	hudud	Bu hudud tinch.
arm	చేతి	నా చేతి నొప్పిగా ఉంది.	ಕೈ	ನನ್ನ ಕೈ ನೋಯುತ್ತಿದೆ.	കൈ	എന്റെ കൈ വേദനിക്കുന്നു.	qo'l	Qo'lim og'riyapti.
around	చుట్టూ	మేము పార్క్ చుట్టూ నడుస్తాము.	ಸುತ್ತಲು	ನಾವು ಉದ್ಯಾನದ ಸುತ್ತ ನಡೆಯುತ್ತೇವೆ.	ചുറ്റും	ഞങ്ങൾ പാർക്കിന് ചുറ്റും നടക്കുന്നു.	atrofida	Biz park atrofida yuramiz.
arrive	చేరుకోవడం	వారు ఆరు గంటలకు చేరుకుంటారు.	ತಲುಪು; ಬರು	ಅವರು ಆರು ಗಂಟೆಗೆ ಬರುತ್ತಾರೆ.	എത്തുക	അവർ ആറിന് എത്തുന്നു.	yetib kelmoq	Ular oltida yetib keladi.
art	కళ	నాకు కళ ఇష్టం.	ಕಲೆ	ನನಗೆ ಕಲೆ ಇಷ್ಟ.	കല	എനിക്ക് കല ഇഷ്ടമാണ്.	san'at	Menga san'at yoqadi.
article	వ్యాసం	నేను ఆన్‌లైన్‌లో ఒక వ్యాసం చదువుతాను.	ಲೇಖನ	ನಾನು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಒಂದು ಲೇಖನ ಓದುತ್ತೇನೆ.	ലേഖനം	ഞാൻ ഓൺലൈനിൽ ഒരു ലേഖനം വായിക്കുന്നു.	maqola	Men onlayn maqola o'qiyman.
artist	కళాకారుడు	కళాకారుడు ఒక ముఖం గీస్తాడు.	ಕಲಾವಿದ	ಕಲಾವಿದನು ಒಂದು ಮುಖ ಚಿತ್ರಿಸುತ್ತಾನೆ.	കലാകാരൻ	കലാകാരൻ ഒരു മുഖം വരയ്ക്കുന്നു.	rassom	Rassom yuz chizadi.
as	గా; లాగా	నేను ఉపాధ్యాయుడిగా పని చేస్తాను.	ಆಗಿ; ಹಾಗೆ	ನಾನು ಶಿಕ್ಷಕನಾಗಿ ಕೆಲಸ ಮಾಡುತ್ತೇನೆ.	ആയി; പോലെ	ഞാൻ അധ്യാപകനായി ജോലി ചെയ്യുന്നു.	sifatida	Men o'qituvchi sifatida ishlayman.
ask	అడుగు; కోరుకో	ఇప్పుడు ఉపాధ్యాయుడిని అడుగు.	ಕೇಳು; ಕೇಳಿಕೊಳ್ಳು	ಈಗ ಶಿಕ್ಷಕರನ್ನು ಕೇಳು.	ചോദിക്കുക; ആവശ്യപ്പെടുക	ഇപ്പോൾ അധ്യാപകനോട് ചോദിക്കൂ.	so'ramoq	Hozir o'qituvchidan so'ra.
at	లో; వద్ద	నేను ఇంట్లో ఉన్నాను.	ನಲ್ಲಿ; ಬಳಿ	ನಾನು ಮನೆಯಲ್ಲಿ ಇದ್ದೇನೆ.	-യിൽ; അടുത്ത്	ഞാൻ വീട്ടിലാണ്.	-da; yonida	Men uydaman.
August	ఆగస్టు	మేము ఆగస్టులో ప్రయాణిస్తాము.	ಆಗಸ್ಟ್	ನಾವು ಆಗಸ್ಟ್‌ನಲ್ಲಿ ಪ್ರಯಾಣಿಸುತ್ತೇವೆ.	ഓഗസ്റ്റ്	ഞങ്ങൾ ഓഗസ്റ്റിൽ യാത്ര ചെയ്യുന്നു.	avgust	Biz avgustda sayohat qilamiz.
aunt	అత్త; పిన్ని	నా అత్త ఇక్కడ ఉంటుంది.	ಅತ್ತೆ; ಚಿಕ್ಕಮ್ಮ	ನನ್ನ ಅತ್ತೆ ಇಲ್ಲಿ ವಾಸಿಸುತ್ತಾಳೆ.	അമ്മായി	എന്റെ അമ്മായി ഇവിടെ താമസിക്കുന്നു.	xola; amma	Xolam shu yerda yashaydi.
autumn	శరదృతువు	శరదృతువులో ఆకులు రాలుతాయి.	ಶರತ್ಕಾಲ	ಶರತ್ಕಾಲದಲ್ಲಿ ಎಲೆಗಳು ಬೀಳುತ್ತವೆ.	ശരത്കാലം	ശരത്കാലത്തിൽ ഇലകൾ വീഴുന്നു.	kuz	Kuzda barglar tushadi.
away	దూరంగా	బస్సు దూరంగా వెళ్తుంది.	ದೂರಕ್ಕೆ	ಬಸ್ ದೂರಕ್ಕೆ ಹೋಗುತ್ತದೆ.	അകലെ; മാറി	ബസ് അകലെ പോകുന്നു.	uzoqqa	Avtobus uzoqqa ketadi.
baby	శిశువు	శిశువు నిద్రపోతుంది.	ಮಗು	ಮಗು ಮಲಗುತ್ತಿದೆ.	കുഞ്ഞ്	കുഞ്ഞ് ഉറങ്ങുകയാണ്.	chaqaloq	Chaqaloq uxlayapti.
back	వెనుక; వెన్ను	నా వెన్ను నొప్పిగా ఉంది.	ಬೆನ್ನು; ಹಿಂದೆ	ನನ್ನ ಬೆನ್ನು ನೋಯುತ್ತಿದೆ.	പുറം; പിന്നോട്ട്	എന്റെ പുറം വേദനിക്കുന്നു.	orqa; bel	Belim og'riyapti.
bad	చెడు; పాడైన	ఈ పాలు పాడయ్యాయి.	ಕೆಟ್ಟ; ಹಾಳಾದ	ಈ ಹಾಲು ಹಾಳಾಗಿದೆ.	മോശം; കേടായ	ഈ പാൽ കേടായി.	yomon; buzilgan	Bu sut buzilgan.
bag	సంచి; బ్యాగ్	నీ బ్యాగ్ కుర్చీపై ఉంది.	ಚೀಲ; ಬ್ಯಾಗ್	ನಿನ್ನ ಚೀಲ ಕುರ್ಚಿಯ ಮೇಲೆ ಇದೆ.	ബാഗ്	നിന്റെ ബാഗ് കസേരയിലാണ്.	sumka	Sumkang stul ustida.
ball	బంతి	బంతి బల్ల కింద ఉంది.	ಚೆಂಡು	ಚೆಂಡು ಮೇಜಿನ ಕೆಳಗೆ ಇದೆ.	പന്ത്	പന്ത് മേശയുടെ കീഴിലാണ്.	to'p	To'p stol ostida.
banana	అరటిపండు	నేను అరటిపండు తింటాను.	ಬಾಳೆಹಣ್ಣು	ನಾನು ಬಾಳೆಹಣ್ಣು ತಿನ್ನುತ್ತೇನೆ.	വാഴപ്പഴം	ഞാൻ വാഴപ്പഴം കഴിക്കുന്നു.	banan	Men banan yeyman.
band	సంగీత బృందం	బృందం సంగీతం వాయిస్తుంది.	ವಾದ್ಯಗೋಷ್ಠಿ	ವಾದ್ಯಗೋಷ್ಠಿ ಸಂಗೀತ ವಾದಿಸುತ್ತದೆ.	സംഗീത സംഘം	സംഗീത സംഘം സംഗീതം വായിക്കുന്നു.	guruh; ansambl	Guruh musiqa chaladi.
bank (money)	బ్యాంకు	బ్యాంకు తొమ్మిదికి తెరుస్తుంది.	ಬ್ಯಾಂಕ್	ಬ್ಯಾಂಕ್ ಒಂಬತ್ತು ಗಂಟೆಗೆ ತೆರೆಯುತ್ತದೆ.	ബാങ്ക്	ബാങ്ക് ഒൻപതിന് തുറക്കും.	bank	Bank to'qqizda ochiladi.
bath	స్నానం	నేను రాత్రి స్నానం చేస్తాను.	ಸ್ನಾನ	ನಾನು ರಾತ್ರಿ ಸ್ನಾನ ಮಾಡುತ್ತೇನೆ.	കുളി	ഞാൻ രാത്രിയിൽ കുളിക്കുന്നു.	vanna; cho'milish	Men kechasi cho'milaman.
bathroom	బాత్రూమ్	బాత్రూమ్ శుభ్రంగా ఉంది.	ಸ್ನಾನಗೃಹ	ಸ್ನಾನಗೃಹ ಸ್ವಚ್ಛವಾಗಿದೆ.	കുളിമുറി	കുളിമുറി വൃത്തിയാണ്.	hammom	Hammom toza.
be	ఉండు; అవు	నేను సంతోషంగా ఉన్నాను.	ಇರು; ಆಗು	ನಾನು ಸಂತೋಷವಾಗಿದ್ದೇನೆ.	ആകുക; ഇരിക്കുക	ഞാൻ സന്തോഷത്തിലാണ്.	bo'lmoq	Men xursandman.
beach	సముద్ర తీరం	మేము సముద్ర తీరంలో కూర్చుంటాము.	ಕಡಲತೀರ	ನಾವು ಕಡಲತೀರದಲ್ಲಿ ಕುಳಿತುಕೊಳ್ಳುತ್ತೇವೆ.	കടൽത്തീരം	ഞങ്ങൾ കടൽത്തീരത്ത് ഇരിക്കുന്നു.	plyaj	Biz plyajda o'tiramiz.
beautiful	అందమైన	పువ్వు అందంగా ఉంది.	ಸುಂದರವಾದ	ಹೂವು ಸುಂದರವಾಗಿದೆ.	സുന്ദരമായ	പുഷ്പം സുന്ദരമാണ്.	chiroyli	Gul chiroyli.
because	ఎందుకంటే	నేను అనారోగ్యంగా ఉన్నందున ఇంట్లో ఉంటాను.	ಯಾಕೆಂದರೆ	ನಾನು ಅಸ್ವಸ್ಥನಾಗಿರುವುದರಿಂದ ಮನೆಯಲ್ಲಿ ಇರುತ್ತೇನೆ.	കാരണം	എനിക്ക് അസുഖമുള്ളതിനാൽ ഞാൻ വീട്ടിൽ ഇരിക്കുന്നു.	chunki	Men kasalman, shuning uchun uyda qolaman.
become	అవడం	ఇది చల్లగా అవవచ్చు.	ಆಗು	ಇದು ಚಳಿಯಾಗಬಹುದು.	ആകുക	ഇത് തണുത്തതാകാം.	bo'lib qolmoq	Havo sovuq bo'lib qolishi mumkin.
bed	పడక	పడక పెద్దది.	ಹಾಸಿಗೆ	ಹಾಸಿಗೆ ದೊಡ್ಡದು.	കിടക്ക	കിടക്ക വലുതാണ്.	karavot	Karavot katta.
bedroom	పడకగది	నా పడకగది నిశ్శబ్దంగా ఉంది.	ಮಲಗುವ ಕೋಣೆ	ನನ್ನ ಮಲಗುವ ಕೋಣೆ ಶಾಂತವಾಗಿದೆ.	കിടപ്പുമുറി	എന്റെ കിടപ്പുമുറി ശാന്തമാണ്.	yotoqxona	Mening yotoqxonam tinch.
beer	బీర్	అతను రాత్రి భోజనంతో బీర్ తాగుతాడు.	ಬಿಯರ್	ಅವನು ರಾತ್ರಿ ಊಟದ ಜೊತೆ ಬಿಯರ್ ಕುಡಿಯುತ್ತಾನೆ.	ബിയർ	അവൻ രാത്രി ഭക്ഷണത്തോടൊപ്പം ബിയർ കുടിക്കുന്നു.	pivo	U kechki ovqat bilan pivo ichadi.
before	ముందు	మధ్యాహ్న భోజనం ముందు చేతులు కడుక్కో.	ಮುಂಚೆ	ಮಧ್ಯಾಹ್ನದ ಊಟದ ಮುಂಚೆ ಕೈ ತೊಳೆಯು.	മുമ്പ്	ഉച്ചഭക്ഷണത്തിന് മുമ്പ് കൈ കഴുകൂ.	oldin	Tushlikdan oldin qo'lingni yuv.
begin	ప్రారంభించు	ఇప్పుడు పరీక్ష ప్రారంభించు.	ಪ್ರಾರಂಭಿಸು	ಈಗ ಪರೀಕ್ಷೆಯನ್ನು ಪ್ರಾರಂಭಿಸು.	ആരംഭിക്കുക	ഇപ്പോൾ പരീക്ഷ ആരംഭിക്കൂ.	boshlamoq	Testni hozir boshla.
beginning	ప్రారంభం	ప్రారంభం సులభంగా ఉంది.	ಆರಂಭ	ಆರಂಭ ಸುಲಭವಾಗಿದೆ.	ആരംഭം	ആരംഭം എളുപ്പമാണ്.	boshlanish	Boshlanish oson.
behind	వెనుక	పిల్లి సోఫా వెనుక ఉంది.	ಹಿಂದೆ	ಬೆಕ್ಕು ಸೋಫಾದ ಹಿಂದೆ ಇದೆ.	പിന്നിൽ	പൂച്ച സോഫയുടെ പിന്നിലാണ്.	orqasida	Mushuk divan orqasida.
believe	నమ్ము	నేను నిన్ను నమ్ముతున్నాను.	ನಂಬು	ನಾನು ನಿನ್ನನ್ನು ನಂಬುತ್ತೇನೆ.	വിശ്വസിക്കുക	ഞാൻ നിന്നെ വിശ്വസിക്കുന്നു.	ishonmoq	Men senga ishonaman.
below	కింద	పేరు చిత్రానికి కింద ఉంది.	ಕೆಳಗೆ	ಹೆಸರು ಚಿತ್ರದ ಕೆಳಗೆ ಇದೆ.	താഴെ	പേര് ചിത്രത്തിന് താഴെയാണ്.	pastda	Ism rasm pastida.
best	ఉత్తమ	ఆమె నా ఉత్తమ స్నేహితురాలు.	ಅತ್ಯುತ್ತಮ	ಅವಳು ನನ್ನ ಅತ್ಯುತ್ತಮ ಸ್ನೇಹಿತೆ.	മികച്ച	അവൾ എന്റെ മികച്ച സുഹൃത്താണ്.	eng yaxshi	U mening eng yaxshi do'stim.
better	మరింత మంచి	నేను ఈరోజు మెరుగ్గా అనిపిస్తోంది.	ಇನ್ನೂ ಉತ್ತಮ	ನನಗೆ ಇಂದು ಉತ್ತಮವಾಗಿದೆ.	കൂടുതൽ നല്ലത്	ഇന്ന് എനിക്ക് നല്ലതായി തോന്നുന്നു.	yaxshiroq	Bugun o'zimni yaxshiroq his qilyapman.
between	మధ్య	కేఫే రెండు దుకాణాల మధ్య ఉంది.	ನಡುವೆ	ಕಫೆ ಎರಡು ಅಂಗಡಿಗಳ ನಡುವೆ ಇದೆ.	ഇടയിൽ	കഫേ രണ്ട് കടകളുടെ ഇടയിലാണ്.	orasida	Kafe ikki do'kon orasida.
bicycle	సైకిల్	నా సైకిల్ నీలంగా ఉంది.	ಸೈಕಲ್	ನನ್ನ ಸೈಕಲ್ ನೀಲಿಯಾಗಿದೆ.	സൈക്കിൾ	എന്റെ സൈക്കിൾ നീലയാണ്.	velosiped	Mening velosipedim ko'k.
big	పెద్ద	ఈ పెట్టె పెద్దది.	ದೊಡ್ಡ	ಈ ಪೆಟ್ಟಿಗೆ ದೊಡ್ಡದು.	വലിയ	ഈ പെട്ടി വലുതാണ്.	katta	Bu quti katta.
bike	బైక్; సైకిల్	నేను నా బైక్ నడుపుతాను.	ಬೈಕ್; ಸೈಕಲ್	ನಾನು ನನ್ನ ಬೈಕ್ ಓಡಿಸುತ್ತೇನೆ.	ബൈക്ക്; സൈക്കിൾ	ഞാൻ എന്റെ ബൈക്ക് ഓടിക്കുന്നു.	velosiped	Men velosipedimni minaman.
bill	బిల్లు	బిల్లు బల్లపై ఉంది.	ಬಿಲ್	ಬಿಲ್ ಮೇಜಿನ ಮೇಲೆ ಇದೆ.	ബിൽ	ബിൽ മേശപ്പുറത്തുണ്ട്.	hisob	Hisob stol ustida.
bird	పక్షి	చెట్టులో ఒక పక్షి ఉంది.	ಹಕ್ಕಿ	ಮರದಲ್ಲಿ ಒಂದು ಹಕ್ಕಿ ಇದೆ.	പക്ഷി	മരത്തിൽ ഒരു പക്ഷിയുണ്ട്.	qush	Daraxtda qush bor.
birthday	పుట్టినరోజు	ఈరోజు నా పుట్టినరోజు.	ಜನ್ಮದಿನ	ಇಂದು ನನ್ನ ಜನ್ಮದಿನ.	ജന്മദിനം	ഇന്ന് എന്റെ ജന്മദിനമാണ്.	tug'ilgan kun	Bugun mening tug'ilgan kunim.
black	నలుపు	నా బ్యాగ్ నల్లగా ఉంది.	ಕಪ್ಪು	ನನ್ನ ಚೀಲ ಕಪ್ಪಾಗಿದೆ.	കറുപ്പ്	എന്റെ ബാഗ് കറുപ്പാണ്.	qora	Sumkam qora.
blog	బ్లాగ్	ఆమె బ్లాగ్ రాస్తుంది.	ಬ್ಲಾಗ್	ಅವಳು ಬ್ಲಾಗ್ ಬರೆಯುತ್ತಾಳೆ.	ബ്ലോഗ്	അവൾ ഒരു ബ്ലോഗ് എഴുതുന്നു.	blog	U blog yozadi.
blonde	బంగారు రంగు జుట్టు	అతనికి బంగారు రంగు జుట్టు ఉంది.	ಹೊಂಬಣ್ಣದ ಕೂದಲು	ಅವನಿಗೆ ಹೊಂಬಣ್ಣದ ಕೂದಲು ಇದೆ.	സ്വർണനിറമുള്ള മുടಿ	അവന് സ്വർണനിറമുള്ള മുടിയുണ്ട്.	sariq sochli	Uning sochi sariq.
blue	నీలం	ఆకాశం నీలంగా ఉంది.	ನೀಲಿ	ಆಕಾಶ ನೀಲಿಯಾಗಿದೆ.	നീല	ആകാശം നീലയാണ്.	ko'k	Osmon ko'k.
boat	పడవ	పడవ నీటిపై ఉంది.	ದೋಣಿ	ದೋಣಿ ನೀರಿನ ಮೇಲೆ ಇದೆ.	വഞ്ചി	വഞ്ചി വെള്ളത്തിന്മേലാണ്.	qayiq	Qayiq suv ustida.
body	శరీరం	నా శరీరం అలసిపోయింది.	ದೇಹ	ನನ್ನ ದೇಹ ದಣಿದಿದೆ.	ശരീരം	എന്റെ ശരീരം ക്ഷീണിച്ചിരിക്കുന്നു.	tana	Tanam charchagan.
book	పుస్తకం	నేను పుస్తకం చదువుతాను.	ಪುಸ್ತಕ	ನಾನು ಪುಸ್ತಕ ಓದುತ್ತೇನೆ.	പുസ്തകം	ഞാൻ ഒരു പുസ്തകം വായിക്കുന്നു.	kitob	Men kitob o'qiyman.
boot	బూటు	ఒక బూటు పడక కింద ఉంది.	ಬೂಟ್	ಒಂದು ಬೂಟ್ ಹಾಸಿಗೆಯ ಕೆಳಗೆ ಇದೆ.	ബൂട്ട്	ഒരു ബൂട്ട് കിടക്കയുടെ കീഴിലാണ്.	etik	Bitta etik karavot ostida.
bored	బోర్‌గా	నాకు బోర్‌గా ఉంది.	ಬೇಸರಗೊಂಡ	ನನಗೆ ಬೇಸರವಾಗಿದೆ.	ബോറടിച്ച	എനിക്ക് ബോറടിക്കുന്നു.	zerikkan	Men zerikdim.
boring	బోర్ కలిగించే	ఈ సినిమా బోర్‌గా ఉంది.	ಬೇಸರದ	ಈ ಚಿತ್ರ ಬೇಸರದಾಗಿದೆ.	ബോറുള്ള	ഈ സിനിമ ബോറാണ്.	zerikarli	Bu film zerikarli.
born	పుట్టిన	నేను మేలో పుట్టాను.	ಹುಟ್ಟಿದ	ನಾನು ಮೇ ತಿಂಗಳಲ್ಲಿ ಹುಟ್ಟಿದೆ.	ജനിച്ച	ഞാൻ മേയിൽ ജനിച്ചു.	tug'ilgan	Men may oyida tug'ilganman.
both	రెండూ	ఆ ఇద్దరు అమ్మాయిలు సంతోషంగా ఉన్నారు.	ಎರಡೂ	ಎರಡೂ ಹುಡುಗಿಯರು ಸಂತೋಷವಾಗಿದ್ದಾರೆ.	രണ്ടും	രണ്ട് പെൺകുട്ടികളും സന്തോഷത്തിലാണ്.	ikkalasi	Ikkala qiz ham xursand.
bottle	సీసా	సీసా నిండిపోయింది.	ಬಾಟಲಿ	ಬಾಟಲಿ ತುಂಬಿದೆ.	കുപ്പി	കുപ്പി നിറഞ്ഞിരിക്കുന്നു.	shisha	Shisha to'la.
box	పెట్టె	పెట్టె తెరిచి ఉంది.	ಪೆಟ್ಟಿಗೆ	ಪೆಟ್ಟಿಗೆ ತೆರೆದಿದೆ.	പെട്ടി	പെട്ടി തുറന്നിരിക്കുന്നു.	quti	Quti ochiq.
boy	అబ్బాయి	అబ్బాయి వేగంగా పరుగెడతాడు.	ಹುಡುಗ	ಹುಡುಗ ವೇಗವಾಗಿ ಓಡುತ್ತಾನೆ.	ആൺകുട്ടി	ആൺകുട്ടി വേഗത്തിൽ ഓടുന്നു.	o'g'il bola	Bola tez yuguradi.
boyfriend	ప్రియుడు	ఆమె ప్రియుడు దయగలవాడు.	ಪ್ರಿಯಕರ	ಅವಳ ಪ್ರಿಯಕರ ದಯಾಳು.	കാമുകൻ	അവളുടെ കാമുകൻ ദയയുള്ളവനാണ്.	yigit do'st	Uning yigit do'sti mehribon.
bread	రొట్టె	నాకు రొట్టె కావాలి.	ರೊಟ್ಟಿ	ನನಗೆ ರೊಟ್ಟಿ ಬೇಕು.	അപ്പം	എനിക്ക് അപ്പം വേണം.	non	Menga non kerak.
break	విరగగొట్టు	కప్పును విరగగొట్టకు.	ಒಡೆ; ಮುರಿಯು	ಕಪ್ ಒಡೆಯಬೇಡ.	തകർക്കുക	കപ്പ് തകർക്കരുത്.	sindirmoq	Piyolani sindirma.
breakfast	అల్పాహారం	అల్పాహారం సిద్ధంగా ఉంది.	ಉಪಹಾರ	ಉಪಹಾರ ಸಿದ್ಧವಾಗಿದೆ.	പ്രഭാതഭക്ഷണം	പ്രഭാതഭക്ഷണം തയ്യാറാണ്.	nonushta	Nonushta tayyor.
bring	తీసుకురా	నీ పుస్తకాన్ని తీసుకురా.	ತರು	ನಿನ್ನ ಪುಸ್ತಕ ತರು.	കൊണ്ടുവരുക	നിന്റെ പുസ്തകം കൊണ്ടുവരൂ.	olib kelmoq	Kitobingni olib kel.
brother	అన్న; తమ్ముడు	నా అన్న పొడవుగా ఉన్నాడు.	ಅಣ್ಣ; ತಮ್ಮ	ನನ್ನ ಅಣ್ಣ ಎತ್ತರವಾಗಿದ್ದಾನೆ.	സഹോദരൻ	എന്റെ സഹോദരൻ ഉയരമുള്ളവനാണ്.	aka; uka	Akam baland bo'yli.
brown	గోధుమ రంగు	కుక్క గోధుమ రంగులో ఉంది.	ಕಂದು	ನಾಯಿ ಕಂದು ಬಣ್ಣದಲ್ಲಿದೆ.	തവിട്ട് നിറം	നായ തവിട്ട് നിറമാണ്.	jigarrang	It jigarrang.
build	నిర్మించు	వారు ఇల్లు నిర్మిస్తారు.	ಕಟ್ಟು; ನಿರ್ಮಿಸು	ಅವರು ಮನೆ ಕಟ್ಟುತ್ತಾರೆ.	നിർമ്മിക്കുക	അവർ ഒരു വീട് നിർമ്മിക്കുന്നു.	qurmoq	Ular uy quradi.
building	భవనం	ఈ భవనం పాతది.	ಕಟ್ಟಡ	ಈ ಕಟ್ಟಡ ಹಳೆಯದು.	കെട്ടിടം	ഈ കെട്ടിടം പഴയതാണ്.	bino	Bu bino eski.
bus	బస్సు	బస్సు ఆలస్యంగా ఉంది.	ಬಸ್	ಬಸ್ ತಡವಾಗಿದೆ.	ബസ്	ബസ് വൈകുന്നു.	avtobus	Avtobus kechikdi.
business	వ్యాపారం	నా తండ్రికి వ్యాపారం ఉంది.	ವ್ಯವಹಾರ	ನನ್ನ ತಂದೆಗೆ ವ್ಯವಹಾರ ಇದೆ.	വ്യാപാരം	എന്റെ അച്ഛന് ഒരു വ്യാപാരം ഉണ്ട്.	biznes	Otamning biznesi bor.
busy	బిజీగా	నేను ఈరోజు బిజీగా ఉన్నాను.	ಕಾರ್ಯನಿರತ	ನಾನು ಇಂದು ಕಾರ್ಯನಿರತನಾಗಿದ್ದೇನೆ.	തിരക്കുള്ള	ഞാൻ ഇന്ന് തിരക്കിലാണ്.	band	Men bugun bandman.
but	కానీ	నాకు టీ ఇష్టం, కానీ కాఫీ కాదు.	ಆದರೆ	ನನಗೆ ಚಹಾ ಇಷ್ಟ, ಆದರೆ ಕಾಫಿ ಇಲ್ಲ.	പക്ഷേ	എനിക്ക് ചായ ഇഷ്ടമാണ്, പക്ഷേ കാപ്പി ഇഷ്ടമല്ല.	lekin	Men choyni yoqtiraman, lekin qahvani emas.
butter	వెన్న	రొట్టెపై వెన్న పెట్టు.	ಬೆಣ್ಣೆ	ರೊಟ್ಟಿಯ ಮೇಲೆ ಬೆಣ್ಣೆ ಹಚ್ಚು.	വെണ്ണ	അപ്പത്തിൽ വെണ്ണ പുരട്ടൂ.	sariyog'	Nonga sariyog' sur.
buy	కొను	నేను పాలు కొనుగోలు చేస్తాను.	ಕೊಂಡುಕೊಳ್ಳು	ನಾನು ಹಾಲು ಕೊಂಡುಕೊಳ್ಳುತ್ತೇನೆ.	വാങ്ങുക	ഞാൻ പാൽ വാങ്ങുന്നു.	sotib olmoq	Men sut sotib olaman.
by	దగ్గర; ద్వారా	కిటికీ దగ్గర కూర్చో.	ಬಳಿ; ಮೂಲಕ	ಕಿಟಕಿಯ ಬಳಿ ಕುಳಿತುಕೋ.	അരികിൽ; വഴി	ജാലകത്തിനരികിൽ ഇരിക്കൂ.	yonida; orqali	Deraza yonida o'tir.
bye	వీడ్కోలు	వీడ్కోలు, రేపు కలుద్దాం.	ವಿದಾಯ	ವಿದಾಯ, ನಾಳೆ ಭೇಟಿಯಾಗೋಣ.	വിട	വിട, നാളെ കാണാം.	xayr	Xayr, ertaga ko'rishamiz.
cafe	కేఫే	మేము కేఫేలో కలుస్తాము.	ಕಫೆ	ನಾವು ಕಫೆಯಲ್ಲಿ ಭೇಟಿ ಆಗುತ್ತೇವೆ.	കഫേ	ഞങ്ങൾ കഫേയിൽ കാണുന്നു.	kafe	Biz kafeda uchrashamiz.
cake	కేక్	కేక్ తీపిగా ఉంది.	ಕೇಕ್	ಕೇಕ್ ಸಿಹಿಯಾಗಿದೆ.	കേക്ക്	കേക്ക് മധുരമാണ്.	tort	Tort shirin.
call	ఫోన్ చేయు; పిలువు	దయచేసి నాకు ఫోన్ చేయి.	ಕರೆಮಾಡು; ಕರೆಯು	ದಯವಿಟ್ಟು ನನಗೆ ಕರೆಮಾಡು.	വിളിക്കുക	ദയവായി എന്നെ വിളിക്കൂ.	qo'ng'iroq qilmoq	Iltimos, menga qo'ng'iroq qil.
camera	కెమెరా	నా కెమెరా కొత్తది.	ಕ್ಯಾಮೆರಾ	ನನ್ನ ಕ್ಯಾಮೆರಾ ಹೊಸದು.	ക്യാമറ	എന്റെ ക്യാമറ പുതുതാണ്.	kamera	Mening kameram yangi.
can1 modal	చేయగలగు	నేను ఈత కొట్టగలను.	ಸಾಧ್ಯ; ಮಾಡಬಲ್ಲೆ	ನಾನು ಈಜಬಲ್ಲೆ.	കഴിയും	എനിക്ക് നീന്താൻ കഴിയും.	qila olmoq	Men suza olaman.
cannot	చేయలేను	నేను ఈరోజు రావలేను.	ಸಾಧ್ಯವಿಲ್ಲ	ನಾನು ಇಂದು ಬರಲು ಸಾಧ್ಯವಿಲ್ಲ.	കഴിയില്ല	എനിക്ക് ഇന്ന് വരാൻ കഴിയില്ല.	qila olmaslik	Men bugun kela olmayman.
capital	రాజధాని	పారిస్ ఒక రాజధాని నగరం.	ರಾಜಧಾನಿ	ಪ್ಯಾರಿಸ್ ಒಂದು ರಾಜಧಾನಿ ನಗರ.	തലസ്ഥാനം	പാരിസ് ഒരു തലസ്ഥാന നഗരമാണ്.	poytaxt	Parij poytaxt shahar.
car	కారు	కారు ఎర్రగా ఉంది.	ಕಾರು	ಕಾರು ಕೆಂಪಾಗಿದೆ.	കാർ	കാർ ചുവപ്പാണ്.	mashina	Mashina qizil.
card	కార్డు	నా దగ్గర పుట్టినరోజు కార్డు ఉంది.	ಕಾರ್ಡ್	ನನ್ನ ಬಳಿ ಜನ್ಮದಿನದ ಕಾರ್ಡ್ ಇದೆ.	കാർഡ്	എന്റെ കൈയിൽ ജന്മദിന കാർഡ് ഉണ്ട്.	karta	Menda tug'ilgan kun kartasi bor.
career	వృత్తి జీవితం	నాకు కళలో వృత్తి కావాలి.	ವೃತ್ತಿಜೀವನ	ನನಗೆ ಕಲೆಯಲ್ಲಿ ವೃತ್ತಿಜೀವನ ಬೇಕು.	തൊഴിൽജീവിതം	എനിക്ക് കലയിൽ ഒരു തൊഴിൽ വേണം.	karyera	Men san'atda karyera xohlayman.
carrot	క్యారెట్	క్యారెట్ నారింజ రంగులో ఉంది.	ಕ್ಯಾರಟ್	ಕ್ಯಾರಟ್ ಕಿತ್ತಳೆ ಬಣ್ಣದಲ್ಲಿದೆ.	കാരറ്റ്	കാരറ്റ് ഓറഞ്ച് നിറമാണ്.	sabzi	Sabzi to'q sariq.
carry	మోసుకెళ్ళు	నేను నా బ్యాగ్ మోస్తాను.	ಹೊತ್ತುಕೊಂಡು ಹೋಗು	ನಾನು ನನ್ನ ಚೀಲ ಹೊತ್ತುಕೊಳ್ಳುತ್ತೇನೆ.	ചുമക്കുക	ഞാൻ എന്റെ ബാഗ് ചുമക്കുന്നു.	ko'tarmoq	Men sumkamni ko'taraman.
cat	పిల్లి	పిల్లి నిద్రపోతుంది.	ಬೆಕ್ಕು	ಬೆಕ್ಕು ಮಲಗುತ್ತದೆ.	പൂച്ച	പൂച്ച ഉറങ്ങുന്നു.	mushuk	Mushuk uxlaydi.
CD	సీడీ; డిస్క్	ఈ సీడీలో సంగీతం ఉంది.	ಸಿಡಿ; ಡಿಸ್ಕ್	ಈ ಸಿಡಿಯಲ್ಲಿ ಸಂಗೀತ ಇದೆ.	സിഡി; ഡിസ്ക്	ഈ സിഡിയിൽ സംഗീതമുണ്ട്.	CD; disk	Bu diskda musiqa bor.
cent	సెంట్	ఒక సెంట్ చాలా చిన్నది.	ಸೆಂಟ್	ಒಂದು ಸೆಂಟ್ ತುಂಬಾ ಚಿಕ್ಕದು.	സെന്റ്	ഒരു സെന്റ് വളരെ ചെറുതാണ്.	sent	Bir sent juda kichik.
centre	కేంద్రం	పట్టణ కేంద్రం బిజీగా ఉంది.	ಕೇಂದ್ರ	ಪಟ್ಟಣದ ಕೇಂದ್ರ ಕಾರ್ಯನಿರತವಾಗಿದೆ.	കേന്ദ്രം	നഗരകേന്ദ്രം തിരക്കിലാണ്.	markaz	Shahar markazi band.
century	శతాబ్దం	ఒక శతాబ్దం వంద సంవత్సరాలు.	ಶತಮಾನ	ಒಂದು ಶತಮಾನ ನೂರು ವರ್ಷಗಳು.	നൂറ്റാണ്ട്	ഒരു നൂറ്റാണ്ട് നൂറ് വർഷമാണ്.	asr	Bir asr yuz yil.
chair	కుర్చీ	కుర్చీపై కూర్చో.	ಕುರ್ಚಿ	ಕುರ್ಚಿಯ ಮೇಲೆ ಕುಳಿತುಕೋ.	കസേര	കസേരയിൽ ഇരിക്കൂ.	stul	Stulga o'tir.
change	మార్చు	నేను బట్టలు మార్చుకుంటాను.	ಬದಲಿಸು	ನಾನು ಬಟ್ಟೆ ಬದಲಿಸುತ್ತೇನೆ.	മാറ്റുക	ഞാൻ വസ്ത്രം മാറ്റുന്നു.	o'zgartirmoq; almashtirmoq	Men kiyimimni almashtiraman.
chart	చార్ట్; పట్టిక	చార్ట్ చూడండి.	ಚಾರ್ಟ್; ಪಟ್ಟಿಕೆ	ಚಾರ್ಟ್ ನೋಡಿ.	ചാർട്ട്; പട്ടിക	ചാർട്ട് നോക്കൂ.	jadval; diagramma	Jadvalga qara.
cheap	చౌకైన	ఈ చొక్కా చౌకగా ఉంది.	ಅಗ್ಗದ	ಈ ಅಂಗಿ ಅಗ್ಗವಾಗಿದೆ.	വിലകുറഞ്ഞ	ഈ ഷർട്ട് വിലകുറഞ്ഞതാണ്.	arzon	Bu ko'ylak arzon.
check	పరిశీలించు	నీ సమాధానాన్ని పరిశీలించు.	ಪರಿಶೀಲಿಸು	ನಿನ್ನ ಉತ್ತರ ಪರಿಶೀಲಿಸು.	പരിശോധിക്കുക	നിന്റെ ഉത്തരം പരിശോധിക്കൂ.	tekshirmoq	Javobingni tekshir.
cheese	చీజ్	నాకు చీజ్ ఇష్టం.	ಚೀಸ್	ನನಗೆ ಚೀಸ್ ಇಷ್ಟ.	ചീസ്	എനിക്ക് ചീസ് ഇഷ്ടമാണ്.	pishloq	Menga pishloq yoqadi.
chicken	కోడి; కోడి మాంసం	మేము రాత్రి భోజనానికి కోడి తింటాము.	ಕೋಳಿ; ಕೋಳಿ ಮಾಂಸ	ನಾವು ರಾತ್ರಿ ಊಟಕ್ಕೆ ಕೋಳಿ ತಿನ್ನುತ್ತೇವೆ.	കോഴി; കോഴിമാംസം	ഞങ്ങൾ രാത്രി ഭക്ഷണത്തിന് കോഴി കഴിക്കുന്നു.	tovuq; tovuq go'shti	Biz kechki ovqatga tovuq yeymiz.
child	పిల్లవాడు	పిల్లవాడు సంతోషంగా ఉన్నాడు.	ಮಗು	ಮಗು ಸಂತೋಷವಾಗಿದೆ.	കുട്ടി	കുട്ടി സന്തോഷത്തിലാണ്.	bola	Bola xursand.
chocolate	చాక్లెట్	చాక్లెట్ తీపిగా ఉంటుంది.	ಚಾಕೊಲೇಟ್	ಚಾಕೊಲೇಟ್ ಸಿಹಿಯಾಗಿದೆ.	ചോക്ലേറ്റ്	ചോക്ലേറ്റ് മധുരമാണ്.	shokolad	Shokolad shirin.
choose	ఎంచుకో	ఒక సమాధానం ఎంచుకో.	ಆಯ್ಕೆಮಾಡು	ಒಂದು ಉತ್ತರ ಆಯ್ಕೆಮಾಡು.	തിരഞ്ഞെടുക്കുക	ഒരു ഉത്തരം തിരഞ്ഞെടുക്കൂ.	tanlamoq	Bitta javobni tanla.
cinema	సినిమా థియేటర్	మేము సినిమా థియేటర్‌కు వెళ్తాము.	ಚಿತ್ರಮಂದಿರ	ನಾವು ಚಿತ್ರಮಂದಿರಕ್ಕೆ ಹೋಗುತ್ತೇವೆ.	സിനിമാ തിയേറ്റർ	ഞങ്ങൾ സിനിമാ തിയേറ്ററിലേക്ക് പോകുന്നു.	kino	Biz kinoga boramiz.
city	నగరం	నగరం పెద్దది.	ನಗರ	ನಗರ ದೊಡ್ಡದು.	നഗരം	നഗരം വലുതാണ്.	shahar	Shahar katta.
class	తరగతి	తరగతి తొమ్మిదికి ప్రారంభమవుతుంది.	ತರಗತಿ	ತರಗತಿ ಒಂಬತ್ತು ಗಂಟೆಗೆ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ.	ക്ലാസ്	ക്ലാസ് ഒൻപതിന് തുടങ്ങുന്നു.	dars	Dars to'qqizda boshlanadi.
classroom	తరగతి గది	తరగతి గది నిశ్శబ్దంగా ఉంది.	ತರಗತಿ ಕೊಠಡಿ	ತರಗತಿ ಕೊಠಡಿ ಶಾಂತವಾಗಿದೆ.	ക്ലാസ് മുറി	ക്ലാസ് മുറി ശാന്തമാണ്.	sinf xonasi	Sinf xonasi tinch.
clean	శుభ్రం; శుభ్రపరచు	గది శుభ్రంగా ఉంది.	ಸ್ವಚ್ಛ; ಸ್ವಚ್ಛಗೊಳಿಸು	ಕೊಠಡಿ ಸ್ವಚ್ಛವಾಗಿದೆ.	വൃത്തിയുള്ള; വൃത്തിയാക്കുക	മുറി വൃത്തിയാണ്.	toza; tozalamoq	Xona toza.
climb	ఎక్కు	వారు కొండ ఎక్కుతారు.	ಏರು	ಅವರು ಬೆಟ್ಟ ಏರುತ್ತಾರೆ.	കയറുക	അവർ കുന്ന് കയറുന്നു.	chiqmoq	Ular tepalikka chiqadi.
clock	గడియారం	గడియారం గోడపై ఉంది.	ಗಡಿಯಾರ	ಗಡಿಯಾರ ಗೋಡೆಯ ಮೇಲೆ ಇದೆ.	ഘടികാരം	ഘടികാരം മതിലിലുണ്ട്.	soat	Soat devorda.
close1	మూయు	దయచేసి తలుపు మూయి.	ಮುಚ್ಚು	ದಯವಿಟ್ಟು ಬಾಗಿಲು ಮುಚ್ಚು.	അടയ്ക്കുക	ദയവായി വാതിൽ അടയ്ക്കൂ.	yopmoq	Iltimos, eshikni yop.
"""


def normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def parse_translations():
    rows = [line.split("\t") for line in TRANSLATIONS_TSV.strip().splitlines()]
    header = rows[0]
    expected = ["source_headword"]
    for language in LANGUAGES:
        expected.extend([language, f"example_{language}"])
    if header != expected:
        raise ValueError(f"Unexpected translation header: {header}")
    translations = {}
    for row_number, row in enumerate(rows[1:], start=2):
        if len(row) != len(header):
            raise ValueError(f"Malformed translation row {row_number}: expected {len(header)} cells, got {len(row)}")
        source_headword = normalize_text(row[0])
        if source_headword in translations:
            raise ValueError(f"Duplicate translation row for {source_headword}")
        localized = {}
        for index, language in enumerate(LANGUAGES):
            display = normalize_text(row[1 + index * 2])
            example = normalize_text(row[2 + index * 2])
            localized[language] = [display, example]
        translations[source_headword] = localized
    return translations


TRANSLATIONS = parse_translations()


def read_jsonl(path):
    rows = []
    for index, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSONL at {path}:{index}: {error}") from error
    return rows


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def validate_translation_map(source_rows):
    source_keys = {row["source_headword"] for row in source_rows}
    missing = sorted(source_keys - set(TRANSLATIONS))
    extra = sorted(set(TRANSLATIONS) - source_keys)
    if missing:
        raise ValueError(f"Missing translations for rows: {missing}")
    if extra:
        raise ValueError(f"Translation map has unused rows: {extra}")
    problems = []
    for source_headword, localized in TRANSLATIONS.items():
        for language in LANGUAGES:
            display, example = localized.get(language, ["", ""])
            if not normalize_text(display):
                problems.append(f"{source_headword}/{language}: missing display")
            if not normalize_text(example):
                problems.append(f"{source_headword}/{language}: missing example")
            if not SENTENCE_END_RE.search(example):
                problems.append(f"{source_headword}/{language}: example missing sentence punctuation")
            if language == "TE" and (not TELUGU_RE.search(display) or not TELUGU_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Telugu script")
            if language == "KN" and (not KANNADA_RE.search(display) or not KANNADA_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Kannada script")
            if language == "ML" and (not MALAYALAM_RE.search(display) or not MALAYALAM_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Malayalam script")
    if problems:
        raise ValueError("Translation quality problems:\n" + "\n".join(problems))


def build_row(row, generated_at, batch_id):
    localized = TRANSLATIONS[row["source_headword"]]
    blockers = [
        blocker
        for blocker in row.get("remaining_blockers", [])
        if blocker not in {"support_translation_meaning_check", "support_example_scene_check"}
    ]
    out = {
        "release_id": row["release_id"],
        "course_id": row["course_id"],
        "row_id": row["row_id"],
        "core_item_id": row["core_item_id"],
        "meaning_id": row["meaning_id"],
        "source_candidate_id": row["source_candidate_id"],
        "source_headword": row["source_headword"],
        "reviewed_display_headword": row["reviewed_display_headword"],
        "reviewed_part_of_speech": row["reviewed_part_of_speech"],
        "meaning_note": row["meaning_note"],
        "example_EN": row["example_EN"],
        "support_translation_batch": batch_id,
        "support_translation_status": "draft_native_style_needs_source_assisted_qa",
        "support_example_status": "draft_scene_preserving_needs_source_assisted_qa",
        "source_note": "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
        "reviewer": f"codex_oxford_a1_support_translation_batch_{batch_id}",
        "reviewed_at": generated_at,
        "generation_ready": False,
        "remaining_blockers": blockers,
    }
    for language in LANGUAGES:
        display, example = localized[language]
        out[language] = normalize_text(display)
        out[f"example_{language}"] = normalize_text(example)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pronunciations",
        default="outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_001_150_v1_en_us_pronunciations_v1.jsonl",
    )
    parser.add_argument("--out-dir", default="outputs/oxford-vocabulary/support-translations")
    parser.add_argument("--batch-id", default="te_kn_ml_uz_v1")
    args = parser.parse_args()

    source_path = Path(args.pronunciations)
    source_rows = read_jsonl(source_path)
    if not source_rows:
        raise ValueError("Source pronunciation artifact is empty")
    validate_translation_map(source_rows)

    generated_at = datetime.now(timezone.utc).isoformat()
    rows = [build_row(row, generated_at, args.batch_id) for row in source_rows]
    release_id = source_rows[0]["release_id"]
    output_dir = Path(args.out_dir)
    batch_path = output_dir / f"{release_id}_support_translation_batch_{args.batch_id}.jsonl"
    summary_path = output_dir / f"{release_id}_support_translation_batch_{args.batch_id}_summary.md"
    write_jsonl(batch_path, rows)

    summary = [
        f"# Oxford A1 Support Translation Batch {args.batch_id}: {release_id}",
        "",
        f"- Script version: `{SCRIPT_VERSION}`",
        f"- Source rows: `{source_path}`",
        f"- Rows: {len(rows)}",
        f"- Languages: {', '.join(LANGUAGES)}",
        "- Translation status: `draft_native_style_needs_source_assisted_qa`",
        "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
        "- Validation: exact source-row coverage, non-empty display/example cells, sentence punctuation, TE Telugu script, KN Kannada script, ML Malayalam script",
        "- Target-language transcriptions: not included",
        "- Postgres import: false",
        "- Google Sheet delivery: false",
        "",
        "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
        "",
    ]
    summary_path.write_text("\n".join(summary), encoding="utf-8")
    print(f"Oxford support translation batch built: rows={len(rows)} languages={','.join(LANGUAGES)} path={batch_path}")


if __name__ == "__main__":
    main()
