import type { Presentation } from "./types";

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=70`;

export function samplePresentations(): Presentation[] {
  const now = Date.now();
  return [
    {
      id: "p_launch",
      title: { en: "XLIDE Launch", pt: "Lançamento XLIDE", nl: "XLIDE Lancering" },
      description: {
        en: "Product introduction for the monochrome presentation system.",
        pt: "Apresentação do produto para o sistema de apresentações monocromático.",
        nl: "Productintroductie van het monochrome presentatiesysteem.",
      },
      author: "XLIDE Studio",
      tags: ["product", "launch", "design"],
      languages: ["en", "pt", "nl"],
      defaultLanguage: "en",
      createdAt: now - 86400000 * 6,
      updatedAt: now - 3600000 * 2,
      slides: [
        {
          id: "s1",
          layout: "cover",
          eyebrow: "XLIDE Studio",
          subtitle: { en: "Product launch\nWeb presentations", pt: "Lançamento\nApresentações web", nl: "Lancering\nWebpresentaties" },
          cta: "October 2026",
          title: { en: "Slides\nthat speak", pt: "Slides\nque falam", nl: "Dia's\ndie spreken" },
          body: { en: "every language,\nevery screen", pt: "todas as línguas,\ntodas as telas", nl: "elke taal,\nelk scherm" },
          image: img("photo-1600585154340-be6161a56a0c"),
          notes: {
            en: "Welcome everyone. Today: one deck, three languages, every phone in the room.",
            pt: "Bem-vindos. Hoje: uma apresentação, três línguas, todos os celulares da sala.",
            nl: "Welkom allemaal. Vandaag: één presentatie, drie talen, elke telefoon in de zaal.",
          },
        },
        {
          id: "s2",
          layout: "stats",
          eyebrow: "By xlide.app",
          title: { en: "Dark mode\naesthetics", pt: "Estética\nmodo escuro", nl: "Dark mode\nesthetiek" },
          body: {
            en: "Write your content once as JSON, pick a layout and XLIDE turns it into a responsive, multilingual presentation that runs in any browser.",
            pt: "Escreva o conteúdo uma vez em JSON, escolha um layout e o XLIDE a transforma em uma apresentação responsiva e multilíngue que roda em qualquer navegador.",
            nl: "Schrijf je inhoud één keer als JSON, kies een lay-out en XLIDE maakt er een responsieve, meertalige presentatie van die in elke browser draait.",
          },
          cta: { en: "Explore more", pt: "Explorar mais", nl: "Ontdek meer" },
          items: [
            { id: "i1", icon: "loader", label: { en: "Attention to details", pt: "Atenção aos detalhes", nl: "Oog voor detail" } },
            { id: "i2", icon: "thumbs-up", label: { en: "Easy to use", pt: "Fácil de usar", nl: "Eenvoudig" } },
            { id: "i3", value: "3", label: { en: "Languages", pt: "Idiomas", nl: "Talen" } },
            { id: "i4", value: "8", label: { en: "Layouts", pt: "Layouts", nl: "Lay-outs" } },
          ],
          notes: {
            en: "Point at the grid: details, ease, languages, layouts.",
            pt: "Aponte para a grade: detalhes, facilidade, idiomas, layouts.",
            nl: "Wijs naar het raster: details, gemak, talen, lay-outs.",
          },
        },
        {
          id: "s3",
          layout: "statement",
          eyebrow: "02",
          title: {
            en: "One source.\nThree languages.\nEvery phone.",
            pt: "Uma fonte.\nTrês línguas.\nTodos os celulares.",
            nl: "Eén bron.\nDrie talen.\nElke telefoon.",
          },
          subtitle: { en: "Principle", pt: "Princípio", nl: "Principe" },
          body: {
            en: "The audience scans a QR code and follows along in the language they read best, at the text size they need.",
            pt: "O público escaneia um QR code e acompanha na língua que lê melhor, com o tamanho de texto de que precisa.",
            nl: "Het publiek scant een QR-code en volgt mee in de taal die ze het best lezen, op de tekstgrootte die ze nodig hebben.",
          },
        },
        {
          id: "s4",
          layout: "services",
          eyebrow: { en: "How it works", pt: "Como funciona", nl: "Hoe het werkt" },
          cta: { en: "Try", pt: "Testar", nl: "Probeer" },
          items: [
            {
              id: "a",
              label: { en: "Write\ncontent", pt: "Escrever\nconteúdo", nl: "Inhoud\nschrijven" },
              text: { en: "Paste JSON or plain text. Every field can hold all languages.", pt: "Cole JSON ou texto simples. Cada campo guarda todas as línguas.", nl: "Plak JSON of platte tekst. Elk veld bevat alle talen." },
              meta: "JSON · TXT",
              value: { en: "2 min", pt: "2 min", nl: "2 min" },
              image: img("photo-1618221195710-dd6b41faaea6"),
            },
            {
              id: "b",
              label: { en: "Arrange\nslides", pt: "Organizar\nslides", nl: "Dia's\nordenen" },
              text: { en: "Drag pages into order and check each one with the analysis panel.", pt: "Arraste as páginas para a ordem certa e verifique cada uma no painel de análise.", nl: "Sleep pagina's op volgorde en controleer ze met het analysepaneel." },
              meta: "Drag & drop",
              value: { en: "5 min", pt: "5 min", nl: "5 min" },
              image: img("photo-1586023492125-27b2c045efd7"),
            },
            {
              id: "c",
              label: { en: "Present\nlive", pt: "Apresentar\nao vivo", nl: "Live\npresenteren" },
              text: { en: "Pair your phone as a remote and share a QR code with the room.", pt: "Conecte o celular como controle e compartilhe um QR code com a sala.", nl: "Koppel je telefoon als afstandsbediening en deel een QR-code met de zaal." },
              meta: "QR · Remote",
              value: { en: "Live", pt: "Ao vivo", nl: "Live" },
              image: img("photo-1600210492486-724fe5c67fb0"),
            },
          ],
        },
        {
          id: "s5",
          layout: "gallery",
          title: { en: "Projects", pt: "Projetos", nl: "Projecten" },
          body: {
            en: "Real projects that show how we think, work, and solve problems together.",
            pt: "Projetos reais que mostram como pensamos, trabalhamos e resolvemos problemas juntos.",
            nl: "Echte projecten die laten zien hoe we denken, werken en samen problemen oplossen.",
          },
          items: [
            { id: "g1", label: "Off Grid", meta: "Editorial", value: { en: "2 weeks", pt: "2 semanas", nl: "2 weken" }, image: img("photo-1511379938547-c1f69419868d") },
            { id: "g2", label: "Primary Form", meta: "Fashion", value: { en: "4 weeks", pt: "4 semanas", nl: "4 weken" }, image: img("photo-1490481651871-ab68de25d43d") },
            { id: "g3", label: "Luma Wood", meta: "Product", value: { en: "2 weeks", pt: "2 semanas", nl: "2 weken" }, image: img("photo-1507473885765-e6ed057f782c") },
          ],
        },
        {
          id: "s6",
          layout: "contact",
          eyebrow: "xlide",
          subtitle: { en: "Got a project in mind?", pt: "Tem um projeto em mente?", nl: "Een project in gedachten?" },
          title: { en: "Let's talk", pt: "Vamos falar", nl: "Laten we praten" },
          cta: "hello@xlide.app",
          items: [
            { id: "c1", label: { en: "Address", pt: "Endereço", nl: "Adres" }, text: "Keizersgracht 120\nAmsterdam, NL" },
            { id: "c2", label: "Instagram", text: "@xlide" },
            { id: "c3", label: { en: "Careers", pt: "Carreiras", nl: "Vacatures" }, text: "xlide.app/jobs" },
          ],
        },
      ],
    },
    {
      id: "p_sirotov",
      title: { en: "Atelier Nord — Website Concept", pt: "Atelier Nord — Conceito de Website", nl: "Atelier Nord — Websiteconcept" },
      description: {
        en: "Case study for a minimalist interior & exterior design studio.",
        pt: "Estudo de caso para um estúdio minimalista de design de interiores e exteriores.",
        nl: "Casestudy voor een minimalistische studio voor interieur- en exterieurontwerp.",
      },
      author: "D. Marques",
      tags: ["architecture", "case study", "ui/ux"],
      languages: ["en", "pt", "nl"],
      defaultLanguage: "pt",
      createdAt: now - 86400000 * 20,
      updatedAt: now - 86400000 * 3,
      slides: [
        {
          id: "n1",
          layout: "cover",
          eyebrow: "D. Marques",
          subtitle: { en: "Website concept\nUI/UX", pt: "Conceito de website\nUI/UX", nl: "Websiteconcept\nUI/UX" },
          cta: { en: "November 2026", pt: "Novembro 2026", nl: "November 2026" },
          title: "Atelier\nNord",
          body: { en: "interior & exterior\ndesign ©", pt: "design de interiores\n& exteriores ©", nl: "interieur- & exterieur-\nontwerp ©" },
          image: img("photo-1600607687939-ce8a6c25118c"),
        },
        {
          id: "n2",
          layout: "split",
          eyebrow: "01/",
          subtitle: { en: "About the project", pt: "Sobre o projeto", nl: "Over het project" },
          items: [
            {
              id: "x1",
              label: { en: "Introduction", pt: "Introdução", nl: "Introductie" },
              text: {
                en: "Restrained minimalism, unusual materials, ascetic shapes and colours, functionality and space — all of this is associated with the studio, founded in 2011.",
                pt: "Minimalismo contido, materiais incomuns, formas e cores ascéticas, funcionalidade e espaço — tudo isto está associado ao estúdio, fundado em 2011.",
              },
            },
            {
              id: "x2",
              label: { en: "Main task", pt: "Tarefa principal", nl: "Hoofdtaak" },
              text: {
                en: "Create a website that represents the studio's minimalistic approach, builds trust and convinces potential clients to leave a request.",
                pt: "Criar um website que represente a abordagem minimalista do estúdio, gere confiança e convença potenciais clientes a deixar um pedido.",
                nl: "Een website maken die de minimalistische aanpak van de studio weerspiegelt, vertrouwen wekt en klanten overtuigt een aanvraag te doen.",
              },
            },
          ],
          notes: { pt: "Explicar o contexto do estúdio antes de mostrar os serviços." },
        },
        {
          id: "n3",
          layout: "services",
          eyebrow: { en: "We create", pt: "Criamos", nl: "Wij maken" },
          cta: { en: "Book", pt: "Reservar", nl: "Boeken" },
          items: [
            { id: "y1", label: { en: "Design\nproject", pt: "Projeto\nde design", nl: "Ontwerp\nproject" }, text: { en: "We develop a unique concept that reflects your wishes and style.", pt: "Desenvolvemos um conceito único que reflete os seus desejos e estilo." }, meta: "$29/m²", value: { en: "14 days", pt: "14 dias", nl: "14 dagen" }, image: img("photo-1600210492486-724fe5c67fb0") },
            { id: "y2", label: { en: "Author's\nsupport", pt: "Apoio\nautoral", nl: "Auteurs-\nbegeleiding" }, text: { en: "We go through the stages from developing a plan to arranging furniture.", pt: "Acompanhamos as etapas, do plano à disposição dos móveis." }, meta: "$60/m²", value: { en: "60 days", pt: "60 dias", nl: "60 dagen" }, image: img("photo-1616486338812-3dadae4b4ace") },
            { id: "y3", label: { en: "Space\nplanning", pt: "Planejamento\nde espaço", nl: "Ruimte-\nplanning" }, text: { en: "We develop the optimal arrangement of furniture, accessories and other elements.", pt: "Desenvolvemos a disposição ideal de móveis, acessórios e outros elementos." }, meta: "$15/m²", value: { en: "30 days", pt: "30 dias", nl: "30 dagen" }, image: img("photo-1600566753190-17f0baa2a6c3") },
          ],
        },
        {
          id: "n4",
          layout: "image",
          eyebrow: "02/",
          title: { en: "Quiet spaces", pt: "Espaços silenciosos", nl: "Stille ruimtes" },
          subtitle: { en: "Residence, Lisbon", pt: "Residência, Lisboa", nl: "Woning, Lissabon" },
          image: img("photo-1600585154340-be6161a56a0c"),
        },
      ],
    },
    {
      id: "p_q3",
      title: { en: "Q3 Review", pt: "Revisão T3", nl: "Q3-overzicht" },
      description: { en: "Quarterly numbers for the team meeting.", pt: "Números trimestrais para a reunião de equipe.", nl: "Kwartaalcijfers voor het teamoverleg." },
      author: "Ops",
      tags: ["report", "team"],
      languages: ["en", "pt"],
      defaultLanguage: "en",
      createdAt: now - 86400000 * 40,
      updatedAt: now - 86400000 * 12,
      slides: [
        {
          id: "q1",
          layout: "stats",
          eyebrow: "Q3 2026",
          title: { en: "Quarter\nin numbers", pt: "Trimestre\nem números" },
          body: { en: "A calm quarter with steady growth across every region.", pt: "Um trimestre calmo com crescimento estável em todas as regiões." },
          cta: { en: "Details", pt: "Detalhes" },
          items: [
            { id: "k1", value: "17", label: { en: "New clients", pt: "Novos clientes" } },
            { id: "k2", value: "98%", label: { en: "Retention", pt: "Retenção" } },
            { id: "k3", value: "3680", label: { en: "Sessions", pt: "Sessões" } },
            { id: "k4", value: "4.9", label: { en: "Rating", pt: "Avaliação" } },
          ],
        },
        {
          id: "q2",
          layout: "statement",
          eyebrow: "→",
          title: { en: "Next: focus on\nfewer, better things.", pt: "A seguir: foco em\nmenos, e melhor." },
        },
      ],
    },
  ];
}

export const JSON_EXAMPLE = {
  title: { en: "My talk", pt: "Minha palestra", nl: "Mijn praatje" },
  languages: ["en", "pt", "nl"],
  defaultLanguage: "en",
  slides: [
    {
      layout: "cover",
      eyebrow: "Your name",
      subtitle: { en: "Conference 2026", pt: "Conferência 2026", nl: "Congres 2026" },
      title: { en: "Hello\nworld", pt: "Olá\nmundo", nl: "Hallo\nwereld" },
      notes: { en: "Introduce yourself." },
    },
    {
      layout: "stats",
      title: { en: "Key\nfigures", pt: "Números\nchave", nl: "Kern\ncijfers" },
      body: "Short paragraph…",
      items: [
        { value: "17", label: { en: "Scenes", pt: "Cenas", nl: "Scènes" } },
        { value: "4K", label: "Resolution" },
      ],
    },
    { layout: "statement", title: { en: "Thank you", pt: "Obrigado", nl: "Dank je" } },
  ],
};
