#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["ZH", "JA", "KO"]
SENTENCE_END_RE = re.compile(r"[.!?。！？]$")
HAN_RE = re.compile(r"[\u4E00-\u9FFF]")
JAPANESE_RE = re.compile(r"[\u3040-\u30FF\u4E00-\u9FFF]")
HANGUL_RE = re.compile(r"[\uAC00-\uD7AF]")


TRANSLATIONS_TSV = """source_headword	ZH	example_ZH	JA	example_JA	KO	example_KO
a, an	不定冠词	我有一支笔。	不定冠詞	ペンを一本持っています。	부정관사	펜이 한 자루 있어요.
about	关于; 大约	我们谈论食物。	〜について; 約	食べ物について話します。	~에 대해; 약	우리는 음식에 대해 이야기해요.
above	在上方; 高于	时钟在门上方。	上に; 上方に	時計はドアの上にあります。	위에	시계가 문 위에 있어요.
across	在对面; 横过	商店在街对面。	向かいに; 横切って	店は通りの向かいにあります。	건너편에	가게가 길 건너편에 있어요.
action	行动; 动作	他的行动帮助我。	行動	彼の行動は私の助けになります。	행동	그의 행동은 나에게 도움이 돼요.
activity	活动	游泳是一项有趣的活动。	活動	水泳は楽しい活動です。	활동	수영은 재미있는 활동이에요.
actor	男演员	男演员在电影里。	俳優	俳優は映画に出ています。	배우	그 배우는 영화에 나와요.
actress	女演员	女演员对我们微笑。	女優	女優は私たちにほほえみます。	여배우	그 여배우는 우리에게 미소 지어요.
add	添加; 加上	在这里加上你的名字。	加える; 追加する	ここに名前を加えてください。	추가하다	여기에 이름을 추가하세요.
address	地址	我的地址在这张卡片上。	住所	私の住所はこのカードにあります。	주소	내 주소는 이 카드에 있어요.
adult	成年人	一个成年人坐在门边。	大人	大人がドアの近くに座っています。	어른	어른이 문 근처에 앉아 있어요.
advice	建议	她的建议很简单。	助言; アドバイス	彼女の助言は簡単です。	조언	그녀의 조언은 간단해요.
afraid	害怕的	孩子害怕了。	怖い; 恐れている	子どもは怖がっています。	무서워하는	아이가 무서워해요.
after	在之后	我课后吃饭。	後で	授業の後で食べます。	~후에	나는 수업 후에 먹어요.
afternoon	下午	我下午学习。	午後	午後に勉強します。	오후	나는 오후에 공부해요.
again	再; 又	请再说一遍。	もう一度; また	もう一度言ってください。	다시	다시 말해 주세요.
age	年龄	你多大了？	年齢	あなたの年齢はいくつですか。	나이	나이가 어떻게 되세요?
ago	以前; 前	我两天前来到这里。	〜前	二日前にここに来ました。	~전에	이틀 전에 여기 왔어요.
agree	同意	我同意你的看法。	同意する	あなたに同意します。	동의하다	네 말에 동의해요.
air	空气	空气很冷。	空気	空気は冷たいです。	공기	공기가 차가워요.
airport	机场	我们在机场。	空港	私たちは空港にいます。	공항	우리는 공항에 있어요.
all	所有; 全部	所有学生都在这里。	すべての; 全部	学生はみんなここにいます。	모든; 전부	모든 학생이 여기 있어요.
also	也; 还	我也喜欢茶。	も; また	私もお茶が好きです。	또한; 도	나도 차를 좋아해요.
always	总是	她总是喝水。	いつも	彼女はいつも水を飲みます。	항상	그녀는 항상 물을 마셔요.
amazing	令人惊叹的	景色很棒。	すばらしい; 驚くべき	景色はすばらしいです。	놀라운	경치가 놀라워요.
and	和	汤姆和安娜是朋友。	そして; と	トムとアンナは友達です。	그리고; 와/과	톰과 안나는 친구예요.
angry	生气的	他现在很生气。	怒っている	彼は今怒っています。	화난	그는 지금 화가 났어요.
animal	动物	狗是一种动物。	動物	犬は動物です。	동물	개는 동물이에요.
another	另一个; 又一个	我想要另一个杯子。	もう一つの; 別の	もう一杯欲しいです。	다른; 하나 더	컵 하나 더 원해요.
answer	答案; 回答	把答案写在这里。	答え; 回答	答えをここに書いてください。	답; 대답	답을 여기에 쓰세요.
any	一些; 任何	你有钱吗？	いくらかの; 何か	お金を少し持っていますか。	어떤; 조금	돈이 좀 있어요?
anyone	任何人; 有人	有人需要帮助吗？	誰か	誰か助けが必要ですか。	누구; 누군가	누구 도움이 필요해요?
anything	任何东西; 什么	我什么也看不见。	何か; 何も	何も見えません。	무엇; 아무것	아무것도 보이지 않아요.
apartment	公寓	我的公寓很小。	アパート	私のアパートは小さいです。	아파트	내 아파트는 작아요.
apple	苹果	这个苹果是红色的。	リンゴ	このリンゴは赤いです。	사과	이 사과는 빨개요.
April	四月	我的生日在四月。	四月	私の誕生日は四月です。	4월	내 생일은 4월이에요.
area	地区; 区域	这个地区很安静。	地域; 区域	この地域は静かです。	지역; 구역	이 지역은 조용해요.
arm	胳膊; 手臂	我的胳膊疼。	腕	腕が痛いです。	팔	내 팔이 아파요.
around	围绕; 在周围	我们在公园里散步。	周りに; あちこち	公園を歩き回ります。	주위에; 둘레에	우리는 공원을 걸어요.
arrive	到达	他们六点到。	着く; 到着する	彼らは六時に着きます。	도착하다	그들은 여섯 시에 도착해요.
art	艺术	我喜欢艺术。	芸術; 美術	芸術が好きです。	미술; 예술	나는 미술을 좋아해요.
article	文章	我在网上读一篇文章。	記事	オンラインで記事を読みます。	기사	온라인에서 기사를 읽어요.
artist	艺术家	艺术家画一张脸。	芸術家; アーティスト	芸術家は顔を描きます。	예술가	그 예술가는 얼굴을 그려요.
as	作为	我当老师。	として	教師として働いています。	~로서; ~로	나는 교사로 일해요.
ask	问; 请求	现在问老师。	尋ねる; 頼む	今、先生に聞いてください。	묻다; 부탁하다	지금 선생님께 물어보세요.
at	在	我在家。	で; に	家にいます。	에; 에서	나는 집에 있어요.
August	八月	我们八月旅行。	八月	八月に旅行します。	8월	우리는 8월에 여행해요.
aunt	阿姨; 姑妈	我阿姨住在这里。	おば	私のおばはここに住んでいます。	이모; 고모	내 이모가 여기에 살아요.
autumn	秋天	秋天树叶落下。	秋	秋には葉が落ちます。	가을	가을에는 잎이 떨어져요.
away	离开; 远离	公共汽车开走了。	離れて; 向こうへ	バスは行ってしまいます。	멀리; 떠나서	버스가 떠나가요.
baby	婴儿	婴儿在睡觉。	赤ちゃん	赤ちゃんは寝ています。	아기	아기가 자고 있어요.
back	背; 后面	我的背疼。	背中; 後ろ	背中が痛いです。	등; 뒤	내 등이 아파요.
bad	坏的; 糟糕的	这牛奶坏了。	悪い	この牛乳は悪くなっています。	나쁜; 상한	이 우유는 상했어요.
bag	包	你的包在椅子上。	かばん	あなたのかばんは椅子の上にあります。	가방	네 가방은 의자 위에 있어요.
ball	球	球在桌子下面。	ボール	ボールはテーブルの下にあります。	공	공은 탁자 아래에 있어요.
banana	香蕉	我吃一根香蕉。	バナナ	バナナを一本食べます。	바나나	나는 바나나를 먹어요.
band	乐队	乐队演奏音乐。	バンド; 楽団	バンドは音楽を演奏します。	밴드	밴드가 음악을 연주해요.
bank (money)	银行	银行九点开门。	銀行	銀行は九時に開きます。	은행	은행은 아홉 시에 열어요.
bath	洗澡; 浴缸	我晚上洗澡。	風呂; 入浴	夜にお風呂に入ります。	목욕	나는 밤에 목욕해요.
bathroom	浴室; 洗手间	浴室很干净。	浴室; トイレ	浴室はきれいです。	욕실; 화장실	욕실은 깨끗해요.
be	是; 在	我很开心。	である; いる	私は幸せです。	이다; 있다	나는 행복해요.
beach	海滩	我们坐在海滩上。	浜辺; ビーチ	私たちは浜辺に座っています。	해변	우리는 해변에 앉아 있어요.
beautiful	美丽的	花很漂亮。	美しい	花は美しいです。	아름다운	꽃이 아름다워요.
because	因为	我待在家里，因为我病了。	なぜなら; ので	病気なので家にいます。	왜냐하면; 때문에	아파서 집에 있어요.
become	变成; 成为	天气可能变冷。	〜になる	寒くなることがあります。	~이 되다	추워질 수 있어요.
bed	床	床很大。	ベッド	ベッドは大きいです。	침대	침대가 커요.
bedroom	卧室	我的卧室很安静。	寝室	私の寝室は静かです。	침실	내 침실은 조용해요.
beer	啤酒	他晚饭时喝啤酒。	ビール	彼は夕食にビールを飲みます。	맥주	그는 저녁에 맥주를 마셔요.
before	在之前	午饭前洗手。	前に	昼食の前に手を洗ってください。	~전에	점심 전에 손을 씻으세요.
begin	开始	现在开始考试。	始める; 始まる	今、テストを始めてください。	시작하다	지금 시험을 시작하세요.
beginning	开头; 开始	开头很容易。	始まり	始まりは簡単です。	시작	시작은 쉬워요.
behind	在后面	猫在沙发后面。	後ろに	猫はソファの後ろにいます。	뒤에	고양이는 소파 뒤에 있어요.
believe	相信	我相信你。	信じる	あなたを信じます。	믿다	나는 너를 믿어요.
below	在下面; 低于	名字在图片下面。	下に; 下方に	名前は絵の下にあります。	아래에	이름은 그림 아래에 있어요.
best	最好的	她是我最好的朋友。	最高の; 一番良い	彼女は私の親友です。	최고의; 가장 좋은	그녀는 내 가장 친한 친구예요.
better	更好的	我今天感觉好多了。	より良い	今日は気分が良くなりました。	더 좋은; 더 나은	나는 오늘 기분이 더 좋아요.
between	在之间	咖啡馆在两家商店之间。	間に	カフェは二つの店の間にあります。	사이에	카페는 두 가게 사이에 있어요.
bicycle	自行车	我的自行车是蓝色的。	自転車	私の自転車は青いです。	자전거	내 자전거는 파란색이에요.
big	大的	这个盒子很大。	大きい	この箱は大きいです。	큰	이 상자는 커요.
bike	自行车	我骑自行车。	自転車; バイク	自転車に乗ります。	자전거	나는 자전거를 타요.
bill	账单	账单在桌子上。	請求書; 勘定	請求書はテーブルの上にあります。	계산서; 청구서	계산서가 탁자 위에 있어요.
bird	鸟	树上有一只鸟。	鳥	鳥が木にいます。	새	새 한 마리가 나무에 있어요.
birthday	生日	今天是我的生日。	誕生日	今日は私の誕生日です。	생일	오늘은 내 생일이에요.
black	黑色的	我的包是黑色的。	黒い	私のかばんは黒いです。	검은색의	내 가방은 검은색이에요.
blog	博客	她写博客。	ブログ	彼女はブログを書いています。	블로그	그녀는 블로그를 써요.
blonde	金发的	他有金发。	金髪の	彼は金髪です。	금발의	그는 금발 머리예요.
blue	蓝色的	天空是蓝色的。	青い	空は青いです。	파란	하늘은 파래요.
boat	船	船在水上。	ボート; 船	ボートは水の上にあります。	배	배가 물 위에 있어요.
body	身体	我的身体累了。	体	体が疲れています。	몸	몸이 피곤해요.
book	书	我读一本书。	本	本を読みます。	책	나는 책을 읽어요.
boot	靴子	一只靴子在床下。	ブーツ	片方のブーツがベッドの下にあります。	부츠	부츠 한 짝이 침대 아래에 있어요.
bored	无聊的	我很无聊。	退屈した	私は退屈しています。	지루한	나는 지루해요.
boring	无聊的	这部电影很无聊。	退屈な	この映画は退屈です。	지루한	이 영화는 지루해요.
born	出生的	我五月出生。	生まれた	私は五月に生まれました。	태어난	나는 5월에 태어났어요.
both	两个都	两个女孩都很开心。	両方の	二人の女の子はどちらも幸せです。	둘 다	두 여자아이 모두 행복해요.
bottle	瓶子	瓶子是满的。	ボトル; 瓶	ボトルはいっぱいです。	병	병이 가득 차 있어요.
box	盒子	盒子是打开的。	箱	箱は開いています。	상자	상자가 열려 있어요.
boy	男孩	男孩跑得很快。	男の子	男の子は速く走ります。	소년; 남자아이	소년이 빨리 달려요.
boyfriend	男朋友	她的男朋友很友善。	彼氏	彼女の彼氏は親切です。	남자친구	그녀의 남자친구는 친절해요.
bread	面包	我想要面包。	パン	パンが欲しいです。	빵	나는 빵을 원해요.
break	打破; 弄坏	不要打破杯子。	壊す; 割る	カップを割らないでください。	깨다; 부수다	컵을 깨지 마세요.
breakfast	早餐	早餐准备好了。	朝食	朝食の準備ができています。	아침 식사	아침 식사가 준비됐어요.
bring	带来	带上你的书。	持ってくる	本を持ってきてください。	가져오다	책을 가져오세요.
brother	兄弟; 哥哥	我哥哥很高。	兄弟; 兄	私の兄は背が高いです。	형제; 형	내 형은 키가 커요.
brown	棕色的	狗是棕色的。	茶色の	犬は茶色です。	갈색의	개는 갈색이에요.
build	建造	他们建房子。	建てる; 作る	彼らは家を建てます。	짓다; 만들다	그들은 집을 지어요.
building	建筑物; 楼	这栋楼很旧。	建物	この建物は古いです。	건물	이 건물은 오래됐어요.
bus	公共汽车	公共汽车晚点了。	バス	バスは遅れています。	버스	버스가 늦었어요.
business	生意; 企业	我父亲有一家公司。	事業; 会社	父は事業をしています。	사업; 회사	우리 아버지는 사업을 해요.
busy	忙的	我今天很忙。	忙しい	今日は忙しいです。	바쁜	나는 오늘 바빠요.
but	但是	我喜欢茶，但不喜欢咖啡。	でも; しかし	お茶は好きですが、コーヒーは好きではありません。	하지만; 그러나	나는 차는 좋아하지만 커피는 안 좋아해요.
butter	黄油	把黄油涂在面包上。	バター	パンにバターを塗ってください。	버터	빵에 버터를 바르세요.
buy	买	我买牛奶。	買う	牛乳を買います。	사다	나는 우유를 사요.
by	在旁边; 由	坐在窗边。	そばに; によって	窓のそばに座ってください。	옆에; 에 의해	창문 옆에 앉으세요.
bye	再见	再见，明天见。	さようなら; またね	さようなら、また明日。	안녕; 잘 가	안녕, 내일 봐요.
cafe	咖啡馆	我们在咖啡馆见面。	カフェ	カフェで会います。	카페	우리는 카페에서 만나요.
cake	蛋糕	蛋糕很甜。	ケーキ	ケーキは甘いです。	케이크	케이크는 달아요.
call	打电话; 称呼	请给我打电话。	電話する; 呼ぶ	私に電話してください。	전화하다; 부르다	나에게 전화해 주세요.
camera	相机	我的相机是新的。	カメラ	私のカメラは新しいです。	카메라	내 카메라는 새것이에요.
can1 modal	能; 会	我会游泳。	〜できる	私は泳げます。	~할 수 있다	나는 수영할 수 있어요.
cannot	不能	我今天不能来。	〜できない	今日は来られません。	~할 수 없다	오늘은 올 수 없어요.
capital	首都	巴黎是首都城市。	首都	パリは首都です。	수도	파리는 수도예요.
car	汽车	汽车是红色的。	車	車は赤いです。	차; 자동차	차는 빨간색이에요.
card	卡片	我有一张生日卡。	カード	誕生日カードを持っています。	카드	나는 생일 카드를 가지고 있어요.
career	职业生涯	我想从事艺术事业。	キャリア; 職業	芸術の仕事をしたいです。	진로; 경력	나는 예술 분야에서 일하고 싶어요.
carrot	胡萝卜	胡萝卜是橙色的。	にんじん	にんじんはオレンジ色です。	당근	당근은 주황색이에요.
carry	携带; 拿	我背着我的包。	持つ; 運ぶ	かばんを持っています。	들다; 나르다	나는 가방을 들고 있어요.
cat	猫	猫在睡觉。	猫	猫は寝ています。	고양이	고양이가 자요.
CD	CD; 光盘	这张CD有音乐。	CD; シーディー	このCDには音楽が入っています。	CD; 시디	이 CD에는 음악이 있어요.
cent	分; 美分	一分钱很小。	セント	一セントはとても小さいです。	센트	1센트는 아주 작아요.
centre	中心	市中心很热闹。	中心; センター	町の中心はにぎやかです。	중심; 센터	도심은 붐벼요.
century	世纪	一个世纪是一百年。	世紀	一世紀は百年です。	세기	한 세기는 백 년이에요.
chair	椅子	坐在椅子上。	椅子	椅子に座ってください。	의자	의자에 앉으세요.
change	改变; 更换	我换衣服。	変える; 着替える	服を着替えます。	바꾸다; 갈아입다	나는 옷을 갈아입어요.
chart	图表	看这张图表。	図表; グラフ	図表を見てください。	도표; 차트	도표를 보세요.
cheap	便宜的	这件衬衫很便宜。	安い	このシャツは安いです。	싼	이 셔츠는 싸요.
check	检查	检查你的答案。	確認する	答えを確認してください。	확인하다	답을 확인하세요.
cheese	奶酪	我喜欢奶酪。	チーズ	チーズが好きです。	치즈	나는 치즈를 좋아해요.
chicken	鸡肉; 鸡	我们晚餐吃鸡肉。	鶏肉; にわとり	夕食に鶏肉を食べます。	닭고기; 닭	우리는 저녁으로 닭고기를 먹어요.
child	孩子	孩子很开心。	子ども	子どもは幸せです。	아이	아이는 행복해요.
chocolate	巧克力	巧克力很甜。	チョコレート	チョコレートは甘いです。	초콜릿	초콜릿은 달아요.
choose	选择	选择一个答案。	選ぶ	答えを一つ選んでください。	고르다; 선택하다	답 하나를 고르세요.
cinema	电影院	我们去电影院。	映画館	映画館に行きます。	영화관	우리는 영화관에 가요.
city	城市	城市很大。	都市; 市	その都市は大きいです。	도시	그 도시는 커요.
class	课; 班级	课九点开始。	授業; クラス	授業は九時に始まります。	수업; 반	수업은 아홉 시에 시작해요.
classroom	教室	教室很安静。	教室	教室は静かです。	교실	교실은 조용해요.
clean	干净的	房间很干净。	きれいな; 清潔な	部屋はきれいです。	깨끗한	방은 깨끗해요.
climb	爬; 攀登	他们爬山坡。	登る	彼らは丘を登ります。	오르다; 등반하다	그들은 언덕을 올라요.
clock	时钟	时钟在墙上。	時計	時計は壁にあります。	시계	시계가 벽에 있어요.
close1	关闭	请关门。	閉める	ドアを閉めてください。	닫다	문을 닫아 주세요.
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


def has_required_script(language, value):
    if language == "ZH":
        return bool(HAN_RE.search(value))
    if language == "JA":
        return bool(JAPANESE_RE.search(value))
    if language == "KO":
        return bool(HANGUL_RE.search(value))
    return True


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
            if not has_required_script(language, display):
                problems.append(f"{source_headword}/{language}: display has no required script")
            if not has_required_script(language, example):
                problems.append(f"{source_headword}/{language}: example has no required script")
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
    parser.add_argument("--batch-id", default="zh_ja_ko_v1")
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
        "- Script-aware validation: ZH Han, JA Japanese script, KO Hangul",
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
