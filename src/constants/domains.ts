import { DomainConfig, DomainId, LocalStudentRecord } from '../types';

export const DOMAINS: Record<DomainId, DomainConfig> = {
  ravnatelj: {
    id: 'ravnatelj',
    name: 'Ravnatelj i upravljanje',
    shortLabel: 'Ravnatelj',
    description:
      'Sjednice Nastavničkog vijeća i Školskog odbora, upravne odluke, suglasnosti MZO-a i strateški akti škole.',
    subAppTitle: 'Organizator sjednica NV/UV i paketa odluka',
    subAppDescription:
      'Sastavite dnevni red kolegijalnog tijela i izravno ga pretvorite u službeni Poziv ili Zapisnik u Wordu.',
    systemContext:
      'Djeluješ kao pravno-administrativni savjetnik ravnatelja gimnazije u Republici Hrvatskoj (Gimnazija Antuna Vrančića Šibenik). Poznaješ ovlasti ravnatelja, Školskog odbora i Nastavničkog vijeća prema Zakonu o odgoju i obrazovanju i Statutu škole.',
    quickChatPrompts: [
      'Napiši uvodni govor ravnatelja za sjednicu Nastavničkog vijeća na kraju polugodišta uz analizu uspjeha.',
      'Koji je zakonski postupak za raspisivanje natječaja za radno mjesto nastavnika uz suglasnost Školskog odbora?',
      'Koji su rokovi i uvjeti za donošenje Godišnjeg plana i programa rada škole te Školskog kurikuluma?',
    ],
    forms: [
      {
        id: 'poziv_nv',
        title: 'Poziv na sjednicu Nastavničkog / Učiteljskog vijeća',
        subtitle: 'Službeni poziv članovima vijeća s dnevnim redom i kvorumskom napomenom',
        legalBasis:
          'Članak 119. Zakona o odgoju i obrazovanju u osnovnoj i srednjoj školi i Statut Gimnazije Antuna Vrančića Šibenik',
        examplePromptHint: 'Redovna sjednica na kraju nastavne godine ili polugodišta',
        fields: [
          {
            id: 'vrstaVijeca',
            label: 'Kolegijalno tijelo',
            placeholder: 'Odaberite tijelo',
            type: 'select',
            options: [
              'Nastavničko vijeće',
              'Učiteljsko vijeće',
              'Izvanredna sjednica Vijeća',
            ],
            defaultValue: 'Nastavničko vijeće',
            required: true,
          },
          {
            id: 'terminIMjesto',
            label: 'Termin i mjesto održavanja',
            placeholder: 'npr. 25. studenoga 2026. u 13:15 sati, zbornica škole',
            type: 'text',
            required: true,
          },
          {
            id: 'tockeDnevnogReda',
            label: 'Točke dnevnog reda',
            placeholder: '1. Usvajanje zapisnika...\n2. Analiza odgojno-obrazovnih postignuća...',
            type: 'textarea',
            required: true,
          },
        ],
      },
      {
        id: 'odluka_ravnatelja',
        title: 'Odluka ravnatelja (upravni / organizacijski akt)',
        subtitle: 'Opća odluka s KLASA/URBROJ oznakom, obrazloženjem i potpisom',
        legalBasis:
          'Članak 125. Zakona o odgoju i obrazovanju u osnovnoj i srednjoj školi (NN 87/08 – pročišćeni tekst)',
        examplePromptHint: 'Odluka o organizaciji nastave, povjerenstvu ili radnom vremenu',
        fields: [
          {
            id: 'predmetOdluke',
            label: 'Predmet odluke',
            placeholder: 'npr. Odluka o imenovanju Povjerenstva za provedbu državne mature',
            type: 'text',
            required: true,
          },
          {
            id: 'sadrzajOdluke',
            label: 'Ključne točke izreke i rokovi',
            placeholder: 'Navedite zadatke, osobe po funkciji i rokove izvršenja...',
            type: 'textarea',
            required: true,
          },
        ],
      },
      {
        id: 'zahtjev_mzom',
        title: 'Dopis / Zahtjev osnivaču ili MZOM-u',
        subtitle: 'Službeni podnesak prema Županiji ili Ministarstvu znanosti, obrazovanja i mladih',
        legalBasis:
          'Zakon o odgoju i obrazovanju u osnovnoj i srednjoj školi i Uredba o uredskom poslovanju',
        examplePromptHint: 'Zahtjev za suglasnost za zapošljavanje ili kapitalno ulaganje',
        fields: [
          {
            id: 'primatelj',
            label: 'Naslovnik (tijelo)',
            placeholder: 'npr. Šibensko-kninska županija / Ministarstvo znanosti, obrazovanja i mladih',
            type: 'text',
            required: true,
          },
          {
            id: 'obrazlozenjeZahtjeva',
            label: 'Predmet i obrazloženje zahtjeva',
            placeholder: 'Opišite potrebu, zakonsku osnovu i financijski učinak...',
            type: 'textarea',
            required: true,
          },
        ],
      },
    ],
    regulations: [
      {
        id: 'reg-zooos',
        title: 'Zakon o odgoju i obrazovanju u osnovnoj i srednjoj školi',
        shortName: 'ZOOOSŠ',
        nnReference: 'NN 87/08, 86/09, 92/10, 105/10, 90/11, 5/12, 16/12, 86/12, 126/12, 94/13, 152/14, 07/17, 68/18, 98/19, 64/20, 151/22, 155/23, 156/23',
        category: 'Temeljni zakon',
        summary:
          'Uređuje djelatnost osnovnog i srednjeg školstva, ovlasti ravnatelja, Školskog odbora i Nastavničkog vijeća, zapošljavanje, pedagoške mjere i donošenje školskih dokumenata.',
        keyArticles: [
          'Čl. 28. – Godišnji plan i program rada škole i Školski kurikulum',
          'Čl. 107. – Zasnivanje radnog odnosa i natječajni postupak',
          'Čl. 118.–119. – Školski odbor i stručna tijela škole',
          'Čl. 125. – Položaj, izbor i ovlasti ravnatelja',
        ],
        protectedReadOnly: true,
      },
      {
        id: 'reg-uredsko',
        title: 'Uredba o uredskom poslovanju',
        shortName: 'Uredsko poslovanje',
        nnReference: 'NN 75/21',
        category: 'Upravno poslovanje',
        summary:
          'Propisuje oblikovanje službenih akata, dodjelu KLASA i URBROJ oznaka, zaprimanje podnesaka i vođenje pismohrane u javnim ustanovama.',
        keyArticles: [
          'Čl. 14.–19. – Sastavni dijelovi službenog akta (zaglavlje, KLASA, URBROJ)',
          'Čl. 45. – Otprema i elektronička dostava akata',
        ],
        protectedReadOnly: true,
      },
    ],
  },

  tajnistvo_racunovodstvo: {
    id: 'tajnistvo_racunovodstvo',
    name: 'Tajništvo i računovodstvo',
    shortLabel: 'Tajništvo',
    description:
      'Radni odnosi, kalkulator staža i jubilarnih nagrada, ugovori o radu, financijski planovi i javna nabava.',
    subAppTitle: 'Kalkulator radnog staža i jubilarnih nagrada',
    subAppDescription:
      'Izračunajte ukupni radni staž prema 30/360 metodi, provjerite jubilarne obljetnice i otvorite financijske obrasce.',
    systemContext:
      'Djeluješ kao iskusni tajnik i voditelj računovodstva srednje škole u Republici Hrvatskoj. Primjenjuješ Zakon o radu, Temeljni kolektivni ugovor za javne službe, Granski kolektivni ugovor za srednjoškolske ustanove i propise o proračunskom računovodstvu.',
    quickChatPrompts: [
      'Koji su uvjeti i iznosi za isplatu jubilarne nagrade za 20 godina staža u javnim službama?',
      'Kako se računa otkazni rok i godišnji odmor kod ugovora na određeno do povratka radnika s bolovanja?',
      'Sastavi nacrt obrazloženja rebalansa financijskog plana škole za Školski odbor.',
    ],
    forms: [
      {
        id: 'izvjesce_financijski_plan',
        title: 'Izvješće o izvršenju financijskog plana škole',
        subtitle: 'Tromjesečno ili polugodišnje izvješće za Školski odbor i osnivača',
        legalBasis:
          'Zakon o proračunu (NN 144/21) i Zakon o fiskalnoj odgovornosti (NN 111/18, 83/23)',
        examplePromptHint: 'Izvješće o prihodima i rashodima za razdoblje 1.1.–30.9.',
        fields: [
          {
            id: 'razdobljeIzvjesca',
            label: 'Izvještajno razdoblje',
            placeholder: 'npr. 1. siječnja – 30. rujna 2026.',
            type: 'text',
            required: true,
          },
          {
            id: 'kljucniBrojevi',
            label: 'Ključni pokazatelji prihoda i rashoda',
            placeholder: 'Navedite planirane i ostvarene prihode, rashode za zaposlene i materijalne troškove...',
            type: 'textarea',
            required: true,
          },
        ],
      },
      {
        id: 'ugovor_o_radu',
        title: 'Nacrt Ugovora o radu (određeno / neodređeno)',
        subtitle: 'Predložak ugovora s uglatim oznakama za osobne podatke djelatnika',
        legalBasis:
          'Članak 15. Zakona o radu (NN 93/14 – pročišćeni tekst) i čl. 107. ZOOOSŠ-a',
        examplePromptHint: 'Ugovor za nastavnika na određeno puno radno vrijeme do povratka djelatnice',
        fields: [
          {
            id: 'radnoMjesto',
            label: 'Naziv radnog mjesta i predmet',
            placeholder: 'npr. Nastavnik/ca matematike (20 sati nastave tjedno)',
            type: 'text',
            required: true,
          },
          {
            id: 'vrstaUgovora',
            label: 'Vrsta radnog odnosa',
            placeholder: 'Odaberite vrstu radnog odnosa',
            type: 'select',
            options: [
              'Na neodređeno vrijeme (puno radno vrijeme)',
              'Na određeno vrijeme – zamjena do povratka radnika',
              'Na određeno vrijeme – do 60 dana (čl. 107. st. 11. ZOOOSŠ)',
              'Nepuno radno vrijeme',
            ],
            defaultValue: 'Na određeno vrijeme – zamjena do povratka radnika',
            required: true,
          },
          {
            id: 'dodatneOdredbe',
            label: 'Datum početka i posebne napomene',
            placeholder: 'npr. Početak rada 1. prosinca 2026., probni rad 6 mjeseci...',
            type: 'textarea',
          },
        ],
      },
      {
        id: 'rjesenje_jubilarna',
        title: 'Odluka o isplati jubilarne nagrade',
        subtitle: 'Akt za priznavanje prava na jubilarnu nagradu prema TKU-u',
        legalBasis:
          'Temeljni kolektivni ugovor za službenike i namještenike u javnim službama',
        examplePromptHint: 'Jubilarna nagrada za 15 ili 20 godina radnog staža u javnim službama',
        fields: [
          {
            id: 'obljetnicaGodine',
            label: 'Navršene godine staža',
            placeholder: 'Odaberite jubilarnu obljetnicu',
            type: 'select',
            options: ['5 godina', '10 godina', '15 godina', '20 godina', '25 godina', '30 godina', '35 godina', '40 godina'],
            defaultValue: '20 godina',
            required: true,
          },
          {
            id: 'obrazlozenjeStaza',
            label: 'Podatci o ostvarenom stažu (bez osobnih podataka ako unosite općenito)',
            placeholder: 'npr. Neprekidni staž u javnim službama zaključno s 30. studenoga 2026.',
            type: 'textarea',
            required: true,
          },
        ],
      },
    ],
    regulations: [
      {
        id: 'reg-zor',
        title: 'Zakon o radu',
        shortName: 'ZOR',
        nnReference: 'NN 93/14, 127/17, 98/19, 151/22, 64/23',
        category: 'Radni odnosi',
        summary:
          'Temeljni propis o sklapanju ugovora o radu, radnom vremenu, odmorima, dopustima, otkaznim rokovima i zaštiti dostojanstva radnika.',
        keyArticles: [
          'Čl. 12.–15. – Sadržaj ugovora o radu na neodređeno i određeno vrijeme',
          'Čl. 77.–85. – Godišnji odmori i plaćeni dopust',
          'Čl. 122. – Trajanje otkaznog roka',
        ],
        protectedReadOnly: true,
      },
      {
        id: 'reg-tku',
        title: 'Temeljni kolektivni ugovor i GKU za srednjoškolske ustanove',
        shortName: 'TKU / GKU',
        nnReference: 'NN 29/24, 51/18, 126/22',
        category: 'Plaće i materijalna prava',
        summary:
          'Uređuje koeficijente, dodatke za radni staž, jubilarne nagrade, naknade troškova prijevoza, regres, božićnicu i sistematske preglede.',
        keyArticles: [
          'Jubilarne nagrade za 5, 10, 15, 20, 25, 30, 35, 40 i 45 godina staža',
          'Uvjeti za naknadu prijevoza i dnevnice na terenskoj nastavi',
        ],
        protectedReadOnly: true,
      },
    ],
  },

  strucni_suradnici: {
    id: 'strucni_suradnici',
    name: 'Stručni suradnici (pedagog / psiholog / knjižničar)',
    shortLabel: 'Stručna služba',
    description:
      'Pedagoške mjere, zapisnici s roditeljskih i stručnih razgovora, analize uspjeha i prezentacije za vijeća.',
    subAppTitle: 'Analiza uspjeha učenika i generator PPTX prezentacija',
    subAppDescription:
      'Pregledajte zbrojne grafikone uspjeha i izostanaka iz Lokalnog trezora te jednim klikom generirajte .pptx prezentaciju za sjednice.',
    systemContext:
      'Djeluješ kao stručni suradnik pedagog/psiholog u hrvatskoj gimnaziji. Poznaješ Pravilnik o kriterijima za izricanje pedagoških mjera, postupke rane intervencije, profesionalnog usmjeravanja i GDPR pravila zaštite privatnosti učenika.',
    quickChatPrompts: [
      'Sažmi postupak i rokove za izricanje pedagoške mjere opomene i ukora u srednjoj školi.',
      'Pripremi nacrt izvješća stručne službe o izostancima i uspjehu učenika na polugodištu.',
      'Koje preventivne aktivnosti možemo uvrstiti u školski preventivni program za gimnazijalce?',
    ],
    forms: [
      {
        id: 'pedagoska_mjera_opomena',
        title: 'Prijedlog / Obavijest o pedagoškoj mjeri',
        subtitle: 'Formalni akt uz mogućnost lokalnog spajanja podataka iz trezora',
        legalBasis:
          'Pravilnik o kriterijima za izricanje pedagoških mjera (NN 94/15, 3/17) i čl. 84. ZOOOSŠ-a',
        supportsLocalStudentMerge: true,
        examplePromptHint: 'Opomena razrednika ili ukor Razrednog vijeća zbog neopravdanih izostanaka',
        fields: [
          {
            id: 'vrstaMjere',
            label: 'Pedagoška mjera',
            placeholder: 'Odaberite pedagošku mjeru',
            type: 'select',
            options: [
              'Opomena (izriče razrednik)',
              'Ukor (izriče Razredno vijeće)',
              'Opomena pred isključenje (izriče Nastavničko vijeće)',
            ],
            defaultValue: 'Opomena (izriče razrednik)',
            required: true,
          },
          {
            id: 'cinjenicniOpis',
            label: 'Činjenični opis povrede / izostanaka',
            placeholder: 'Navedite okolnosti bez upisivanja imena učenika (upisujete ih lokalno)...',
            type: 'textarea',
            required: true,
          },
        ],
      },
      {
        id: 'individualni_razgovor_roditelj',
        title: 'Zapisnik savjetodavnog razgovora s roditeljem i učenikom',
        subtitle: 'Dokumentiranje preventivne podrške i dogovorenih koraka',
        legalBasis:
          'Članak 84. i 135. Zakona o odgoju i obrazovanju u osnovnoj i srednjoj školi',
        supportsLocalStudentMerge: true,
        examplePromptHint: 'Dogovor o praćenju izostanaka i podršci u učenju',
        fields: [
          {
            id: 'povodRazgovora',
            label: 'Povod razgovora',
            placeholder: 'npr. Povećan broj izostanaka i pad motivacije u prvom polugodištu',
            type: 'text',
            required: true,
          },
          {
            id: 'dogovoreniKoraci',
            label: 'Zaključci i planirane mjere podrške',
            placeholder: 'Navedite dogovorene aktivnosti škole, učenika i roditelja te rok praćenja...',
            type: 'textarea',
            required: true,
          },
        ],
      },
      {
        id: 'izvjesce_strucne_sluzbe',
        title: 'Izvješće stručne službe za Nastavničko vijeće',
        subtitle: 'Godišnje ili polugodišnje zbrojno izvješće bez osobnih podataka',
        legalBasis:
          'Godišnji plan i program rada škole i Pravilnik o tjednim radnim obvezama učitelja i stručnih suradnika',
        examplePromptHint: 'Izvješće o preventivnim programima, savjetodavnom radu i upisima',
        fields: [
          {
            id: 'podrucjeRada',
            label: 'Obuhvaćeno razdoblje i područja rada',
            placeholder: 'npr. Prvo polugodište 2026./2027. – savjetodavni rad, prevencija i profesionalno informiranje',
            type: 'text',
            required: true,
          },
          {
            id: 'kljucniNalazi',
            label: 'Zbrojni pokazatelji i preporuke',
            placeholder: 'Unesite zbrojne podatke i glavne preporuke za nastavnike...',
            type: 'textarea',
            required: true,
          },
        ],
      },
    ],
    regulations: [
      {
        id: 'reg-ped-mjere',
        title: 'Pravilnik o kriterijima za izricanje pedagoških mjera',
        shortName: 'Pedagoške mjere',
        nnReference: 'NN 94/15, 3/17',
        category: 'Učenici i odgoj',
        summary:
          'Definira lakše, teže, teške i osobito teške neprihvatljive oblike ponašanja, pragove neopravdanih sati i obvezu savjetodavnog rada prije izricanja mjere.',
        keyArticles: [
          'Čl. 3.–4. – Kriteriji težine neprihvatljivog ponašanja i broj neopravdanih sati',
          'Čl. 7. – Obveza prethodnog izjašnjavanja učenika i roditelja te savjetodavni rad',
        ],
        protectedReadOnly: true,
      },
      {
        id: 'reg-gdpr',
        title: 'Opća uredba o zaštiti podataka (GDPR) u školstvu',
        shortName: 'GDPR u školi',
        nnReference: 'Uredba (EU) 2016/679 i Zakon o provedbi Opće uredbe (NN 42/18)',
        category: 'Zaštita podataka',
        summary:
          'Obvezuje na minimalizaciju obrade osobnih podataka učenika i roditelja te zabranjuje slanje osjetljivih osobnih podataka u vanjske servise bez pravne osnove.',
        keyArticles: [
          'Čl. 5. – Načelo smanjenja količine podataka i ograničenja pohrane',
          'Čl. 32. – Sigurnost obrade i anonimizacija statističkih prikaza',
        ],
        protectedReadOnly: true,
      },
    ],
  },

  nastavnici: {
    id: 'nastavnici',
    name: 'Nastavnici i razrednici',
    shortLabel: 'Nastavnici',
    description:
      'Godišnji izvedbeni kurikulumi (GIK), planovi izleta i terenske nastave, razredna izvješća i PPTX prezentacije.',
    subAppTitle: 'Razredna statistika i generator PPTX prezentacija',
    subAppDescription:
      'Izradite pregled uspjeha razreda iz lokalne e-Dnevnik tablice te generirajte prezentaciju za roditeljski sastanak ili sat razrednika.',
    systemContext:
      'Djeluješ kao metodički i administrativni savjetnik nastavnika i razrednika u hrvatskoj gimnaziji. Poznaješ Pravilnik o vrednovanju učenika, izradu GIK-a i pripremu izvanučioničke nastave.',
    quickChatPrompts: [
      'Predloži strukturu roditeljskog sastanka na početku 2. polugodišta uz fokus na državnu maturu.',
      'Koji su zakonski rokovi najave pisanih provjera i broj pisanih provjera u tjednu?',
      'Napiši izvedbeni plan jednodnevne terenske nastave za gimnazijalce s ishodima učenja.',
    ],
    forms: [
      {
        id: 'gik_predmeta',
        title: 'Godišnji izvedbeni kurikulum (GIK) predmeta',
        subtitle: 'Predložak s odgojno-obrazovnim ishodima, temama i međupredmetnim temama',
        legalBasis:
          'Kurikulum nastavnog predmeta i čl. 28. Zakona o odgoju i obrazovanju u osnovnoj i srednjoj školi',
        examplePromptHint: 'GIK za Hrvatski jezik, Matematiku ili Povijest u 3. razredu gimnazije',
        fields: [
          {
            id: 'predmetIRazred',
            label: 'Nastavni predmet i razred',
            placeholder: 'npr. Povijest – 3. razred opće gimnazije (70 sati godišnje)',
            type: 'text',
            required: true,
          },
          {
            id: 'kljucneTeme',
            label: 'Glavne nastavne cjeline i oblici vrednovanja',
            placeholder: 'Navedite 4–5 cjelina, planirane projekte i načine vrednovanja...',
            type: 'textarea',
            required: true,
          },
        ],
      },
      {
        id: 'plan_terenske_nastave',
        title: 'Plan i suglasnost za izvanučioničku / terensku nastavu',
        subtitle: 'Priprema izvedbenog programa i suglasnosti roditelja',
        legalBasis:
          'Pravilnik o izvođenju izleta, ekskurzija i drugih odgojno-obrazovnih aktivnosti izvan škole (NN 67/14, 81/15, 53/21)',
        examplePromptHint: 'Jednodnevna terenska nastava u Split, Zadar ili NP Krka',
        fields: [
          {
            id: 'odredisteIDatum',
            label: 'Odredište i planirani datum',
            placeholder: 'npr. Nacionalni park Krka – 14. svibnja 2027.',
            type: 'text',
            required: true,
          },
          {
            id: 'ciljeviISigurnost',
            label: 'Odgojno-obrazovni ciljevi, pratnja i sigurnosne mjere',
            placeholder: 'Opišite korelacije predmeta, voditelja i pratitelje...',
            type: 'textarea',
            required: true,
          },
        ],
      },
      {
        id: 'izvjesce_razrednika',
        title: 'Izvješće razrednika o uspjehu i vladanju razrednog odjela',
        subtitle: 'Izvješće za Razredno i Nastavničko vijeće uz lokalno spajanje statistike',
        legalBasis:
          'Pravilnik o načinima, postupcima i elementima vrednovanja učenika u osnovnoj i srednjoj školi',
        supportsLocalStudentMerge: true,
        examplePromptHint: 'Polugodišnje izvješće razrednika za 3.a razred',
        fields: [
          {
            id: 'razredniOdjel',
            label: 'Razredni odjel i razdoblje',
            placeholder: 'npr. 3.a – kraj 1. polugodišta 2026./2027.',
            type: 'text',
            required: true,
          },
          {
            id: 'zbrojnoZapazanje',
            label: 'Zbrojna zapažanja o uspjehu, izostancima i atmosferi u razredu',
            placeholder: 'Unesite opće ocjene uspjeha, najčešće predmete poteškoća i plan podrške...',
            type: 'textarea',
            required: true,
          },
        ],
      },
    ],
    regulations: [
      {
        id: 'reg-vrednovanje',
        title: 'Pravilnik o načinima, postupcima i elementima vrednovanja učenika',
        shortName: 'Vrednovanje učenika',
        nnReference: 'NN 112/10, 82/19, 43/20, 100/21',
        category: 'Nastava i ocjenjivanje',
        summary:
          'Propisuje vrste vrednovanja, pravila najave pisanih provjera (najviše 2 velike pisane provjere tjedno, najava 14 dana ranije), upis ocjena i javnost ocjenjivanja.',
        keyArticles: [
          'Čl. 9.–10. – Vremenik pisanih provjera znanja i najava u e-Dnevniku',
          'Čl. 11. – Ponavljanje pisane provjere ako više od 50 % učenika dobije nedovoljnu ocjenu',
        ],
        protectedReadOnly: true,
      },
      {
        id: 'reg-izleti',
        title: 'Pravilnik o izvođenju izleta, ekskurzija i drugih aktivnosti izvan škole',
        shortName: 'Izleti i ekskurzije',
        nnReference: 'NN 67/14, 81/15, 53/21',
        category: 'Izvanučionička nastava',
        summary:
          'Uređuje pripremu javnog poziva za višednevnu izvanučioničku nastavu, broj pratitelja, suglasnost roditelja i obveze učitelja voditelja.',
        keyArticles: [
          'Čl. 6.–8. – Pisana suglasnost roditelja i broj pratitelja po skupini učenika',
          'Čl. 12.–15. – Priprema i odabir ponude putem Povjerenstva',
        ],
        protectedReadOnly: true,
      },
    ],
  },
};

export const SAMPLE_LOCAL_STUDENTS: LocalStudentRecord[] = [
  {
    id: 'stu-1',
    imePrezime: 'Ana Kovačević',
    razred: '3.a',
    roditelj: 'Marko Kovačević',
    prosjekOcjena: 4.86,
    opravdaniSati: 12,
    neopravdaniSati: 0,
    opciUspjeh: 'Odličan',
    napomena: 'Sudjeluje na županijskom natjecanju iz matematike.',
  },
  {
    id: 'stu-2',
    imePrezime: 'Luka Babić',
    razred: '3.a',
    roditelj: 'Ivana Babić',
    prosjekOcjena: 4.15,
    opravdaniSati: 18,
    neopravdaniSati: 2,
    opciUspjeh: 'Vrlo dobar',
  },
  {
    id: 'stu-3',
    imePrezime: 'Marta Jurić',
    razred: '3.a',
    roditelj: 'Petar Jurić',
    prosjekOcjena: 3.38,
    opravdaniSati: 26,
    neopravdaniSati: 6,
    opciUspjeh: 'Dobar',
    pedagoskaMjera: 'Opomena razrednika',
    napomena: 'Održan savjetodavni razgovor s roditeljem.',
  },
  {
    id: 'stu-4',
    imePrezime: 'Ivan Šimić',
    razred: '3.b',
    roditelj: 'Marija Šimić',
    prosjekOcjena: 4.62,
    opravdaniSati: 9,
    neopravdaniSati: 0,
    opciUspjeh: 'Odličan',
  },
  {
    id: 'stu-5',
    imePrezime: 'Petra Knežević',
    razred: '3.b',
    roditelj: 'Tomislav Knežević',
    prosjekOcjena: 3.84,
    opravdaniSati: 21,
    neopravdaniSati: 1,
    opciUspjeh: 'Vrlo dobar',
  },
  {
    id: 'stu-6',
    imePrezime: 'Filip Radić',
    razred: '3.b',
    roditelj: 'Sandra Radić',
    prosjekOcjena: 2.72,
    opravdaniSati: 34,
    neopravdaniSati: 9,
    opciUspjeh: 'Dobar',
    pedagoskaMjera: 'Ukor Razrednog vijeća',
    napomena: 'Praćenje redovitosti pohađanja nastave.',
  },
];
