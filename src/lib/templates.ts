import { exportPresentation } from "./importer";
import { samplePresentations } from "./samples";
import type { Presentation, Template } from "./types";
import { uid } from "./utils";

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

/** "Investor Pitch" template, filled with example content in EN / PT / NL. */
export function pitchDeck(): Presentation {
  const now = Date.now();
  return {
    id: "p_pitch",
    title: { en: "Investor Pitch Deck", pt: "Pitch para Investidores", nl: "Investeerderspitch" },
    description: {
      en: "Ten-slide investor deck template: problem, solution, product, market, traction, team, ask.",
      pt: "Template de pitch com dez slides: problema, solução, produto, mercado, tração, equipe, pedido.",
      nl: "Pitchsjabloon met tien dia's: probleem, oplossing, product, markt, tractie, team, vraag.",
    },
    author: "Staybook",
    tags: ["template", "pitch", "startup"],
    languages: ["en", "pt", "nl"],
    defaultLanguage: "en",
    template: "pitch",
    accent: "#1F4BD8",
    createdAt: now - 3600000,
    updatedAt: now - 60000,
    slides: [
      {
        id: "t1",
        layout: "pitch-cover",
        tone: "dark",
        title: { en: "Investor\npitch deck", pt: "Pitch para\ninvestidores", nl: "Investeerders\npitch" },
        body: {
          en: "A seamless platform for discovering and booking the perfect accommodation.",
          pt: "Uma plataforma simples para descobrir e reservar a hospedagem perfeita.",
          nl: "Een naadloos platform om de perfecte accommodatie te vinden en te boeken.",
        },
        subtitle: { en: "Book *Smarter*,\nStay *Better*", pt: "Reserve *Melhor*,\nFique *Melhor*", nl: "Boek *Slimmer*,\nVerblijf *Beter*" },
        eyebrow: "travel",
        image: img("photo-1582719508461-905c673771fd"),
        notes: { en: "Introduce the company in one sentence.", pt: "Apresente a empresa em uma frase.", nl: "Stel het bedrijf in één zin voor." },
      },
      {
        id: "t2",
        layout: "pitch-numbers",
        title: { en: "Problem", pt: "Problema", nl: "Probleem" },
        items: [
          { id: "a", value: "01", text: { en: "Too many options,\nnot enough clarity", pt: "Opções demais,\nclareza de menos", nl: "Te veel opties,\nte weinig overzicht" } },
          { id: "b", value: "02", text: { en: "Hidden fees and\ninconsistent pricing", pt: "Taxas escondidas e\npreços inconsistentes", nl: "Verborgen kosten en\nwisselende prijzen" } },
          { id: "c", value: "03", text: { en: "Time-consuming\ncomparison across\nplatforms", pt: "Comparar plataformas\nleva tempo demais", nl: "Vergelijken tussen\nplatforms kost\nveel tijd" } },
        ],
        cta: {
          en: "Users spend more time *searching* than actually *booking*",
          pt: "As pessoas passam mais tempo *procurando* do que *reservando*",
          nl: "Mensen zijn langer bezig met *zoeken* dan met *boeken*",
        },
      },
      {
        id: "t3",
        layout: "pitch-feature",
        title: { en: "Product", pt: "Produto", nl: "Product" },
        subtitle: { en: "Designed for\n*simplicity* and *speed*", pt: "Pensado para\n*simplicidade* e *rapidez*", nl: "Ontworpen voor\n*eenvoud* en *snelheid*" },
        image: img("photo-1512941937669-90a1b58e7e9c"),
        items: [
          { id: "a", label: { en: "Smart search &\nfilter system", pt: "Busca inteligente\ne filtros", nl: "Slim zoeken\nen filteren" } },
          { id: "b", label: { en: "Real-time\navailability", pt: "Disponibilidade\nem tempo real", nl: "Realtime\nbeschikbaarheid" } },
          { id: "c", label: { en: "Clean & intuitive\ninterface", pt: "Interface limpa\ne intuitiva", nl: "Strakke, intuïtieve\ninterface" } },
        ],
        cta: { en: "Built for modern *travelers*", pt: "Feito para *viajantes* modernos", nl: "Gemaakt voor moderne *reizigers*" },
      },
      {
        id: "t4",
        layout: "pitch-toc",
        tone: "accent",
        title: { en: "Table of\ncontent", pt: "Sumário", nl: "Inhouds-\nopgave" },
        items: [
          ["Table of content", "Sumário", "Inhoudsopgave"],
          ["Problem", "Problema", "Probleem"],
          ["Solution", "Solução", "Oplossing"],
          ["Product", "Produto", "Product"],
          ["Market opportunity", "Oportunidade de mercado", "Marktkans"],
          ["Business model", "Modelo de negócio", "Verdienmodel"],
          ["Traction", "Tração", "Tractie"],
          ["Unique value", "Valor único", "Unieke waarde"],
          ["Go-to-market", "Go-to-market", "Go-to-market"],
          ["Team", "Equipe", "Team"],
          ["Financials", "Finanças", "Financiën"],
          ["Ask / closing", "Pedido / encerramento", "Vraag / afsluiting"],
        ].map(([en, pt, nl], i) => ({ id: `toc${i}`, label: { en, pt, nl } })),
      },
      {
        id: "t5",
        layout: "pitch-split",
        tone: "accent",
        title: { en: "Solution", pt: "Solução", nl: "Oplossing" },
        subtitle: { en: "A *smarter* way\nto book your stay", pt: "Um jeito *mais inteligente*\nde reservar sua estadia", nl: "Een *slimmere* manier\nom je verblijf te boeken" },
        image: img("photo-1529156069898-49953e39b3ac"),
        items: [
          { id: "a", text: { en: "Personalized recommendations\nbased on user preferences", pt: "Recomendações personalizadas\nconforme suas preferências", nl: "Persoonlijke aanbevelingen\nop basis van voorkeuren" } },
          { id: "b", text: { en: "Transparent pricing with no\nhidden costs", pt: "Preços transparentes,\nsem custos escondidos", nl: "Transparante prijzen zonder\nverborgen kosten" } },
          { id: "c", text: { en: "Seamless, fast booking\nexperience", pt: "Reserva rápida\ne sem atrito", nl: "Snel en naadloos\nboeken" } },
        ],
        cta: { en: "Everything you need, in one *platform*", pt: "Tudo o que você precisa, em uma *plataforma*", nl: "Alles wat je nodig hebt, op één *platform*" },
      },
      {
        id: "t6",
        layout: "pitch-feature",
        variant: "collage",
        title: { en: "Business model", pt: "Modelo de negócio", nl: "Verdienmodel" },
        subtitle: { en: "*Scalable* and *sustainable*\nrevenue streams", pt: "Receitas *escaláveis*\ne *sustentáveis*", nl: "*Schaalbare* en *duurzame*\ninkomsten" },
        image: img("photo-1556761175-5973dc0f32e7"),
        images: [img("photo-1449844908441-8829872d2607"), img("photo-1521737604893-d14cc237f11d")],
        items: [
          { id: "a", label: { en: "Commission per\nbooking", pt: "Comissão por\nreserva", nl: "Commissie per\nboeking" } },
          { id: "b", label: { en: "Premium listing for\nproperty owners", pt: "Anúncio premium\npara proprietários", nl: "Premiumvermelding\nvoor eigenaren" } },
          { id: "c", label: { en: "Subscription for\nbusiness users", pt: "Assinatura para\nempresas", nl: "Abonnement voor\nzakelijke gebruikers" } },
        ],
      },
      {
        id: "t7",
        layout: "pitch-team",
        title: { en: "Team", pt: "Equipe", nl: "Team" },
        subtitle: { en: "Built by passionate\n*problem solvers*", pt: "Feito por pessoas\napaixonadas por *resolver problemas*", nl: "Gebouwd door gedreven\n*probleemoplossers*" },
        items: [
          { id: "a", label: "Ethan Walker", text: "Founder & CEO", image: img("photo-1500648767791-00dcc994a43e") },
          { id: "b", label: "Adrian Cole", text: "Co-founder & CTO", image: img("photo-1507003211169-0a1dd7228f2d") },
          { id: "c", label: "Sophia Bennett", text: "Co-founder & COO", image: img("photo-1494790108377-be9c29b29330") },
          { id: "d", label: "Marcus Reed", text: "Co-founder & CDO", image: img("photo-1506794778202-cad84cf45f1d") },
        ],
      },
      {
        id: "t8",
        layout: "pitch-split",
        tone: "accent",
        title: { en: "Traction", pt: "Tração", nl: "Tractie" },
        subtitle: { en: "Early *signs* of\n*strong growth*", pt: "Primeiros *sinais* de\n*crescimento forte*", nl: "Eerste *signalen* van\n*sterke groei*" },
        image: img("photo-1517457373958-b7bdd4587205"),
        items: [
          { id: "a", value: "XX,000+", text: { en: "active users", pt: "usuários ativos", nl: "actieve gebruikers" } },
          { id: "b", value: "XX%", text: { en: "monthly growth", pt: "crescimento mensal", nl: "groei per maand" } },
          { id: "c", value: "XX", text: { en: "bookings per month", pt: "reservas por mês", nl: "boekingen per maand" } },
        ],
        cta: { en: "Growing consistently with *strong retention*", pt: "Crescimento constante com *alta retenção*", nl: "Constante groei met *sterke retentie*" },
      },
      {
        id: "t9",
        layout: "pitch-split",
        variant: "right",
        tone: "dark",
        title: { en: "Ask / closing", pt: "Pedido / encerramento", nl: "Vraag / afsluiting" },
        subtitle: { en: "Join us in *redefining*\ntravel booking", pt: "Junte-se a nós para *redefinir*\na reserva de viagens", nl: "Help ons het boeken van\nreizen *opnieuw uit te vinden*" },
        image: img("photo-1545324418-cc1a3fa10c00"),
        items: [
          { id: "a", value: { en: "Raising", pt: "Captando", nl: "We halen op" }, text: "$XXX,000" },
          { id: "b", value: { en: "To *expand* product", pt: "Para *expandir* o produto", nl: "Om het product *uit te breiden*" }, text: { en: "& market reach", pt: "e o alcance de mercado", nl: "en het marktbereik" } },
        ],
        cta: { en: "Let's *build* the future of travel, together", pt: "Vamos *construir* juntos o futuro das viagens", nl: "Laten we samen de toekomst van reizen *bouwen*" },
      },
      {
        id: "t10",
        layout: "pitch-feature",
        variant: "row",
        title: { en: "Unique value", pt: "Valor único", nl: "Unieke waarde" },
        subtitle: { en: "What makes us\n*different*", pt: "O que nos torna\n*diferentes*", nl: "Wat ons\n*anders* maakt" },
        image: img("photo-1518770660439-4636190af475"),
        images: [img("photo-1449824913935-59a10b8d2000"), img("photo-1497366216548-37526070297c")],
        items: [
          { id: "a", label: { en: "AI-powered\nrecommendation\nengine", pt: "Recomendações\ncom IA", nl: "Aanbevelingen\nmet AI" } },
          { id: "b", label: { en: "Hyper-local\naccommodation\ninsights", pt: "Informação local\nsobre hospedagem", nl: "Hyperlokale\ninzichten" } },
          { id: "c", label: { en: "User-first\nexperience\ndesign", pt: "Design centrado\nno usuário", nl: "Ontwerp met de\ngebruiker voorop" } },
        ],
      },
    ],
  };
}

export interface TemplateInfo {
  id: Template;
  sample: () => Presentation;
}

export const TEMPLATE_LIST: TemplateInfo[] = [
  { id: "pitch", sample: pitchDeck },
  { id: "editorial", sample: () => samplePresentations()[0] },
];

/** New presentation built from a template (fresh ids). */
export function fromTemplate(id: Template): Presentation {
  const base = structuredClone(TEMPLATE_LIST.find((t) => t.id === id)!.sample());
  return {
    ...base,
    id: uid("p_"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    slides: base.slides.map((s) => ({ ...s, id: uid("s_"), items: s.items?.map((it) => ({ ...it, id: uid("i_") })) })),
  };
}

/**
 * Fill-in JSON model: the template's example deck plus a short guide.
 * Replace the texts, keep the keys, then import it back.
 */
export function templateJson(id: Template) {
  const deck = exportPresentation(TEMPLATE_LIST.find((t) => t.id === id)!.sample());
  return {
    _guide: {
      how: "Replace the example texts with your content. Keep the keys and the layout names. Delete slides you do not need, duplicate the ones you want twice. Then import this file in XLIDE (Import JSON).",
      text: "Every text can be a plain string (same in all languages) or { \"en\": \"…\", \"pt\": \"…\", \"nl\": \"…\" }. Use \\n for a line break and *word* to highlight a word in the accent colour.",
      accent: "Hex colour for highlights, big numbers and accent slides, e.g. #1F4BD8 (cobalt), #E5322D (red), #FF5A1F (orange).",
      tone: "Per slide background: light | dark | accent.",
      layouts: {
        "pitch-cover": "title, body (top-right description), subtitle (short tagline), eyebrow (brand), image",
        "pitch-statement": "title (short label, e.g. QUESTION), subtitle (the big sentence), body (side text, e.g. a verse), cta (footnote/source)",
        "pitch-numbers": "title, items[{ value: '01', text }], cta (footnote)",
        "pitch-feature": "title, subtitle, image, images[], items[{ label }], cta; variant: side | collage | row",
        "pitch-toc": "title, items[{ label }] (numbered automatically)",
        "pitch-split": "title, subtitle, image, items[{ value, text }], cta; variant: left | right",
        "pitch-team": "title, subtitle, items[{ label: name, text: role, image }], cta",
      },
    },
    ...deck,
  };
}
