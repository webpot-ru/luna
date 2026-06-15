#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_km_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_km_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-km.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "KM";
const BATCH_ID = "km_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?។]$/u;
const KHMER_RE = /\p{Script=Khmer}/u;
const LATIN_RE = /[A-Za-z]/u;
const KHMER_TOKEN_SPACE_RE = /\p{Script=Khmer}\s+\p{Script=Khmer}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const KM_TRANSLATIONS_TSV = `source_headword	KM	example_KM
machine	ម៉ាស៊ីន;ឧបករណ៍	ម៉ាស៊ីននេះឆុងកាហ្វេ។
magazine	ទស្សនាវដ្តី	នាងអានទស្សនាវដ្តីតន្ត្រី។
main	សំខាន់;ចម្បង	នេះជាទ្វារសំខាន់។
make	ធ្វើ;បង្កើត	ខ្ញុំធ្វើអាហារថ្ងៃត្រង់នៅផ្ទះ។
man	បុរស;មនុស្សប្រុស	បុរសនោះជាគ្រូរបស់ខ្ញុំ។
many	ច្រើន	សិស្សច្រើននៅទីនេះ។
map	ផែនទី	មើលផែនទី។
March	ខែមីនា	ថ្ងៃកំណើតខ្ញុំនៅខែមីនា។
market	ផ្សារ;ទីផ្សារ	យើងទិញផ្លែឈើនៅផ្សារ។
married	រៀបការហើយ;មានគ្រួសារ	បងស្រីខ្ញុំរៀបការហើយ។
May	ខែឧសភា	សាលារៀនបញ្ចប់នៅខែឧសភា។
maybe	ប្រហែល;អាចជា	ប្រហែលភ្លៀងនឹងធ្លាក់។
me	ខ្ញុំ;ខ្ញុំទៅ	សូមជួយខ្ញុំ។
meal	អាហារ;ពេលអាហារ	អាហារនេះក្តៅ។
mean	មានន័យថា;មានន័យ	សញ្ញានេះមានន័យថាអ្វី?
meaning	អត្ថន័យ	អត្ថន័យគឺអ្វី?
meat	សាច់	ខ្ញុំញ៉ាំសាច់ពេលល្ងាច។
meet	ជួប;ជួបគ្នា	យើងជួបគ្នាបន្ទាប់ពីថ្នាក់។
meeting	កិច្ចប្រជុំ	កិច្ចប្រជុំចាប់ផ្តើមឥឡូវនេះ។
member	សមាជិក	នាងជាសមាជិកក្លឹប។
menu	ម៉ឺនុយ;បញ្ជីម្ហូប	សូមអានម៉ឺនុយ។
message	សារ	ខ្ញុំផ្ញើសារខ្លីមួយ។
metre	ម៉ែត្រ	ដើរទៅមុខមួយម៉ែត្រ។
midnight	អធ្រាត្រ	រថភ្លើងចេញនៅអធ្រាត្រ។
mile	ម៉ាយល៍	យើងដើរមួយម៉ាយល៍។
milk	ទឹកដោះគោ	ខ្ញុំផឹកទឹកដោះគោជាមួយអាហារពេលព្រឹក។
million	លាន	មនុស្សមួយលាននាក់រស់នៅទីនេះ។
minute1	នាទី	សូមរង់ចាំមួយនាទី។
miss	នឹក;ខក	ខ្ញុំនឹកសាលាចាស់របស់ខ្ញុំ។
mistake	កំហុស	ចម្លើយនេះមានកំហុស។
model	គំរូ;ម៉ូដែល	នេះជាគំរូតូចមួយ។
modern	ទំនើប	ផ្ទះបាយទំនើប។
moment	មួយភ្លែត;ពេលខ្លី	សូមរង់ចាំមួយភ្លែត។
Monday	ថ្ងៃចន្ទ	យើងចាប់ផ្តើមការងារនៅថ្ងៃចន្ទ។
money	លុយ;ប្រាក់	ខ្ញុំត្រូវការលុយខ្លះ។
month	ខែ	ខែមិថុនាជាខែក្តៅ។
more	ច្រើនទៀត;បន្ថែម	ខ្ញុំត្រូវការពេលបន្ថែម។
morning	ពេលព្រឹក	ខ្ញុំរៀននៅពេលព្រឹក។
most	ភាគច្រើន;ច្រើនបំផុត	សិស្សភាគច្រើនចូលចិត្តតន្ត្រី។
mother	ម្តាយ;ម៉ាក់	ម្តាយខ្ញុំធ្វើការថ្ងៃនេះ។
mountain	ភ្នំ	ភ្នំនេះខ្ពស់។
mouse	កណ្តុរ	កណ្តុរមួយនៅក្រោមកៅអី។
mouth	មាត់	សូមបើកមាត់របស់អ្នក។
move	ផ្លាស់ទី;រើ	រើកៅអីមកទីនេះ។
movie	ខ្សែភាពយន្ត	យើងមើលខ្សែភាពយន្តយប់នេះ។
much	ច្រើន;ប៉ុន្មាន	នេះតម្លៃប៉ុន្មាន?
mum	ម៉ាក់	ម៉ាក់ខ្ញុំនៅផ្ទះ។
museum	សារមន្ទីរ	សារមន្ទីរបើកនៅម៉ោងដប់។
music	តន្ត្រី	ខ្ញុំស្តាប់តន្ត្រី។
must modal	ត្រូវតែ;ចាំបាច់	អ្នកត្រូវតែឈប់នៅទីនេះ។
my	របស់ខ្ញុំ	នេះជាសៀវភៅរបស់ខ្ញុំ។
name	ឈ្មោះ;ដាក់ឈ្មោះ	សរសេរឈ្មោះរបស់អ្នកនៅទីនេះ។
natural	ធម្មជាតិ	ទឹកផ្លែឈើនេះធម្មជាតិ។
near	ជិត;នៅជិត	ធនាគារនៅជិតទីនេះ។
need	ត្រូវការ;តម្រូវការ	ខ្ញុំត្រូវការប៊ិចមួយ។
negative	អវិជ្ជមាន	ចម្លើយនេះអវិជ្ជមាន។
neighbour	អ្នកជិតខាង	អ្នកជិតខាងខ្ញុំរួសរាយ។
never	មិនដែល	ខ្ញុំមិនដែលផឹកកាហ្វេ។
new	ថ្មី	ទូរស័ព្ទនេះថ្មី។
news	ព័ត៌មាន	ព័ត៌មានថ្ងៃនេះល្អ។
newspaper	កាសែត	គាត់អានកាសែត។
next	បន្ទាប់;ក្រោយ	ឡានក្រុងបន្ទាប់យឺត។
next to	នៅជាប់;ក្បែរ	អង្គុយជាប់ខ្ញុំ។
nice	ល្អ;ស្អាត	បន្ទប់នេះស្អាត។
night	យប់	ខ្ញុំគេងនៅយប់។
nine	ប្រាំបួន	សិស្សប្រាំបួននាក់នៅទីនេះ។
nineteen	ដប់ប្រាំបួន	នាងអាយុដប់ប្រាំបួនឆ្នាំ។
ninety	កៅសិប	ជីតាខ្ញុំអាយុកៅសិបឆ្នាំ។
no	ទេ;មិន	ទេអរគុណ។
no one	គ្មាននរណា	គ្មាននរណានៅក្នុងបន្ទប់។
nobody	គ្មាននរណា	គ្មាននរណានៅផ្ទះ។
north	ខាងជើង	ស្ថានីយនៅខាងជើងទីនេះ។
nose	ច្រមុះ	ច្រមុះខ្ញុំត្រជាក់។
not	មិន	ខ្ញុំមិនហត់ទេ។
note	កំណត់ចំណាំ	សរសេរកំណត់ចំណាំឥឡូវនេះ។
nothing	គ្មានអ្វី	គ្មានអ្វីនៅក្នុងប្រអប់។
November	ខែវិច្ឆិកា	វគ្គខ្ញុំចាប់ផ្តើមនៅខែវិច្ឆិកា។
now	ឥឡូវនេះ	មកទីនេះឥឡូវនេះ។
number	លេខ;ចំនួន	សរសេរលេខនៅទីនេះ។
nurse	គិលានុបដ្ឋាយិកា	គិលានុបដ្ឋាយិកាចិត្តល្អ។
object	វត្ថុ	ដាក់វត្ថុនៅលើតុ។
o’clock	ម៉ោងគត់	ថ្នាក់ចាប់ផ្តើមនៅម៉ោងប្រាំបួនគត់។
October	ខែតុលា	យើងធ្វើដំណើរនៅខែតុលា។
of	នៃ;របស់	នេះជាពែងតែ។
off	បិទ;ឈប់ដំណើរការ	បិទភ្លើង។
office	ការិយាល័យ	ការិយាល័យខ្ញុំតូច។
often	ញឹកញាប់	ខ្ញុំដើរទៅសាលាញឹកញាប់។
oh	អូ	អូខ្ញុំយល់ហើយ។
OK	យល់ព្រម;មិនអីទេ	នេះមិនអីទេឬ?
old	ចាស់	ផ្ទះនេះចាស់។
on	លើ;នៅលើ	សៀវភៅនៅលើតុ។
once	ម្តង	ខ្ញុំទូរស័ព្ទម្តងក្នុងមួយសប្តាហ៍។
one	មួយ	ខ្ញុំមានប្អូនស្រីម្នាក់។
onion	ខ្ទឹមបារាំង	កាត់ខ្ទឹមបារាំងមួយ។
online	អនឡាញ	ខ្ញុំរៀនអនឡាញ។
only	តែប៉ុណ្ណោះ	ខ្ញុំមានកាបូបតែមួយ។
open	បើក;បើកចំហ	សូមបើកបង្អួច។
opinion	មតិ;យោបល់	មតិរបស់អ្នកជាអ្វី?
opposite	ផ្ទុយ;ទល់មុខ	ហាងនៅទល់មុខធនាគារ។
or	ឬ	តែឬកាហ្វេ?
orange	ក្រូច;ពណ៌ទឹកក្រូច	ក្រូចនេះផ្អែម។
order	បញ្ជាទិញ;ការបញ្ជា	ខ្ញុំបញ្ជាទិញស៊ុប។
other	ផ្សេង;មួយទៀត	ប្រើទ្វារផ្សេងទៀត។
our	របស់យើង	នេះជាថ្នាក់រៀនរបស់យើង។
out	ចេញ;ខាងក្រៅ	ចេញក្រៅបន្ទាប់ពីអាហារថ្ងៃត្រង់។
outside	ខាងក្រៅ	ក្មេងៗលេងនៅខាងក្រៅ។
over	លើ;ពីលើ	យន្តហោះហោះពីលើទីក្រុង។
own	ផ្ទាល់ខ្លួន	ខ្ញុំមានបន្ទប់ផ្ទាល់ខ្លួន។
page	ទំព័រ	បើកទំព័រដប់។
paint	លាបថ្នាំ;គូររូប	លាបជញ្ជាំងពណ៌ខៀវ។
painting	គំនូរ	គំនូរនេះស្អាត។
pair	គូ	ខ្ញុំត្រូវការស្រោមជើងមួយគូ។
paper	ក្រដាស	សរសេរលើក្រដាសនេះ។
paragraph	កថាខណ្ឌ	អានកថាខណ្ឌដំបូង។
parent	ឪពុកម្តាយ	ឪពុកម្តាយម្នាក់រង់ចាំខាងក្រៅ។
park	ឧទ្យាន;ចត	យើងចតនៅជិតស្ថានីយ។
part	ផ្នែក	ផ្នែកនេះងាយស្រួល។
partner	ដៃគូ	ធ្វើការជាមួយដៃគូ។
party	ពិធីជប់លៀង	ពិធីជប់លៀងចាប់ផ្តើមនៅម៉ោងប្រាំពីរ។
passport	លិខិតឆ្លងដែន	សូមបង្ហាញលិខិតឆ្លងដែនរបស់អ្នក។
past	កន្លងមក;ផុត	ឥឡូវនេះម៉ោងប្រាំមួយកន្លះ។
pay	បង់ប្រាក់	ខ្ញុំបង់ប្រាក់ដោយកាត។
pen	ប៊ិច	ប៊ិចនេះពណ៌ខៀវ។
pencil	ខ្មៅដៃ	ខ្ញុំសរសេរដោយខ្មៅដៃ។
people	មនុស្ស	មនុស្សច្រើននៅទីនេះ។
pepper	ម្រេច	បន្ថែមម្រេចទៅស៊ុប។
perfect	ល្អឥតខ្ចោះ	ចម្លើយរបស់អ្នកល្អឥតខ្ចោះ។
period	រយៈពេល;ម៉ោងរៀន	ម៉ោងរៀននេះខ្លី។
person	មនុស្ស	មនុស្សម្នាក់កំពុងរង់ចាំ។
personal	ផ្ទាល់ខ្លួន	នេះជាទូរស័ព្ទផ្ទាល់ខ្លួនរបស់ខ្ញុំ។
phone	ទូរស័ព្ទ	ទូរស័ព្ទខ្ញុំនៅក្នុងកាបូប។
photo	រូបថត	ថតរូបនៅទីនេះ។
photograph	រូបថត	រូបថតនេះចាស់។
phrase	ឃ្លា	សូមនិយាយឃ្លាម្តងទៀត។
piano	ព្យាណូ	នាងលេងព្យាណូ។
picture	រូបភាព	មើលរូបភាពនេះ។
piece	ដុំ;ចំណែក	យកនំមួយដុំ។
pig	ជ្រូក	ជ្រូកនៅលើកសិដ្ឋាន។
pink	ពណ៌ផ្កាឈូក	កាបូបរបស់នាងពណ៌ផ្កាឈូក។
place	កន្លែង;ទីកន្លែង	កន្លែងនេះស្ងាត់។
plan	ផែនការ	យើងត្រូវការផែនការ។
plane	យន្តហោះ	យន្តហោះយឺត។
plant	រុក្ខជាតិ;ដាំ	ស្រោចទឹករុក្ខជាតិនេះថ្ងៃនេះ។
play	លេង	ក្មេងៗលេងនៅឧទ្យាន។
player	អ្នកលេង	អ្នកលេងរត់លឿន។
please	សូម	សូមអង្គុយនៅទីនេះ។
point	ចំណុច	ចំណុចនេះសំខាន់។
police	ប៉ូលីស	ប៉ូលីសនៅខាងក្រៅ។
policeman	ប៉ូលីសប្រុស	ប៉ូលីសប្រុសជួយយើង។
pool	អាងទឹក	អាងទឹកត្រជាក់។
poor	ក្រីក្រ;អាណិត	ក្មេងក្រីក្រឃ្លាន។
popular	ពេញនិយម	បទចម្រៀងនេះពេញនិយម។
positive	វិជ្ជមាន	នេះជាលទ្ធផលវិជ្ជមាន។
possible	អាចធ្វើបាន	ថ្ងៃនេះអាចធ្វើបានទេ?
post	ប្រកាស;សំបុត្រ	ខ្ញុំអានប្រកាសរបស់នាងអនឡាញ។
potato	ដំឡូងបារាំង	ខ្ញុំញ៉ាំដំឡូងបារាំងមួយ។
pound	ផោន	វាតម្លៃមួយផោន។
practice	ការហ្វឹកហាត់	ការហ្វឹកហាត់ជួយរាល់ថ្ងៃ។
practise	ហ្វឹកហាត់;អនុវត្ត	ខ្ញុំហ្វឹកហាត់ភាសាអង់គ្លេសរាល់ថ្ងៃ។
prefer	ចូលចិត្តជាង	ខ្ញុំចូលចិត្តតែជាង។
prepare	រៀបចំ	រៀបចំកាបូបរបស់អ្នកយប់នេះ។
present	មានវត្តមាន;អំណោយ	នាងមានវត្តមានថ្ងៃនេះ។
pretty	ស្អាត;គួរឱ្យស្រឡាញ់	សួននេះស្អាត។
price	តម្លៃ	តម្លៃទាប។
probably	ប្រហែលជា	នាងប្រហែលជាដឹង។
problem	បញ្ហា	បញ្ហានេះតូច។
product	ផលិតផល	ផលិតផលនេះថ្មី។
programme	កម្មវិធី	កម្មវិធីចាប់ផ្តើមឥឡូវនេះ។
project	គម្រោង	គម្រោងរបស់យើងរួចរាល់។
purple	ពណ៌ស្វាយ	អាវនេះពណ៌ស្វាយ។
put	ដាក់	ដាក់សៀវភៅនៅទីនេះ។
quarter	មួយភាគបួន;ដប់ប្រាំនាទី	ឥឡូវនេះម៉ោងពីរនិងដប់ប្រាំនាទី។
question	សំណួរ	សួរសំណួរមួយ។
quick	លឿន;រហ័ស	នេះជាការធ្វើតេស្តរហ័ស។
quickly	យ៉ាងលឿន	សូមដើរយ៉ាងលឿន។
quiet	ស្ងាត់	បណ្ណាល័យស្ងាត់។
quite	ពិតជាគួរសម;គួរឱ្យកត់សម្គាល់	បន្ទប់នេះតូចគួរសម។
radio	វិទ្យុ	វិទ្យុលឺខ្លាំង។
rain	ភ្លៀង	ភ្លៀងចាប់ផ្តើមឥឡូវនេះ។
read	អាន	អានប្រយោគនេះ។
reader	អ្នកអាន	អ្នកអានចូលចិត្តរឿងនេះ។
reading	ការអាន	ការអានជួយខ្ញុំរៀន។
ready	រួចរាល់	អាហារពេលល្ងាចរួចរាល់។
real	ពិតប្រាកដ	នេះជាបញ្ហាពិតប្រាកដ។
really	ពិតជា	ខ្ញុំពិតជាចូលចិត្តបទចម្រៀងនេះ។
reason	ហេតុផល	ប្រាប់ខ្ញុំពីហេតុផល។
red	ពណ៌ក្រហម	ទ្វារពណ៌ក្រហម។
relax	សម្រាក	សម្រាកបន្ទាប់ពីការងារ។
remember	ចងចាំ	ចងចាំលិខិតឆ្លងដែនរបស់អ្នក។
repeat	និយាយម្តងទៀត;ធ្វើម្តងទៀត	សូមនិយាយប្រយោគម្តងទៀត។
report	របាយការណ៍	អានរបាយការណ៍យប់នេះ។
restaurant	ភោជនីយដ្ឋាន	ភោជនីយដ្ឋានមមាញឹក។
result	លទ្ធផល	លទ្ធផលល្អ។
return	ត្រឡប់;ប្រគល់វិញ	ប្រគល់សៀវភៅវិញថ្ងៃស្អែក។
rice	បាយ;អង្ករ	ខ្ញុំញ៉ាំបាយពេលថ្ងៃត្រង់។
rich	មានទ្រព្យ;សម្បូរ	ទីក្រុងនេះសម្បូរ។
ride	ជិះ	ខ្ញុំជិះកង់របស់ខ្ញុំ។
right	ត្រឹមត្រូវ;ខាងស្តាំ	បត់ស្តាំនៅទីនេះ។
river	ទន្លេ	ទន្លេធំទូលាយ។
road	ផ្លូវ	ផ្លូវនេះវែង។
room	បន្ទប់	បន្ទប់ខ្ញុំស្អាត។
routine	ទម្លាប់ប្រចាំថ្ងៃ	ទម្លាប់ខ្ញុំចាប់ផ្តើមព្រឹក។
rule	ច្បាប់	ច្បាប់នេះសាមញ្ញ។
run	រត់	ខ្ញុំរត់រាល់ព្រឹក។
sad	សោកសៅ	គាត់សោកសៅថ្ងៃនេះ។
salad	សាឡាត់	សាឡាត់នេះស្រស់។
salt	អំបិល	បន្ថែមអំបិលបន្តិច។
same	ដូចគ្នា	យើងមានកាបូបដូចគ្នា។
sandwich	សាំងវិច	ខ្ញុំញ៉ាំសាំងវិចមួយ។
Saturday	ថ្ងៃសៅរ៍	យើងជួបគ្នានៅថ្ងៃសៅរ៍។
say	និយាយ	សូមនិយាយឈ្មោះរបស់អ្នក។
school	សាលារៀន	សាលារៀនខ្ញុំនៅជិតទីនេះ។
science	វិទ្យាសាស្ត្រ	ខ្ញុំរៀនវិទ្យាសាស្ត្រ។
scientist	អ្នកវិទ្យាសាស្ត្រ	អ្នកវិទ្យាសាស្ត្រសួរសំណួរ។
sea	សមុទ្រ	សមុទ្រពណ៌ខៀវ។
second1 (unit of time)	វិនាទី	រង់ចាំមួយវិនាទី។
section	ផ្នែក	អានផ្នែកនេះ។
see	ឃើញ;មើលឃើញ	ខ្ញុំឃើញមិត្តភក្តិរបស់ខ្ញុំ។
sell	លក់	ពួកគេលក់ផ្លែឈើស្រស់។
send	ផ្ញើ	ផ្ញើសារឥឡូវនេះ។
sentence	ប្រយោគ	សរសេរប្រយោគមួយ។
September	ខែកញ្ញា	សាលារៀនចាប់ផ្តើមនៅខែកញ្ញា។
seven	ប្រាំពីរ	មនុស្សប្រាំពីរនាក់នៅទីនេះ។
seventeen	ដប់ប្រាំពីរ	គាត់អាយុដប់ប្រាំពីរឆ្នាំ។
seventy	ចិតសិប	ជីដូនខ្ញុំអាយុចិតសិបឆ្នាំ។
share	ចែករំលែក	ចែករំលែកនំ។
she	នាង	នាងជាបងស្រីខ្ញុំ។
sheep	ចៀម	ចៀមស៊ីស្មៅ។
shirt	អាវ	អាវរបស់គាត់ស្អាត។
shoe	ស្បែកជើង	ស្បែកជើងមួយនៅក្រោមគ្រែ។
shop	ហាង;ទិញទំនិញ	ហាងបិទលឿន។
shopping	ការទិញទំនិញ	ការទិញទំនិញថ្ងៃនេះសប្បាយ។
short	ខ្លី	រឿងនេះខ្លី។
should modal	គួរ	អ្នកគួរសម្រាកថ្ងៃនេះ។
show	បង្ហាញ;ការសម្តែង	បង្ហាញសំបុត្ររបស់អ្នកឱ្យខ្ញុំ។
shower	ងូតទឹក	ខ្ញុំងូតទឹក។
sick	ឈឺ	ខ្ញុំមានអារម្មណ៍ឈឺថ្ងៃនេះ។
similar	ស្រដៀងគ្នា	កាបូបរបស់យើងស្រដៀងគ្នា។
sing	ច្រៀង	ខ្ញុំច្រៀងនៅក្នុងថ្នាក់។
singer	អ្នកចម្រៀង	អ្នកចម្រៀងល្បី។
sister	បងស្រី;ប្អូនស្រី	ប្អូនស្រីខ្ញុំនៅក្មេង។
sit	អង្គុយ	អង្គុយជិតបង្អួច។
situation	ស្ថានភាព	ស្ថានភាពនេះថ្មី។
six	ប្រាំមួយ	សៀវភៅប្រាំមួយក្បាលនៅទីនេះ។
sixteen	ដប់ប្រាំមួយ	នាងអាយុដប់ប្រាំមួយឆ្នាំ។
sixty	ហុកសិប	ឪពុកខ្ញុំអាយុហុកសិបឆ្នាំ។
skill	ជំនាញ	ជំនាញនេះមានប្រយោជន៍។
skirt	សំពត់	សំពត់របស់នាងពណ៌ខៀវ។
sleep	គេង;ការគេង	ខ្ញុំគេងប្រាំបីម៉ោង។
slow	យឺត	ឡានក្រុងយឺត។
small	តូច	បន្ទប់តូច។
snake	ពស់	ពស់វែង។
snow	ព្រិល	ព្រិលធ្លាក់នៅរដូវរងា។
so	ដូច្នេះ;ខ្លាំង	ខ្ញុំហត់ដូច្នេះខ្ញុំសម្រាក។
some	ខ្លះ;មួយចំនួន	ខ្ញុំត្រូវការទឹកខ្លះ។
somebody	នរណាម្នាក់	នរណាម្នាក់នៅមាត់ទ្វារ។
someone	នរណាម្នាក់	នរណាម្នាក់ទុកសារ។
something	អ្វីមួយ	ខ្ញុំត្រូវការអ្វីមួយដើម្បីផឹក។
sometimes	ពេលខ្លះ	ពេលខ្លះខ្ញុំដើរទៅសាលា។
son	កូនប្រុស	កូនប្រុសរបស់នាងនៅសាលា។
song	បទចម្រៀង	បទចម្រៀងនេះថ្មី។
soon	ឆាប់ៗនេះ	ជួបគ្នាឆាប់ៗនេះ។
sorry	សុំទោស;សោកស្តាយ	ខ្ញុំសុំទោស។
sound	សំឡេង	សំឡេងលឺខ្លាំង។
soup	ស៊ុប	ស៊ុបក្តៅ។
south	ខាងត្បូង	សណ្ឋាគារនៅខាងត្បូងទីនេះ។
space	កន្លែង;លំហ	មានកន្លែងសម្រាប់កៅអីមួយ។
speak	និយាយ	សូមនិយាយយឺតៗ។
special	ពិសេស	ថ្ងៃនេះជាថ្ងៃពិសេស។
spell	ប្រកប	ប្រកបឈ្មោះរបស់អ្នក។
spelling	អក្ខរាវិរុទ្ធ	ពិនិត្យអក្ខរាវិរុទ្ធរបស់អ្នក។
spend	ចំណាយ	ខ្ញុំចំណាយលុយលើអាហារ។
sport	កីឡា	បាល់ទាត់ជាកីឡាពេញនិយម។
spring	រដូវផ្ការីក;និទាឃរដូវ	ផ្កាលូតលាស់នៅរដូវផ្ការីក។
stand	ឈរ	ឈរជិតទ្វារ។
star	ផ្កាយ	ខ្ញុំឃើញផ្កាយភ្លឺមួយ។
start	ចាប់ផ្តើម;ការចាប់ផ្តើម	ចាប់ផ្តើមមេរៀនឥឡូវនេះ។
statement	សេចក្តីថ្លែងការណ៍	សេចក្តីថ្លែងការណ៍នេះត្រឹមត្រូវ។
station	ស្ថានីយ	ស្ថានីយនៅជិត។
stay	នៅ;ស្នាក់នៅ	នៅផ្ទះថ្ងៃនេះ។
still	នៅតែ	ខ្ញុំនៅតែឃ្លាន។
stop	ឈប់;ចំណត	ឈប់នៅជ្រុង។
story	រឿង	ប្រាប់ខ្ញុំរឿងមួយ។
street	ផ្លូវ	ផ្លូវនេះស្ងាត់។
strong	ខ្លាំង;រឹងមាំ	គាត់រឹងមាំ។
student	សិស្ស	សិស្សអានសៀវភៅ។
study	រៀន;ការសិក្សា	ខ្ញុំរៀនភាសាអង់គ្លេស។
style	រចនាប័ទ្ម;ស្ទីល	ខ្ញុំចូលចិត្តរចនាប័ទ្មនេះ។
subject	មុខវិជ្ជា;ប្រធានបទ	ភាសាអង់គ្លេសជាមុខវិជ្ជាសំខាន់របស់ខ្ញុំ។
success	ភាពជោគជ័យ	ភាពជោគជ័យត្រូវការការហ្វឹកហាត់។
sugar	ស្ករ	ដាក់ស្ករក្នុងតែ។
summer	រដូវក្តៅ	រដូវក្តៅនៅទីនេះក្តៅ។
sun	ព្រះអាទិត្យ	ព្រះអាទិត្យភ្លឺ។
Sunday	ថ្ងៃអាទិត្យ	យើងសម្រាកនៅថ្ងៃអាទិត្យ។
supermarket	ផ្សារទំនើប	ផ្សារទំនើបបើក។
sure	ប្រាកដ	ខ្ញុំប្រាកដ។
sweater	អាវរងា	អាវរងារបស់ខ្ញុំកក់ក្តៅ។
swim	ហែលទឹក	ខ្ញុំហែលទឹករាល់សប្តាហ៍។
swimming	ការហែលទឹក	ការហែលទឹកជាលំហាត់ល្អ។
table	តុ	កូនសោនៅលើតុ។`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Khmer rows, found ${lines.length}`);
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
      throw new Error(`Khmer example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!KHMER_RE.test(display) || !KHMER_RE.test(example)) {
      throw new Error(`Khmer display/example must contain Khmer script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (LATIN_RE.test(display) || LATIN_RE.test(example)) {
      throw new Error(`Khmer display/example contains Latin fallback text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (KHMER_TOKEN_SPACE_RE.test(example)) {
      throw new Error(`Khmer example contains generated token spaces for ${sourceHeadword}: ${example}`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Khmer display/example contains unexpected non-Khmer script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Khmer translation row for ${sourceHeadword}`);
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
    "Generate LO support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after LO.",
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
  const translations = parseTsv(KM_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Khmer translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Khmer translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Khmer; display cells use Khmer-script citation/base forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: KM Khmer display/example cells, sentence punctuation, no Latin fallback, no generated Khmer token spaces and unexpected-script leakage guard
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
    next_language: "LO",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
