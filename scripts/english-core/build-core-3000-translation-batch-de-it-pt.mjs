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
  core3000_0001: {
    DE: ["der; die; das", "Die Tür ist offen."],
    IT: ["il; la; lo; l'", "La porta è aperta."],
    PT: ["o; a; os; as", "A porta está aberta."],
  },
  core3000_0002: {
    DE: ["sein", "Ich möchte bereit sein."],
    IT: ["essere", "Voglio essere pronto."],
    PT: ["ser; estar", "Quero estar pronto."],
  },
  core3000_0003: {
    DE: ["und", "Tee und Wasser stehen auf dem Tisch."],
    IT: ["e", "Il tè e l'acqua sono sul tavolo."],
    PT: ["e", "O chá e a água estão na mesa."],
  },
  core3000_0004: {
    DE: ["von; des", "Eine Tasse Tee ist heiß."],
    IT: ["di", "Una tazza di tè è calda."],
    PT: ["de", "Uma chávena de chá está quente."],
  },
  core3000_0005: {
    DE: ["Infinitiv mit zu", "Ich möchte nach Hause gehen."],
    IT: ["a; di", "Voglio andare a casa."],
    PT: ["a; para", "Quero ir para casa."],
  },
  core3000_0006: {
    DE: ["ein; eine", "Ich habe ein Buch."],
    IT: ["un; una", "Ho un libro."],
    PT: ["um; uma", "Tenho um livro."],
  },
  core3000_0007: {
    DE: ["in; im", "Der Schlüssel ist in der Tasche."],
    IT: ["in; dentro", "La chiave è nella borsa."],
    PT: ["em; dentro de", "A chave está na mala."],
  },
  core3000_0008: {
    DE: ["haben", "Ich habe ein Handy."],
    IT: ["avere", "Ho un telefono."],
    PT: ["ter", "Tenho um telemóvel."],
  },
  core3000_0009: {
    DE: ["es", "Es ist in der Tasche."],
    IT: ["esso; lo; la", "È nella borsa."],
    PT: ["ele; ela; isso", "Está na mala."],
  },
  core3000_0010: {
    DE: ["du; Sie", "Du bist mein Freund."],
    IT: ["tu; Lei", "Tu sei mio amico."],
    PT: ["tu; você", "Tu és meu amigo."],
  },
  core3000_0011: {
    DE: ["er", "Er ist in der Schule."],
    IT: ["lui", "Lui è a scuola."],
    PT: ["ele", "Ele está na escola."],
  },
  core3000_0012: {
    DE: ["für", "Dieses Geschenk ist für dich."],
    IT: ["per", "Questo regalo è per te."],
    PT: ["para", "Este presente é para ti."],
  },
  core3000_0013: {
    DE: ["sie", "Sie sind zu Hause."],
    IT: ["loro", "Loro sono a casa."],
    PT: ["eles; elas", "Eles estão em casa."],
  },
  core3000_0014: {
    DE: ["nicht", "Ich bin nicht müde."],
    IT: ["non", "Non sono stanco."],
    PT: ["não", "Não estou cansado."],
  },
  core3000_0015: {
    DE: ["dieser; jener", "Dieses Buch gehört mir."],
    IT: ["quel; quello; quella", "Quel libro è mio."],
    PT: ["aquele; aquela", "Aquele livro é meu."],
  },
  core3000_0016: {
    DE: ["wir", "Wir sind bereit."],
    IT: ["noi", "Noi siamo pronti."],
    PT: ["nós", "Nós estamos prontos."],
  },
  core3000_0017: {
    DE: ["auf", "Die Tasse steht auf dem Tisch."],
    IT: ["su; sopra", "La tazza è sul tavolo."],
    PT: ["em; sobre", "A chávena está na mesa."],
  },
  core3000_0018: {
    DE: ["mit", "Ich bin bei meiner Familie."],
    IT: ["con", "Sono con la mia famiglia."],
    PT: ["com", "Estou com a minha família."],
  },
  core3000_0019: {
    DE: ["dieser; diese; dieses", "Dieses Buch ist neu."],
    IT: ["questo; questa", "Questo libro è nuovo."],
    PT: ["este; esta", "Este livro é novo."],
  },
  core3000_0020: {
    DE: ["ich", "Ich bin zu Hause."],
    IT: ["io", "Io sono a casa."],
    PT: ["eu", "Eu estou em casa."],
  },
  core3000_0021: {
    DE: ["machen; tun", "Ich mache meine Hausaufgaben."],
    IT: ["fare", "Faccio i compiti."],
    PT: ["fazer", "Faço os trabalhos de casa."],
  },
  core3000_0022: {
    DE: ["als", "Sie arbeitet als Lehrerin."],
    IT: ["come", "Lavora come insegnante."],
    PT: ["como", "Ela trabalha como professora."],
  },
  core3000_0023: {
    DE: ["an; bei; um", "Triff mich in der Schule."],
    IT: ["a; presso", "Incontrami a scuola."],
    PT: ["em; a", "Encontra-me na escola."],
  },
  core3000_0024: {
    DE: ["sie", "Sie ist meine Schwester."],
    IT: ["lei", "Lei è mia sorella."],
    PT: ["ela", "Ela é minha irmã."],
  },
  core3000_0025: {
    DE: ["aber", "Ich bin müde, aber glücklich."],
    IT: ["ma", "Sono stanco, ma sono felice."],
    PT: ["mas", "Estou cansado, mas estou feliz."],
  },
  core3000_0026: {
    DE: ["aus; von", "Ich komme aus Kanada."],
    IT: ["da; di", "Vengo dal Canada."],
    PT: ["de", "Sou do Canadá."],
  },
  core3000_0027: {
    DE: ["bei; neben", "Die Tasche steht neben der Tür."],
    IT: ["accanto a; presso", "La borsa è vicino alla porta."],
    PT: ["junto a; por", "A mala está junto à porta."],
  },
  core3000_0028: {
    DE: ["werden", "Ich werde dich anrufen."],
    IT: ["futuro con -rò/-rà", "Ti chiamerò."],
    PT: ["futuro com vou + infinitivo", "Vou telefonar-te."],
  },
  core3000_0029: {
    DE: ["oder", "Tee oder Kaffee ist in Ordnung."],
    IT: ["o; oppure", "Tè o caffè va bene."],
    PT: ["ou", "Chá ou café, qualquer um serve."],
  },
  core3000_0030: {
    DE: ["sagen; nennen", "Bitte nenn deinen Namen."],
    IT: ["dire", "Per favore, di' il tuo nome."],
    PT: ["dizer", "Por favor, diz-me o teu nome."],
  },
  core3000_0031: {
    DE: ["gehen; fahren", "Ich gehe nach der Schule nach Hause."],
    IT: ["andare", "Vado a casa dopo la scuola."],
    PT: ["ir", "Vou para casa depois da escola."],
  },
  core3000_0032: {
    DE: ["also; deshalb", "Es ist spät, also gehe ich nach Hause."],
    IT: ["quindi; così", "È tardi, quindi torno a casa."],
    PT: ["por isso; então", "É tarde, por isso vou para casa."],
  },
  core3000_0033: {
    DE: ["alle", "Alle Schüler sind hier."],
    IT: ["tutti; tutte", "Tutti gli studenti sono qui."],
    PT: ["todos; todas", "Todos os alunos estão aqui."],
  },
  core3000_0034: {
    DE: ["dort", "Stell die Tasche dort hin."],
    IT: ["là", "Metti la borsa là."],
    PT: ["ali", "Põe a mala ali."],
  },
  core3000_0035: {
    DE: ["wissen; kennen", "Ich kenne die Antwort."],
    IT: ["sapere; conoscere", "So la risposta."],
    PT: ["saber; conhecer", "Sei a resposta."],
  },
  core3000_0036: {
    DE: ["bekommen; holen", "Ich bekomme heute ein neues Buch."],
    IT: ["ricevere; prendere", "Oggi ricevo un libro nuovo."],
    PT: ["receber; conseguir", "Hoje recebo um livro novo."],
  },
  core3000_0037: {
    DE: ["denken; glauben", "Ich glaube, das ist richtig."],
    IT: ["pensare", "Penso che sia giusto."],
    PT: ["pensar; achar", "Acho que isto está certo."],
  },
  core3000_0038: {
    DE: ["machen", "Ich mache das Mittagessen zu Hause."],
    IT: ["fare; preparare", "Preparo il pranzo a casa."],
    PT: ["fazer; preparar", "Faço o almoço em casa."],
  },
  core3000_0039: {
    DE: ["die Zeit", "Zeit ist wichtig."],
    IT: ["il tempo", "Il tempo è importante."],
    PT: ["o tempo", "O tempo é importante."],
  },
  core3000_0040: {
    DE: ["sehen", "Ich sehe das Haus."],
    IT: ["vedere", "Vedo la casa."],
    PT: ["ver", "Vejo a casa."],
  },
  core3000_0041: {
    DE: ["hinaus; draußen", "Bitte geh jetzt hinaus."],
    IT: ["fuori", "Esci adesso, per favore."],
    PT: ["fora", "Por favor, sai agora."],
  },
  core3000_0042: {
    DE: ["gut", "Das ist ein guter Tag."],
    IT: ["buono; bello", "È una bella giornata."],
    PT: ["bom; boa", "Este é um bom dia."],
  },
  core3000_0043: {
    DE: ["die Leute; Menschen", "Viele Leute sind hier."],
    IT: ["le persone", "Ci sono molte persone qui."],
    PT: ["as pessoas", "Há muitas pessoas aqui."],
  },
  core3000_0044: {
    DE: ["das Jahr", "Ein Jahr hat zwölf Monate."],
    IT: ["l'anno", "Un anno ha dodici mesi."],
    PT: ["o ano", "Um ano tem doze meses."],
  },
  core3000_0045: {
    DE: ["nehmen", "Bitte nimm diese Tasche."],
    IT: ["prendere", "Per favore, prendi questa borsa."],
    PT: ["levar; pegar", "Por favor, pega nesta mala."],
  },
  core3000_0046: {
    DE: ["gut", "Sie liest gut."],
    IT: ["bene", "Lei legge bene."],
    PT: ["bem", "Ela lê bem."],
  },
  core3000_0047: {
    DE: ["sehr", "Dieses Zimmer ist sehr klein."],
    IT: ["molto", "Questa stanza è molto piccola."],
    PT: ["muito", "Este quarto é muito pequeno."],
  },
  core3000_0048: {
    DE: ["nur; gerade", "Ich brauche nur Wasser."],
    IT: ["solo; appena", "Ho solo bisogno d'acqua."],
    PT: ["só; apenas", "Só preciso de água."],
  },
  core3000_0049: {
    DE: ["kommen", "Bitte komm her."],
    IT: ["venire", "Vieni qui, per favore."],
    PT: ["vir", "Por favor, vem aqui."],
  },
  core3000_0050: {
    DE: ["arbeiten", "Ich arbeite in einer Schule."],
    IT: ["lavorare", "Lavoro in una scuola."],
    PT: ["trabalhar", "Trabalho numa escola."],
  },
  core3000_0051: {
    DE: ["benutzen; verwenden", "Ich benutze dieses Handy jeden Tag."],
    IT: ["usare", "Uso questo telefono ogni giorno."],
    PT: ["usar", "Uso este telemóvel todos os dias."],
  },
  core3000_0052: {
    DE: ["dann", "Frühstücke, dann geh zur Schule."],
    IT: ["poi; allora", "Fai colazione, poi vai a scuola."],
    PT: ["depois; então", "Toma o pequeno-almoço, depois vai para a escola."],
  },
  core3000_0053: {
    DE: ["auch", "Ich spreche auch Englisch."],
    IT: ["anche", "Parlo anche inglese."],
    PT: ["também", "Também falo inglês."],
  },
  core3000_0054: {
    DE: ["nur", "Ich habe nur einen Stift."],
    IT: ["solo", "Ho solo una penna."],
    PT: ["só; apenas", "Só tenho uma caneta."],
  },
  core3000_0055: {
    DE: ["schauen; ansehen", "Schau auf die Tafel."],
    IT: ["guardare", "Guarda la lavagna."],
    PT: ["olhar", "Olha para o quadro."],
  },
  core3000_0056: {
    DE: ["wollen; möchten", "Ich möchte ein neues Buch."],
    IT: ["volere", "Voglio un libro nuovo."],
    PT: ["querer", "Quero um livro novo."],
  },
  core3000_0057: {
    DE: ["geben", "Bitte gib mir den Stift."],
    IT: ["dare", "Per favore, dammi la penna."],
    PT: ["dar", "Por favor, dá-me a caneta."],
  },
  core3000_0058: {
    DE: ["erste; erster; erstes", "Das ist mein erster Tag."],
    IT: ["primo; prima", "È il mio primo giorno."],
    PT: ["primeiro; primeira", "Este é o meu primeiro dia."],
  },
  core3000_0059: {
    DE: ["neu", "Ich habe ein neues Handy."],
    IT: ["nuovo; nuova", "Ho un telefono nuovo."],
    PT: ["novo; nova", "Tenho um telemóvel novo."],
  },
  core3000_0060: {
    DE: ["der Weg; die Art", "Das ist eine gute Art zu lernen."],
    IT: ["il modo", "Questo è un buon modo per imparare."],
    PT: ["a maneira; o caminho", "Esta é uma boa maneira de aprender."],
  },
  core3000_0061: {
    DE: ["finden", "Ich finde meine Schlüssel auf dem Tisch."],
    IT: ["trovare", "Trovo le chiavi sul tavolo."],
    PT: ["encontrar", "Encontro as minhas chaves na mesa."],
  },
  core3000_0062: {
    DE: ["der Tag", "Ein Tag kann sehr voll sein."],
    IT: ["il giorno", "Una giornata può essere molto impegnativa."],
    PT: ["o dia", "Um dia pode ser muito cheio."],
  },
  core3000_0063: {
    DE: ["die Sache; das Ding", "Diese Sache ist nützlich."],
    IT: ["la cosa", "Questa cosa è utile."],
    PT: ["a coisa", "Esta coisa é útil."],
  },
  core3000_0064: {
    DE: ["richtig", "Deine Antwort ist richtig."],
    IT: ["giusto; corretto", "La tua risposta è giusta."],
    PT: ["certo; correto", "A tua resposta está certa."],
  },
  core3000_0065: {
    DE: ["wie", "Wie schreibt man deinen Namen?"],
    IT: ["come", "Come si scrive il tuo nome?"],
    PT: ["como", "Como se escreve o teu nome?"],
  },
  core3000_0066: {
    DE: ["zurück", "Bitte komm bald zurück."],
    IT: ["indietro; di ritorno", "Torna presto, per favore."],
    PT: ["de volta; para trás", "Por favor, volta em breve."],
  },
  core3000_0067: {
    DE: ["bedeuten", "Was bedeutet dieses Wort?"],
    IT: ["significare", "Che cosa significa questa parola?"],
    PT: ["significar", "O que significa esta palavra?"],
  },
  core3000_0068: {
    DE: ["sogar", "Sogar ein Kind kann das tun."],
    IT: ["persino; anche", "Anche un bambino può farlo."],
    PT: ["até; mesmo", "Até uma criança consegue fazer isto."],
  },
  core3000_0069: {
    DE: ["hier", "Bitte setz dich hier."],
    IT: ["qui", "Siediti qui, per favore."],
    PT: ["aqui", "Por favor, senta-te aqui."],
  },
  core3000_0070: {
    DE: ["das Kind", "Ein Kind spielt draußen."],
    IT: ["il bambino; la bambina", "Un bambino gioca fuori."],
    PT: ["a criança", "Uma criança está a brincar lá fora."],
  },
  core3000_0071: {
    DE: ["erzählen; sagen", "Bitte sag mir deinen Namen."],
    IT: ["dire; raccontare", "Per favore, dimmi il tuo nome."],
    PT: ["dizer; contar", "Por favor, diz-me o teu nome."],
  },
  core3000_0072: {
    DE: ["wirklich", "Ich mag dieses Buch wirklich."],
    IT: ["davvero", "Questo libro mi piace davvero."],
    PT: ["realmente; mesmo", "Gosto mesmo deste livro."],
  },
  core3000_0073: {
    DE: ["anrufen; nennen", "Ich rufe meine Mutter jeden Tag an."],
    IT: ["chiamare", "Chiamo mia madre ogni giorno."],
    PT: ["telefonar; ligar", "Ligo à minha mãe todos os dias."],
  },
  core3000_0074: {
    DE: ["das Unternehmen; die Firma", "Eine Firma verkauft diese Handys."],
    IT: ["l'azienda; la società", "Un'azienda vende questi telefoni."],
    PT: ["a empresa", "Uma empresa vende estes telemóveis."],
  },
  core3000_0075: {
    DE: ["zeigen", "Bitte zeig mir die Karte."],
    IT: ["mostrare", "Per favore, mostrami la mappa."],
    PT: ["mostrar", "Por favor, mostra-me o mapa."],
  },
  core3000_0076: {
    DE: ["das Leben", "Das Leben ist hier anders."],
    IT: ["la vita", "La vita qui è diversa."],
    PT: ["a vida", "A vida aqui é diferente."],
  },
  core3000_0077: {
    DE: ["der Mann", "Ein Mann wartet draußen."],
    IT: ["l'uomo", "Un uomo aspetta fuori."],
    PT: ["o homem", "Um homem está à espera lá fora."],
  },
  core3000_0078: {
    DE: ["sich ändern; ändern", "Pläne ändern sich schnell."],
    IT: ["cambiare", "I piani cambiano rapidamente."],
    PT: ["mudar; alterar", "Os planos mudam rapidamente."],
  },
  core3000_0079: {
    DE: ["der Ort; der Platz", "Dieser Ort ist ruhig."],
    IT: ["il posto; il luogo", "Questo posto è tranquillo."],
    PT: ["o lugar", "Este lugar é sossegado."],
  },
  core3000_0080: {
    DE: ["lang", "Das ist eine lange Straße."],
    IT: ["lungo; lunga", "Questa è una strada lunga."],
    PT: ["comprido; longo", "Esta é uma estrada comprida."],
  },
  core3000_0081: {
    DE: ["sich fühlen", "Ich fühle mich heute glücklich."],
    IT: ["sentirsi", "Oggi mi sento felice."],
    PT: ["sentir-se", "Hoje sinto-me feliz."],
  },
  core3000_0082: {
    DE: ["zu", "Diese Tasche ist zu schwer."],
    IT: ["troppo", "Questa borsa è troppo pesante."],
    PT: ["demasiado", "Esta mala é demasiado pesada."],
  },
  core3000_0083: {
    DE: ["immer noch", "Ich wohne immer noch hier."],
    IT: ["ancora", "Vivo ancora qui."],
    PT: ["ainda", "Ainda vivo aqui."],
  },
  core3000_0084: {
    DE: ["das Problem", "Das ist ein kleines Problem."],
    IT: ["il problema", "Questo è un piccolo problema."],
    PT: ["o problema", "Isto é um pequeno problema."],
  },
  core3000_0085: {
    DE: ["schreiben", "Bitte schreib deinen Namen."],
    IT: ["scrivere", "Per favore, scrivi il tuo nome."],
    PT: ["escrever", "Por favor, escreve o teu nome."],
  },
  core3000_0086: {
    DE: ["großartig; toll", "Das ist eine tolle Idee."],
    IT: ["ottimo; grande", "È un'ottima idea."],
    PT: ["ótimo; excelente", "É uma ótima ideia."],
  },
  core3000_0087: {
    DE: ["versuchen", "Ich versuche, jeden Tag zu lernen."],
    IT: ["provare; cercare", "Cerco di imparare ogni giorno."],
    PT: ["tentar", "Tento aprender todos os dias."],
  },
  core3000_0088: {
    DE: ["losgehen; verlassen", "Wir gehen um acht los."],
    IT: ["partire; lasciare", "Partiamo alle otto."],
    PT: ["sair; partir", "Saímos às oito."],
  },
  core3000_0089: {
    DE: ["die Zahl; die Nummer", "Schreib die Zahl hier."],
    IT: ["il numero", "Scrivi il numero qui."],
    PT: ["o número", "Escreve o número aqui."],
  },
  core3000_0090: {
    DE: ["der Teil", "Dieser Teil ist wichtig."],
    IT: ["la parte", "Questa parte è importante."],
    PT: ["a parte", "Esta parte é importante."],
  },
  core3000_0091: {
    DE: ["der Punkt", "Dieser Punkt ist klar."],
    IT: ["il punto", "Questo punto è chiaro."],
    PT: ["o ponto", "Este ponto é claro."],
  },
  core3000_0092: {
    DE: ["helfen", "Ich helfe meinem Freund."],
    IT: ["aiutare", "Aiuto il mio amico."],
    PT: ["ajudar", "Ajudo o meu amigo."],
  },
  core3000_0093: {
    DE: ["fragen; bitten", "Bitte stell eine Frage."],
    IT: ["chiedere; domandare", "Per favore, fai una domanda."],
    PT: ["perguntar; pedir", "Por favor, faz uma pergunta."],
  },
  core3000_0094: {
    DE: ["treffen", "Wir treffen uns in der Schule."],
    IT: ["incontrare", "Ci incontriamo a scuola."],
    PT: ["encontrar-se", "Encontramo-nos na escola."],
  },
  core3000_0095: {
    DE: ["beginnen; anfangen", "Der Unterricht beginnt um neun."],
    IT: ["iniziare; cominciare", "Le lezioni iniziano alle nove."],
    PT: ["começar", "As aulas começam às nove."],
  },
  core3000_0096: {
    DE: ["sprechen; reden", "Ich spreche mit meinem Lehrer."],
    IT: ["parlare", "Parlo con il mio insegnante."],
    PT: ["falar", "Falo com o meu professor."],
  },
  core3000_0097: {
    DE: ["legen; stellen", "Leg das Buch auf den Tisch."],
    IT: ["mettere", "Metti il libro sul tavolo."],
    PT: ["pôr; colocar", "Põe o livro na mesa."],
  },
  core3000_0098: {
    DE: ["werden", "Ich möchte Lehrer werden."],
    IT: ["diventare", "Voglio diventare insegnante."],
    PT: ["tornar-se; vir a ser", "Quero ser professor."],
  },
  core3000_0099: {
    DE: ["das Interesse", "Sie zeigt Interesse an Musik."],
    IT: ["l'interesse", "Lei mostra interesse per la musica."],
    PT: ["o interesse", "Ela mostra interesse por música."],
  },
  core3000_0100: {
    DE: ["das Land", "Kanada ist ein großes Land."],
    IT: ["il paese", "Il Canada è un paese grande."],
    PT: ["o país", "O Canadá é um país grande."],
  },
  core3000_0101: {
    DE: ["alt", "Das ist ein altes Haus."],
    IT: ["vecchio; antico", "È una casa vecchia."],
    PT: ["velho; antigo", "É uma casa antiga."],
  },
  core3000_0102: {
    DE: ["die Schule", "In der Nähe meines Hauses gibt es eine Schule."],
    IT: ["la scuola", "C'è una scuola vicino a casa mia."],
    PT: ["a escola", "Há uma escola perto da minha casa."],
  },
  core3000_0103: {
    DE: ["spät; verspätet", "Ich komme zu spät zum Unterricht."],
    IT: ["in ritardo; tardi", "Sono in ritardo per la lezione."],
    PT: ["atrasado; tarde", "Estou atrasado para a aula."],
  },
  core3000_0104: {
    DE: ["hoch", "Die Wand ist hoch."],
    IT: ["alto; alta", "Il muro è alto."],
    PT: ["alto; alta", "A parede é alta."],
  },
  core3000_0105: {
    DE: ["anders; unterschiedlich", "Diese beiden Bücher sind unterschiedlich."],
    IT: ["diverso; diversa", "Questi due libri sono diversi."],
    PT: ["diferente", "Estes dois livros são diferentes."],
  },
  core3000_0106: {
    DE: ["das Ende", "Das Ende der Geschichte ist traurig."],
    IT: ["la fine", "La fine della storia è triste."],
    PT: ["o fim", "O fim da história é triste."],
  },
  core3000_0107: {
    DE: ["leben; wohnen", "Ich wohne in einer kleinen Stadt."],
    IT: ["vivere; abitare", "Vivo in una piccola città."],
    PT: ["viver; morar", "Vivo numa cidade pequena."],
  },
  core3000_0108: {
    DE: ["warum", "Warum bist du hier?"],
    IT: ["perché", "Perché sei qui?"],
    PT: ["porquê; porque", "Porque é que estás aqui?"],
  },
  core3000_0109: {
    DE: ["die Welt", "Menschen leben überall auf der Welt."],
    IT: ["il mondo", "Le persone vivono in tutto il mondo."],
    PT: ["o mundo", "As pessoas vivem em todo o mundo."],
  },
  core3000_0110: {
    DE: ["die Woche", "Eine Woche hat sieben Tage."],
    IT: ["la settimana", "Una settimana ha sette giorni."],
    PT: ["a semana", "Uma semana tem sete dias."],
  },
  core3000_0111: {
    DE: ["spielen", "Kinder spielen im Park."],
    IT: ["giocare; suonare", "I bambini giocano nel parco."],
    PT: ["brincar; jogar", "As crianças brincam no parque."],
  },
  core3000_0112: {
    DE: ["nach Hause; zu Hause", "Ich gehe nach der Arbeit nach Hause."],
    IT: ["a casa", "Vado a casa dopo il lavoro."],
    PT: ["para casa; em casa", "Vou para casa depois do trabalho."],
  },
  core3000_0113: {
    DE: ["nie; niemals", "Ich esse nie Fleisch."],
    IT: ["mai", "Non mangio mai carne."],
    PT: ["nunca", "Nunca como carne."],
  },
  core3000_0114: {
    DE: ["einschließen; enthalten", "In diesem Preis kann Frühstück enthalten sein."],
    IT: ["includere", "Questo prezzo può includere la colazione."],
    PT: ["incluir", "Este preço pode incluir o pequeno-almoço."],
  },
  core3000_0115: {
    DE: ["der Kurs", "Dieser Kurs beginnt heute."],
    IT: ["il corso", "Questo corso inizia oggi."],
    PT: ["o curso", "Este curso começa hoje."],
  },
  core3000_0116: {
    DE: ["das Haus", "In der Nähe der Schule steht ein Haus."],
    IT: ["la casa", "C'è una casa vicino alla scuola."],
    PT: ["a casa", "Há uma casa perto da escola."],
  },
  core3000_0117: {
    DE: ["der Bericht", "Der Bericht ist kurz."],
    IT: ["il rapporto; la relazione", "La relazione è breve."],
    PT: ["o relatório", "O relatório é curto."],
  },
  core3000_0118: {
    DE: ["die Gruppe", "Eine Gruppe von Schülern wartet."],
    IT: ["il gruppo", "Un gruppo di studenti aspetta."],
    PT: ["o grupo", "Um grupo de alunos está à espera."],
  },
  core3000_0119: {
    DE: ["der Fall", "Dieser Fall ist anders."],
    IT: ["il caso", "Questo caso è diverso."],
    PT: ["o caso", "Este caso é diferente."],
  },
  core3000_0120: {
    DE: ["die Frau", "Eine Frau wartet draußen."],
    IT: ["la donna", "Una donna aspetta fuori."],
    PT: ["a mulher", "Uma mulher está à espera lá fora."],
  },
  core3000_0121: {
    DE: ["das Buch", "Dieses Buch ist neu."],
    IT: ["il libro", "Questo libro è nuovo."],
    PT: ["o livro", "Este livro é novo."],
  },
  core3000_0122: {
    DE: ["die Familie", "Meine Familie ist zu Hause."],
    IT: ["la famiglia", "La mia famiglia è a casa."],
    PT: ["a família", "A minha família está em casa."],
  },
  core3000_0123: {
    DE: ["scheinen; wirken", "Du wirkst müde."],
    IT: ["sembrare", "Sembri stanco."],
    PT: ["parecer", "Pareces cansado."],
  },
  core3000_0124: {
    DE: ["lassen; erlauben", "Bitte lass mich helfen."],
    IT: ["lasciare; permettere", "Lascia che ti aiuti, per favore."],
    PT: ["deixar; permitir", "Por favor, deixa-me ajudar-te."],
  },
  core3000_0125: {
    DE: ["wieder; noch einmal", "Bitte sag es noch einmal."],
    IT: ["di nuovo; ancora", "Per favore, dillo di nuovo."],
    PT: ["outra vez; de novo", "Por favor, diz isso outra vez."],
  },
  core3000_0126: {
    DE: ["die Art; die Sorte", "Diese Sorte Tee ist gut."],
    IT: ["il tipo", "Questo tipo di tè è buono."],
    PT: ["o tipo; a espécie", "Este tipo de chá é bom."],
  },
  core3000_0127: {
    DE: ["behalten; lassen", "Lass dein Handy hier."],
    IT: ["tenere; lasciare", "Lascia il tuo telefono qui."],
    PT: ["guardar; deixar", "Deixa o teu telemóvel aqui."],
  },
  core3000_0128: {
    DE: ["hören", "Ich höre draußen Musik."],
    IT: ["sentire; ascoltare", "Sento musica fuori."],
    PT: ["ouvir", "Oiço música lá fora."],
  },
  core3000_0129: {
    DE: ["das System", "Dieses System ist einfach."],
    IT: ["il sistema", "Questo sistema è semplice."],
    PT: ["o sistema", "Este sistema é simples."],
  },
  core3000_0130: {
    DE: ["die Frage", "Stell jetzt eine Frage."],
    IT: ["la domanda", "Fai una domanda adesso."],
    PT: ["a pergunta", "Faz uma pergunta agora."],
  },
  core3000_0131: {
    DE: ["immer", "Sie kommt immer früh an."],
    IT: ["sempre", "Lei arriva sempre presto."],
    PT: ["sempre", "Ela chega sempre cedo."],
  },
  core3000_0132: {
    DE: ["groß", "Das ist ein großes Zimmer."],
    IT: ["grande", "È una stanza grande."],
    PT: ["grande", "Este é um quarto grande."],
  },
  core3000_0133: {
    DE: ["das Set; der Satz", "Dieses Set enthält sechs Tassen."],
    IT: ["il set; l'insieme", "Questo set ha sei tazze."],
    PT: ["o conjunto", "Este conjunto tem seis chávenas."],
  },
  core3000_0134: {
    DE: ["klein", "Das ist ein kleines Zimmer."],
    IT: ["piccolo; piccola", "È una stanza piccola."],
    PT: ["pequeno; pequena", "Este é um quarto pequeno."],
  },
  core3000_0135: {
    DE: ["lernen; studieren", "Ich lerne jeden Tag Englisch."],
    IT: ["studiare", "Studio inglese ogni giorno."],
    PT: ["estudar", "Estudo inglês todos os dias."],
  },
  core3000_0136: {
    DE: ["folgen", "Bitte folge dem Lehrer."],
    IT: ["seguire", "Segui l'insegnante, per favore."],
    PT: ["seguir", "Por favor, segue o professor."],
  },
  core3000_0137: {
    DE: ["beginnen; anfangen", "Der Unterricht kann jetzt beginnen."],
    IT: ["iniziare; cominciare", "La lezione può iniziare adesso."],
    PT: ["começar", "A aula pode começar agora."],
  },
  core3000_0138: {
    DE: ["wichtig", "Diese Frage ist wichtig."],
    IT: ["importante", "Questa domanda è importante."],
    PT: ["importante", "Esta pergunta é importante."],
  },
  core3000_0139: {
    DE: ["laufen; rennen", "Ich laufe im Park."],
    IT: ["correre", "Corro nel parco."],
    PT: ["correr", "Corro no parque."],
  },
  core3000_0140: {
    DE: ["abbiegen; drehen", "Bieg an der Tür links ab."],
    IT: ["girare; voltare", "Gira a sinistra quando arrivi alla porta."],
    PT: ["virar", "Vira à esquerda ao chegar à porta."],
  },
  core3000_0141: {
    DE: ["bringen", "Bitte bring dein Buch mit."],
    IT: ["portare", "Porta il tuo libro, per favore."],
    PT: ["trazer", "Por favor, traz o teu livro."],
  },
  core3000_0142: {
    DE: ["früh", "Wir brauchen einen frühen Start."],
    IT: ["presto; anticipato", "Dobbiamo iniziare presto."],
    PT: ["cedo; antecipado", "Precisamos de começar cedo."],
  },
  core3000_0143: {
    DE: ["die Hand", "Heb deine Hand."],
    IT: ["la mano", "Alza la mano."],
    PT: ["a mão", "Levanta a mão."],
  },
  core3000_0144: {
    DE: ["der Bundesstaat", "Kalifornien ist ein großer Bundesstaat."],
    IT: ["lo stato", "La California è un grande stato."],
    PT: ["o estado", "A Califórnia é um estado grande."],
  },
  core3000_0145: {
    DE: ["bewegen; verschieben", "Bitte schieb den Stuhl zur Seite."],
    IT: ["spostare; muovere", "Sposta la sedia, per favore."],
    PT: ["mover", "Por favor, move a cadeira."],
  },
  core3000_0146: {
    DE: ["das Geld", "Ich brauche Geld fürs Mittagessen."],
    IT: ["i soldi; il denaro", "Ho bisogno di soldi per il pranzo."],
    PT: ["o dinheiro", "Preciso de dinheiro para o almoço."],
  },
  core3000_0147: {
    DE: ["die Tatsache; der Fakt", "Diese Tatsache ist wichtig."],
    IT: ["il fatto", "Questo fatto è importante."],
    PT: ["o facto", "Este facto é importante."],
  },
  core3000_0148: {
    DE: ["jedoch; allerdings", "Es ist spät; wir können jedoch warten."],
    IT: ["tuttavia", "È tardi; tuttavia, possiamo aspettare."],
    PT: ["no entanto", "É tarde; no entanto, podemos esperar."],
  },
  core3000_0149: {
    DE: ["der Bereich; die Gegend", "Diese Gegend ist ruhig."],
    IT: ["l'area; la zona", "Questa zona è tranquilla."],
    PT: ["a área; a zona", "Esta zona é sossegada."],
  },
  core3000_0150: {
    DE: ["bereitstellen; anbieten", "Die Schule kann Mittagessen anbieten."],
    IT: ["fornire", "La scuola può fornire il pranzo."],
    PT: ["fornecer; disponibilizar", "A escola pode fornecer almoço."],
  },
};

const languages = ["DE", "IT", "PT"];

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
  if (!localized) throw new Error(`Missing DE/IT/PT translation for ${row.core_item_id}.`);
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
    translation_batch: "de_it_pt_v0",
    translation_status: "draft_native_style_qa_v2_checked",
    source_note: "Internal LunaCards draft translation layer; native-style QA v2 checked, final QA and source-assisted checks still required before delivery.",
  };
  for (const language of languages) {
    const [display, example] = localized[language] ?? [];
    out[language] = normalizeText(display);
    out[`example_${language}`] = normalizeText(example);
  }
  return out;
});

await fs.mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_de_it_pt_v0.jsonl`);
await writeJsonl(outputPath, outputRows);

const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_de_it_pt_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Translation Batch DE/IT/PT v0: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    "- Languages: DE, IT, PT",
    "- Fields: display word plus translated example only",
    "- Target-language transcription fields: not generated",
    "- Status: draft_native_style_qa_v2_checked",
    "",
    "This artifact does not import Postgres rows and does not create a Google Sheet.",
    "Function words may use learner-facing glosses where a direct one-word target equivalent is misleading.",
    "Native-style QA v1 and v2 repaired obvious naturalness/copy issues during drafting; final QA evidence is still not created.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 DE/IT/PT translation batch written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length}`
);
