/* ==========================================================================
   Marco Santana Resume — i18n (EN ↔ PT-BR)
   Language toggle with localStorage persistence + browser detection
   ========================================================================== */

(function () {
  'use strict';

  var translations = {
    // --- Header ---
    'header.title': {
      en: 'AI Engineer · Agentic Software Delivery',
      pt: 'Engenheiro de IA · Entrega de Software Agêntica'
    },
    'header.location': { en: 'Santa Catarina, Brazil', pt: 'Santa Catarina, Brasil' },
    'skip': { en: 'Skip to content', pt: 'Ir para o conteúdo' },

    // --- Section titles ---
    'section.about': { en: 'About', pt: 'Sobre' },
    'section.experience': { en: 'Experience', pt: 'Experiência' },
    'section.projects': { en: 'Projects', pt: 'Projetos' },
    'section.skills': { en: 'Skills', pt: 'Competências' },
    'section.recommendations': { en: 'Recommendations', pt: 'Recomendações' },
    'section.volunteer': { en: 'Volunteer Work', pt: 'Trabalho Voluntário' },
    'section.education': { en: 'Education', pt: 'Formação' },
    'section.certifications': { en: 'Certifications', pt: 'Certificações' },

    // --- About ---
    'about.p1': {
      en: 'With over <strong>25 years in software engineering</strong>, I now ship production software through agentic workflows and build the guardrails that make them safe: in 2026 alone, more than 3,000 commits across about 40 repositories, 125 merged merge requests in ten weeks on a trade-marketing platform at GoAPICE, a 42,000-line CRM module for an ISP client, and Chordo Pro on the Apple App Store and the Microsoft Store.',
      pt: 'Com mais de <strong>25 anos em engenharia de software</strong>, hoje entrego software de produção por meio de fluxos de trabalho agênticos e construo as salvaguardas que os tornam seguros: só em 2026, mais de 3.000 commits em cerca de 40 repositórios, 125 merge requests integrados em dez semanas numa plataforma de trade marketing na GoAPICE, um módulo de CRM de 42 mil linhas para um provedor de internet e o Chordo Pro na App Store da Apple e na Microsoft Store.'
    },
    'about.p2': {
      en: 'The AI engineering is hands-on: agent harnesses (guard hooks, quality-gate skills, parallel worktrees, adversarial review rounds) used daily across an employer, a client and my own products, CI guards for schema drift and contract freshness, and audits of my own practice run by agent fleets over thousands of real prompts.',
      pt: 'A engenharia de IA é mão na massa: harnesses de agentes (hooks de proteção, skills de gates de qualidade, worktrees paralelos, rodadas de revisão adversarial) usados diariamente num empregador, num cliente e nos meus próprios produtos, guardas de CI para deriva de esquema e frescor de contratos, e auditorias da minha própria prática conduzidas por frotas de agentes sobre milhares de prompts reais.'
    },
    'about.p3': {
      en: 'Before that: four years on the UI of H2O.ai\'s machine-learning platform, team lead for a North American e-procurement SaaS at BairesDev, lead architect of a telemedicine platform on four clouds, and six years at Microsoft Brasil.',
      pt: 'Antes disso: quatro anos na interface da plataforma de machine learning da H2O.ai, líder técnico de um SaaS de e-procurement norte-americano na BairesDev, arquiteto líder de uma plataforma de telemedicina em quatro nuvens e seis anos na Microsoft Brasil.'
    },
    'about.languages': {
      en: '<strong>Languages:</strong> Portuguese (native) · English (full professional; working language since 2018) · Spanish (elementary)',
      pt: '<strong>Idiomas:</strong> Português (nativo) · Inglês (fluente profissional; idioma de trabalho desde 2018) · Espanhol (elementar)'
    },

    // --- Experience: Independent ---
    'exp.independent': { en: 'Independent Software Engineer', pt: 'Engenheiro de Software Independente' },
    'exp.independent.meta': { en: 'Jan 2025 – Present', pt: 'Jan 2025 – Presente' },
    'exp.independent.desc': {
      en: 'Products, open source and agent tooling, built with coding agents under written process (issue before commit, zero-warning gates, human-only issue closure). Chordo Pro is published on the Apple App Store (iOS, macOS) and the Microsoft Store, with the ICLF specification, parser and music-theory library open-sourced alongside it; Alpha Tester and GeoDome are live on the web. Tooling: claude-multi routes Claude Code across three subscriptions by directory; spent is a time-tracking CLI with 108 tests that publishes client reports; an 8-agent audit of my own practice and a 5-agent review of 8,662 prompts drive the harness roadmap.',
      pt: 'Produtos, código aberto e ferramentas para agentes, construídos com agentes de código sob processo escrito (issue antes do commit, gates sem warnings, fechamento de issues só por humanos). O Chordo Pro está publicado na App Store da Apple (iOS, macOS) e na Microsoft Store, com a especificação ICLF, o parser e a biblioteca de teoria musical abertos ao lado dele; Alpha Tester e GeoDome estão no ar na web. Ferramentas: o claude-multi roteia o Claude Code entre três assinaturas por diretório; o spent é uma CLI de registro de horas com 108 testes que publica relatórios para clientes; uma auditoria da minha própria prática com 8 agentes e uma revisão de 8.662 prompts com 5 agentes orientam o roadmap do harness.'
    },
    'exp.independent.chordo': {
      en: '<strong>Chordo</strong> — Music notation ecosystem with open-source libraries. Designed the ICLF specification for plain-text chord sheets. Parser library, music theory engine (key detection, voicing calculator, transposition), and cross-platform Flutter app shipped to iPad and macOS App Store. 4 repositories.',
      pt: '<strong>Chordo</strong> — Ecossistema de notação musical com bibliotecas open-source. Projetei a especificação ICLF para cifras em texto puro. Biblioteca de parsing, motor de teoria musical (detecção de tonalidade, calculador de voicings, transposição) e app Flutter multiplataforma publicado na App Store para iPad e macOS. 4 repositórios.'
    },
    'exp.independent.moonstead': {
      en: '<strong>Moonstead</strong> — Lunar-aware farm management for iOS and Apple Watch. SwiftUI, HealthKit, CoreLocation. Real-time activity tracking with heart rate, GPS, cadence, and splits. Custom taxonomy with 250+ SF Symbols, aerial drone overlay, 4-language support.',
      pt: '<strong>Moonstead</strong> — Gestão rural com ciclo lunar para iOS e Apple Watch. SwiftUI, HealthKit, CoreLocation. Rastreamento de atividades em tempo real com frequência cardíaca, GPS, cadência e splits. Taxonomia customizada com 250+ SF Symbols, sobreposição de imagens aéreas por drone, suporte a 4 idiomas.'
    },
    'exp.independent.whisperdb': {
      en: '<strong>Whisper DB</strong> — Privacy-first database app with P2P sync. Flutter frontend with Rust FFI backend. Ed25519 identity derivation, interactive diagram editor, 300+ tests.',
      pt: '<strong>Whisper DB</strong> — App de banco de dados privacy-first com sync P2P. Frontend Flutter com backend Rust FFI. Derivação de identidade Ed25519, editor interativo de diagramas, 300+ testes.'
    },
    'exp.independent.offlinest': {
      en: '<strong>Offline Studio</strong> — P2P sync framework in Rust. 10-crate workspace: HLC clocks, CRDTs, multi-transport networking, encrypted messaging, UniFFI bindings for Swift/iOS.',
      pt: '<strong>Offline Studio</strong> — Framework de sincronização P2P em Rust. Workspace de 10 crates: relógios HLC, CRDTs, networking multi-transporte, mensageria criptografada, bindings UniFFI para Swift/iOS.'
    },
    'exp.independent.alphatester': {
      en: '<strong>Alpha Tester</strong> — Embeddable feedback SDK for web apps. Turborepo monorepo, Next.js ingest API, Stripe-model API keys, rate limiting, CORS.',
      pt: '<strong>Alpha Tester</strong> — SDK de feedback embarcável para apps web. Monorepo Turborepo, API de ingestão Next.js, chaves API modelo Stripe, rate limiting, CORS.'
    },
    'exp.independent.pdb': {
      en: '<strong>Ponta da Barra Info</strong> — Community directory for a Brazilian coastal village. Flutter Web on Cloudflare Pages. Offline-first with SQLite WASM, multilingual (PT/EN/ES).',
      pt: '<strong>Ponta da Barra Info</strong> — Diretório comunitário para uma vila costeira brasileira. Flutter Web no Cloudflare Pages. Offline-first com SQLite WASM, multilíngue (PT/EN/ES).'
    },

    // --- Experience: GoAPICE ---
    'exp.goapice.role': {
      en: 'Senior Software Architect',
      pt: 'Arquiteto de Software Sênior'
    },
    'exp.goapice.meta1': { en: 'Feb 2026 – Present', pt: 'Fev 2026 – Presente' },
    'exp.goapice.desc': {
      en: 'Own the backend, Protobuf contracts and offline-first Flutter field app of a trade-marketing platform: 125 merged MRs across five repositories in ten weeks, BFF tests 84 → 725, app tests 145 → 736, 21 tester builds in 24 days. Cut a 1.29M-row paged query from ~35 s to ~2 s by pushing LIMIT/OFFSET down to Trino in the Python query engine; redesigned a 46M-row out-of-memory aggregation to ~12 s per page. Benchmarked Trino against StarRocks on replayed production dashboard loads, led a compute-amplification audit across four services, built an AWS FinOps pipeline that surfaced savings worth 30–60% of monthly spend, and published 21 architecture pages through a Wiki.js publisher I wrote. Earlier in the year: 165 commits hardening the Golyzer React 18 / Vite / Module Federation modernization, a TipTap rich-text editor and a conditional-formatting engine. Run a governed multi-session Claude Code workflow (64 parallel worktrees, guard hooks, quality-gate skills) and wrote the team hook that keeps agents from approving or merging MRs.',
      pt: 'Responsável pelo backend, pelos contratos Protobuf e pelo app de campo Flutter offline-first de uma plataforma de trade marketing: 125 MRs integrados em cinco repositórios em dez semanas, testes do BFF de 84 para 725, testes do app de 145 para 736, 21 builds para testadores em 24 dias. Reduzi uma consulta paginada de 1,29 milhão de linhas de ~35 s para ~2 s levando LIMIT/OFFSET até o Trino no motor de consultas em Python; redesenhei uma agregação de 46 milhões de linhas que estourava a memória para ~12 s por página. Comparei Trino e StarRocks com cargas reais de dashboards reproduzidas, conduzi uma auditoria de amplificação de computação em quatro serviços, construí um pipeline de FinOps na AWS que apontou economias de 30–60% do gasto mensal e publiquei 21 páginas de arquitetura por um publicador Wiki.js que escrevi. No início do ano: 165 commits endurecendo a modernização do Golyzer em React 18 / Vite / Module Federation, um editor de texto rico com TipTap e um motor de formatação condicional. Opero um fluxo de trabalho governado com Claude Code em múltiplas sessões (64 worktrees paralelos, hooks de proteção, skills de gates de qualidade) e escrevi o hook do time que impede agentes de aprovar ou integrar MRs.'
    },

    // --- Experience: Studies ---
    'exp.studies': { en: 'Independent Study & Prototyping', pt: 'Estudo Independente & Prototipagem' },
    'exp.studies.meta': { en: 'Apr 2024 – Dec 2024', pt: 'Abr 2024 – Dez 2024' },
    'exp.studies.desc': {
      en: 'Focused period after four years at H2O.ai. Designed the ICLF chord notation specification and built the first prototypes of the Chordo ecosystem — parser library, music theory engine, and cross-platform app.',
      pt: 'Período focado após quatro anos na H2O.ai. Projetei a especificação ICLF de notação de cifras e construí os primeiros protótipos do ecossistema Chordo — biblioteca de parsing, motor de teoria musical e app multiplataforma.'
    },

    // --- Experience: H2O.ai ---
    'exp.h2o.role': { en: 'Frontend Engineer', pt: 'Engenheiro Frontend' },
    'exp.h2o.meta1': { en: 'May 2020 – Apr 2024 · 4 years', pt: 'Mai 2020 – Abr 2024 · 4 anos' },
    'exp.h2o.desc': {
      en: 'Built and maintained the user interface of H2O.ai\'s machine-learning platform in React and TypeScript, in a US distributed team with English as the working language. Developed shared component libraries, collaborated closely with design and backend teams, and contributed to internal developer tooling.',
      pt: 'Construí e mantive a interface de usuário da plataforma de machine learning da H2O.ai em React e TypeScript, num time distribuído dos EUA com o inglês como idioma de trabalho. Desenvolvi bibliotecas de componentes compartilhados, colaborei com times de design e backend e contribuí para ferramentas internas de desenvolvimento.'
    },

    // --- Experience: BairesDev ---
    'exp.bairesdev.desc': {
      en: 'Designed and delivered features for a North American e-procurement SaaS, working directly with the client in English, progressing from senior engineer to technical team lead.',
      pt: 'Projetei e entreguei funcionalidades para um SaaS de e-procurement norte-americano, trabalhando diretamente com o cliente em inglês, progredindo de engenheiro sênior a líder técnico.'
    },
    'exp.bairesdev.meta1': { en: 'Aug 2018 – Apr 2020 · 1 year 9 months', pt: 'Ago 2018 – Abr 2020 · 1 ano e 9 meses' },
    'exp.bairesdev.lead': { en: 'Technical Team Lead', pt: 'Líder Técnico' },
    'exp.bairesdev.lead.meta': { en: 'Sep 2019 – Apr 2020', pt: 'Set 2019 – Abr 2020' },
    'exp.bairesdev.lead.desc': {
      en: 'Led the team designing and implementing Dynamic Form Build Generation, WAND Taxonomy, and AWS Lambda/Gateway services. Onboarded new developers, provided day-to-day technical support to the team, and led grooming and planning meetings.',
      pt: 'Liderei o time no design e implementação de Geração Dinâmica de Formulários, Taxonomia WAND e serviços AWS Lambda/Gateway. Realizei onboarding de novos desenvolvedores, suporte técnico diário ao time e conduzi reuniões de grooming e planejamento.'
    },
    'exp.bairesdev.senior': { en: 'Senior Full Stack Engineer', pt: 'Engenheiro Full Stack Sênior' },
    'exp.bairesdev.senior.meta': { en: 'Aug 2018 – Sep 2019', pt: 'Ago 2018 – Set 2019' },
    'exp.bairesdev.senior.desc': {
      en: 'Designed and implemented solutions with Dynamic Form Build Generation, WAND Taxonomy, and AWS Lambda/Gateway services.',
      pt: 'Projetei e implementei soluções com Geração Dinâmica de Formulários, Taxonomia WAND e serviços AWS Lambda/Gateway.'
    },

    // --- Experience: Softplan ---
    'exp.softplan.role': { en: 'Full Stack Developer', pt: 'Desenvolvedor Full Stack' },
    'exp.softplan.meta1': { en: 'Mar 2018 – Sep 2018 · 7 months', pt: 'Mar 2018 – Set 2018 · 7 meses' },
    'exp.softplan.desc': {
      en: 'Built web applications for the civil engineering and construction industry.',
      pt: 'Desenvolvi aplicações web para a indústria de engenharia civil e construção.'
    },

    // --- Experience: Portal Telemedicina ---
    'exp.telemedicina.role': { en: 'Lead Technical Architect', pt: 'Arquiteto Técnico Líder' },
    'exp.telemedicina.meta1': { en: 'May 2015 – Mar 2018 · ~3 years', pt: 'Mai 2015 – Mar 2018 · ~3 anos' },
    'exp.telemedicina.desc': {
      en: 'Architected and developed a progressive web application for telemedicine. Managed multi-cloud infrastructure spanning IBM SoftLayer, AWS, Azure, and Google Cloud. Supported hiring and onboarding of technical staff.',
      pt: 'Arquitetei e desenvolvi uma aplicação web progressiva para telemedicina. Gerenciei infraestrutura multi-cloud em IBM SoftLayer, AWS, Azure e Google Cloud. Apoiei contratação e onboarding da equipe técnica.'
    },

    // --- Experience: Guru das Ondas ---
    'exp.guru.role': { en: 'Web Architect / Developer / Partner-Owner', pt: 'Arquiteto Web / Desenvolvedor / Sócio' },
    'exp.guru.meta1': { en: 'May 2014 – May 2015', pt: 'Mai 2014 – Mai 2015' },
    'exp.guru.desc': {
      en: 'Co-founded and built a surf-related web platform from the ground up.',
      pt: 'Cofundei e construí do zero uma plataforma web voltada ao surf.'
    },

    // --- Experience: Fresh Media ---
    'exp.freshmedia.role': { en: 'Web Solutions Architect', pt: 'Arquiteto de Soluções Web' },
    'exp.freshmedia.meta1': { en: 'Oct 2014 – Feb 2015', pt: 'Out 2014 – Fev 2015' },
    'exp.freshmedia.desc': {
      en: 'Designed and built web solutions using WordPress, AWS, PHP, Node.js, and AngularJS.',
      pt: 'Projetei e construí soluções web com WordPress, AWS, PHP, Node.js e AngularJS.'
    },

    // --- Experience: Geogrid ---
    'exp.geogrid.role': { en: 'Senior Web Developer', pt: 'Desenvolvedor Web Sênior' },
    'exp.geogrid.meta1': { en: 'Jan 2014 – Jun 2014', pt: 'Jan 2014 – Jun 2014' },
    'exp.geogrid.desc': {
      en: 'Migrated GIS features from Flash/ActionScript to JavaScript. Built Google Maps V3 integration for geospatial data visualization.',
      pt: 'Migrei funcionalidades GIS de Flash/ActionScript para JavaScript. Construí integração com Google Maps V3 para visualização de dados geoespaciais.'
    },

    // --- Experience: Intersena ---
    'exp.intersena.role': { en: 'Senior Software Developer / Architect / DBA', pt: 'Desenvolvedor Sênior / Arquiteto / DBA' },
    'exp.intersena.meta1': { en: 'Oct 2010 – Mar 2014', pt: 'Out 2010 – Mar 2014' },
    'exp.intersena.desc': {
      en: 'Freelance role focused on feature development, database performance optimization, and rewriting complex data routines.',
      pt: 'Atuação freelance focada em desenvolvimento de funcionalidades, otimização de performance de banco de dados e reescrita de rotinas complexas de dados.'
    },

    // --- Experience: Cetil ---
    'exp.cetil.role': { en: 'Senior Software Architect', pt: 'Arquiteto de Software Sênior' },
    'exp.cetil.meta1': { en: 'Nov 2008 – Sep 2010', pt: 'Nov 2008 – Set 2010' },
    'exp.cetil.desc': {
      en: 'Led architecture and development of NFSe (electronic invoice) and time-clock systems. Mentored developers, conducted technical interviews, and served as interim engineering manager.',
      pt: 'Liderei arquitetura e desenvolvimento de sistemas NFSe (nota fiscal eletrônica) e ponto eletrônico. Mentorei desenvolvedores, conduzi entrevistas técnicas e atuei como gerente de engenharia interino.'
    },

    // --- Experience: Imagem ---
    'exp.imagem.role': { en: 'Systems Analyst / Developer', pt: 'Analista de Sistemas / Desenvolvedor' },
    'exp.imagem.meta1': { en: 'Jun 2007 – Oct 2008', pt: 'Jun 2007 – Out 2008' },
    'exp.imagem.desc': {
      en: 'Built a web-based GPS tracking system with real-time Google Maps integration for public transit monitoring.',
      pt: 'Construí um sistema de rastreamento GPS via web com integração em tempo real ao Google Maps para monitoramento de transporte público.'
    },

    // --- Experience: SOCIESC ---
    'exp.sociesc.role': { en: 'Instructor, Student To Business', pt: 'Instrutor, Student To Business' },
    'exp.sociesc.meta1': { en: 'Apr 2008 – Jun 2008', pt: 'Abr 2008 – Jun 2008' },
    'exp.sociesc.desc': {
      en: 'Taught a 200-hour Microsoft .NET course covering C#, ASP.NET, and ORM fundamentals. Achieved 100% positive student feedback.',
      pt: 'Ministrei curso de 200 horas em Microsoft .NET cobrindo C#, ASP.NET e fundamentos de ORM. Alcancei 100% de avaliação positiva dos alunos.'
    },

    // --- Experience: Microsoft ---
    'exp.microsoft.desc': {
      en: 'Six years at Microsoft spanning four roles, progressing from technical evangelism to innovation center management.',
      pt: 'Seis anos na Microsoft em quatro funções, progredindo de evangelismo técnico a gestão de centros de inovação.'
    },
    'exp.microsoft.meta1': { en: '1998 – 2004 · 6 years', pt: '1998 – 2004 · 6 anos' },
    'exp.microsoft.ic': { en: 'Innovation Center Program Manager', pt: 'Gerente de Programa de Centros de Inovação' },
    'exp.microsoft.ic.meta': { en: '2002 – 2004', pt: '2002 – 2004' },
    'exp.microsoft.ic.desc': {
      en: 'Selected and mentored top-performing students to build .NET applications. Managed innovation centers across six Brazilian cities: S\u00e3o Paulo, Rio de Janeiro, Curitiba, Porto Alegre, Recife, and Fortaleza.',
      pt: 'Selecionei e mentorei estudantes de alto desempenho para construir aplicações .NET. Gerenciei centros de inovação em seis cidades brasileiras: São Paulo, Rio de Janeiro, Curitiba, Porto Alegre, Recife e Fortaleza.'
    },
    'exp.microsoft.ats': { en: 'Account Technical Specialist', pt: 'Especialista Técnico de Contas' },
    'exp.microsoft.ats.meta': { en: '2001 – 2002', pt: '2001 – 2002' },
    'exp.microsoft.ats.desc': {
      en: 'Engaged with IT departments at assigned accounts, identified sales opportunities through technology assessment, and served as a liaison between support and technical teams.',
      pt: 'Atuei junto a departamentos de TI nas contas atribuídas, identifiquei oportunidades de vendas por avaliação tecnológica e servi como elo entre equipes de suporte e técnicas.'
    },
    'exp.microsoft.ae': { en: 'Applications Engineer', pt: 'Engenheiro de Aplicações' },
    'exp.microsoft.ae.meta': { en: '1999 – 2001', pt: '1999 – 2001' },
    'exp.microsoft.ae.desc': {
      en: 'Created training materials for the Microsoft Partners Channel. Supported line-of-business application development across enterprise verticals.',
      pt: 'Criei materiais de treinamento para o Canal de Parceiros Microsoft. Apoiei o desenvolvimento de aplicações de negócios em verticais corporativas.'
    },
    'exp.microsoft.sg': { en: 'Seminar Group Member', pt: 'Membro do Grupo de Seminários' },
    'exp.microsoft.sg.meta': { en: '1998 – 1999', pt: '1998 – 1999' },
    'exp.microsoft.sg.desc': {
      en: 'Developed scenarios and delivered seminars on Microsoft technology nationwide.',
      pt: 'Desenvolvi cenários e ministrei seminários sobre tecnologia Microsoft em todo o país.'
    },

    // --- Projects ---
    'proj.chordo.desc': {
      en: 'Cross-platform chord-sheet app, live on the Apple App Store (iOS, macOS) since March 2026 and on the Microsoft Store since September 2026. Renders ICLF chord sheets with syllable-precise alignment, a visual chord editor, a voicing calculator and instrument-aware rendering, on a custom music-theory engine with key detection and transposition. Six releases, 449 automated tests, fastlane and a CI release pipeline.',
      pt: 'App de cifras multiplataforma, publicado na App Store da Apple (iOS, macOS) desde março de 2026 e na Microsoft Store desde setembro de 2026. Renderiza cifras ICLF com alinhamento silábico preciso, editor visual de acordes, calculador de voicings e renderização adaptada ao instrumento, sobre um motor de teoria musical com detecção de tonalidade e transposição. Seis versões, 449 testes automatizados, fastlane e pipeline de release em CI.'
    },
    'proj.moonstead.desc': {
      en: 'Lunar-aware farm management app for iOS and Apple Watch. Tracks real-time health and activity metrics — heart rate, GPS routes, cadence, pace, and splits. Features a custom taxonomy system with 250+ SF Symbols, aerial drone overlay for farm mapping, weather integration, and multilingual support in four languages.',
      pt: 'App de gestão rural com ciclo lunar para iOS e Apple Watch. Rastreia métricas de saúde e atividade em tempo real — frequência cardíaca, rotas GPS, cadência, ritmo e splits. Possui sistema de taxonomia customizada com 250+ SF Symbols, sobreposição de imagens aéreas por drone para mapeamento, integração com clima e suporte multilíngue em quatro idiomas.'
    },
    'proj.whisperdb.desc': {
      en: 'Privacy-first database application with peer-to-peer sync. All data stays on-device with no cloud accounts required. Features an interactive diagram editor for visualizing table relationships, Ed25519 identity derivation, and a Rust FFI backend for cryptographic operations. 300+ unit and widget tests.',
      pt: 'Aplicação de banco de dados privacy-first com sincronização peer-to-peer. Todos os dados permanecem no dispositivo sem necessidade de contas em nuvem. Possui editor interativo de diagramas para visualização de relacionamentos, derivação de identidade Ed25519 e backend Rust FFI para operações criptográficas. 300+ testes unitários e de widget.'
    },
    'proj.offlinest.desc': {
      en: 'Peer-to-peer synchronization framework built as a 10-crate Rust workspace. Implements Hybrid Logical Clocks, CRDTs, multi-transport networking, and encrypted messaging. Includes UniFFI bindings for Swift/iOS integration and a CLI with serve daemon for persistent channels.',
      pt: 'Framework de sincronização peer-to-peer construído como workspace Rust de 10 crates. Implementa Relógios Lógicos Híbridos, CRDTs, networking multi-transporte e mensageria criptografada. Inclui bindings UniFFI para integração Swift/iOS e CLI com daemon para canais persistentes.'
    },
    'proj.iclf.desc': {
      en: 'Inline Chorded Lyrics Format — an open plain-text specification for notating song lyrics with precisely positioned chords. Designed for human readability so musicians can open an <code>.iclf</code> file and play instantly. Supports syllable-precise chord alignment, extensible metadata directives, and accessibility for screen readers.',
      pt: 'Inline Chorded Lyrics Format — especificação aberta em texto puro para notação de letras com acordes posicionados com precisão. Projetada para legibilidade humana para que músicos possam abrir um arquivo <code>.iclf</code> e tocar instantaneamente. Suporta alinhamento silábico preciso de acordes, diretivas de metadados extensíveis e acessibilidade para leitores de tela.'
    },
    'proj.parser.desc': {
      en: 'A Dart library that parses and validates ICLF files into structured data models. Classifies documents as valid, invalid, or recoverable — applying automatic corrections where possible. Includes a ChordMatcher for cross-ecosystem chord validation and a CLI for rendering chord sheets.',
      pt: 'Biblioteca Dart que faz parsing e validação de arquivos ICLF em modelos de dados estruturados. Classifica documentos como válidos, inválidos ou recuperáveis — aplicando correções automáticas quando possível. Inclui ChordMatcher para validação de acordes entre ecossistemas e CLI para renderização de cifras.'
    },
    'proj.musictheory.desc': {
      en: 'A Dart package and CLI providing programmatic access to music theory — notes, intervals, chords, instruments, voicing calculation, key detection, Roman numeral analysis, transposition, and capo suggestions. Serves as the theoretical foundation for the Chordo ecosystem.',
      pt: 'Pacote Dart e CLI com acesso programático à teoria musical — notas, intervalos, acordes, instrumentos, cálculo de voicings, detecção de tonalidade, análise em numerais romanos, transposição e sugestões de capotraste. Serve como base teórica do ecossistema Chordo.'
    },
    'proj.pdb.desc': {
      en: 'Community directory for a coastal village in Laguna, SC, Brazil. Helps locals and tourists find service providers, transport schedules, and trails. Offline-first with bundled data, SQLite WASM for web, responsive hero carousel, and trilingual support (Portuguese, English, Spanish).',
      pt: 'Diretório comunitário para uma vila costeira em Laguna, SC, Brasil. Ajuda moradores e turistas a encontrar prestadores de serviço, horários de transporte e trilhas. Offline-first com dados embarcados, SQLite WASM para web, carrossel responsivo e suporte trilíngue (Português, Inglês, Espanhol).'
    },

    // --- Skills category titles ---
    'skills.languages': { en: 'Languages', pt: 'Linguagens' },
    'skills.frameworks': { en: 'Frameworks & Platforms', pt: 'Frameworks & Plataformas' },
    'skills.ai': {
      en: 'AI Engineering',
      pt: 'Engenharia de IA'
    },
    'skills.cloud': { en: 'Cloud & Infrastructure', pt: 'Nuvem & Infraestrutura' },
    'skills.data': { en: 'Data & Databases', pt: 'Dados & Bancos de Dados' },
    'skills.arch': { en: 'Architecture & Practices', pt: 'Arquitetura & Práticas' },

    // --- Skill tags that differ ---
    'skill.ai-dev': { en: 'AI-Assisted Development', pt: 'Desenvolvimento Assistido por IA' },
    'skill.system-arch': { en: 'System Architecture', pt: 'Arquitetura de Sistemas' },
    'skill.api-design': { en: 'API Design', pt: 'Design de APIs' },
    'skill.tech-leadership': { en: 'Technical Leadership', pt: 'Liderança Técnica' },
    'skill.test-pyramids': { en: 'Test Pyramids', pt: 'Pirâmides de Teste' },
    'skill.data-modeling': { en: 'Data Modeling', pt: 'Modelagem de Dados' },
    'skill.prompt-eng': { en: 'Prompt Engineering', pt: 'Engenharia de Prompts' },

    // --- Recommendations ---
    'rec.claudio': {
      en: 'Marco is an exceptional professional with deep knowledge and remarkable technical command. He possesses the rare ability to convey complex ideas with clarity, making him an outstanding communicator and collaborator. His work is consistently of the highest quality, and his commitment to excellence is evident in everything he does. I wholeheartedly recommend Marco for any team looking for a talented, dedicated, and thoughtful engineer.',
      pt: 'Marco é um profissional excepcional com profundo conhecimento e notável domínio técnico. Ele possui a rara habilidade de transmitir ideias complexas com clareza, tornando-o um comunicador e colaborador extraordinário. Seu trabalho é consistentemente da mais alta qualidade, e seu compromisso com a excelência é evidente em tudo o que faz. Recomendo Marco de todo coração para qualquer equipe que busque um engenheiro talentoso, dedicado e criterioso.'
    },
    'rec.rob': {
      en: 'I had the pleasure of working with Marco at Microsoft Brazil. He is a focused, hard-working professional with deep expertise across databases, web development, and software architecture. Marco is always eager to learn and share knowledge, and he brings a rare combination of technical skill and genuine teamwork. Any organization would benefit from his contributions.',
      pt: 'Tive o prazer de trabalhar com Marco na Microsoft Brasil. Ele é um profissional focado e dedicado, com profunda expertise em bancos de dados, desenvolvimento web e arquitetura de software. Marco está sempre disposto a aprender e compartilhar conhecimento, e traz uma rara combinação de habilidade técnica e verdadeiro espírito de equipe. Qualquer organização se beneficiaria de suas contribuições.'
    },
    'rec.jean': {
      en: 'Marco is an extraordinary professional with solid expertise in software development and architecture. He approaches every project with diligence, creativity, and a genuine desire to deliver the best possible solution. His ability to work across technologies and lead teams makes him an invaluable asset. I highly recommend him.',
      pt: 'Marco é um profissional extraordinário com sólida expertise em desenvolvimento e arquitetura de software. Ele aborda cada projeto com diligência, criatividade e um desejo genuíno de entregar a melhor solução possível. Sua capacidade de trabalhar com múltiplas tecnologias e liderar equipes o torna um ativo inestimável. Recomendo-o fortemente.'
    },

    // --- Volunteer ---
    'vol.sosgravata.role': { en: 'Creator, Developer & Maintainer', pt: 'Criador, Desenvolvedor & Mantenedor' },
    'vol.sosgravata.meta': { en: 'Oct 2013 – 2020', pt: 'Out 2013 – 2020' },
    'vol.sosgravata.desc': {
      en: 'Environmental protection initiative that successfully defended coastal ecosystems and aquifer areas in the Gravat\u00e1 region of Santa Catarina from unauthorized construction. Built and maintained the project\'s web presence, community outreach tools, and coordinated public awareness campaigns. The campaign achieved its goal \u2014 the construction was permanently stopped.',
      pt: 'Iniciativa de proteção ambiental que defendeu com sucesso ecossistemas costeiros e áreas de aquíferos na região do Gravatá em Santa Catarina contra construção não autorizada. Construí e mantive a presença web do projeto, ferramentas de divulgação comunitária e coordenei campanhas de conscientização pública. A campanha atingiu seu objetivo \u2014 a construção foi permanentemente impedida.'
    },
    'vol.homestead.org': { en: 'Sustainable Homesteading', pt: 'Homesteading Sustentável' },
    'vol.homestead.role': { en: 'Homesteader & Environmental Steward', pt: 'Homesteader & Guardião Ambiental' },
    'vol.homestead.meta': { en: '2022 – Present \u00b7 4+ years', pt: '2022 – Presente \u00b7 4+ anos' },
    'vol.homestead.desc': {
      en: 'Four years of hands-on sustainable land management in the Atlantic Forest region of Santa Catarina. Practicing polyculture, permaculture, and agro-pasture-forest integration. Planting and nurturing native trees, caring for fruit and native sprouts with community donations, and active forest protection. Zero trees cut down, zero chemical inputs used. Learning and applying regenerative agriculture principles to restore and protect local biodiversity.',
      pt: 'Quatro anos de gestão sustentável de terras na região da Mata Atlântica de Santa Catarina. Praticando policultura, permacultura e integração agro-silvo-pastoril. Plantio e cultivo de árvores nativas, cuidado de mudas frutíferas e nativas com doações comunitárias, e proteção ativa da floresta. Zero árvores derrubadas, zero insumos químicos utilizados. Aprendendo e aplicando princípios de agricultura regenerativa para restaurar e proteger a biodiversidade local.'
    },

    // --- Education ---
    'edu.degree': { en: 'Data Processing Technology', pt: 'Tecnologia em Processamento de Dados' },

    'exp.isp.role': {
      en: 'Software Engineer (Contract, part-time)',
      pt: 'Engenheiro de Software (Contrato, meio período)'
    },

    'exp.isp.meta': {
      en: 'Apr 2026 – Present',
      pt: 'Abr 2026 – Presente'
    },

    'exp.isp.desc': {
      en: 'ISP operations platform (React 19, TanStack, FastAPI, SQLModel, PostgreSQL, Redis). Sole author of the CRM module: a 28-table schema, 16 Alembic migrations, 105 FastAPI endpoints behind 103 RBAC capabilities, and a kanban, lead workspace and proposal editor with triggers and cadences — 115 commits and 42.8k lines, with 248 pytest functions, the repository\'s first Playwright suite (105 cases) and a 233-case client validation page. Introduced pull-request delivery to a team that merged straight to main; 23 merged PRs and 409 commits, the most of any contributor during the engagement. Built a guard-railed agent harness for client work (PreToolUse hook, critical-values scanner, pre-push LLM review, parallel agents in isolated working copies); a multi-agent pass took the TypeScript build from 100 errors to 0. 446 logged hours in five months alongside full-time employment, with 22 engineering reports in English.',
      pt: 'Plataforma de operações de provedor de internet (React 19, TanStack, FastAPI, SQLModel, PostgreSQL, Redis). Autor único do módulo de CRM: esquema com 28 tabelas, 16 migrações Alembic, 105 endpoints FastAPI protegidos por 103 permissões RBAC, e kanban, área de leads e editor de propostas com gatilhos e cadências — 115 commits e 42,8 mil linhas, com 248 funções de teste em pytest, a primeira suíte Playwright do repositório (105 casos) e uma página de validação com 233 casos para o cliente. Introduzi a entrega por pull requests num time que integrava direto na main; 23 PRs integrados e 409 commits, o maior volume entre os contribuidores durante o contrato. Construí um harness de agentes com salvaguardas para trabalho de cliente (hook PreToolUse, varredura de valores críticos, revisão por LLM antes do push, agentes paralelos em cópias de trabalho isoladas); uma passagem multiagente levou o build TypeScript de 100 erros a 0. 446 horas registradas em cinco meses em paralelo ao emprego integral, com 22 relatórios de engenharia em inglês.'
    },

    'proj.alphatester.desc': {
      en: 'Multi-tenant feedback-to-fix platform: embeddable web and Flutter SDKs with an offline queue, API-key ingest, an RBAC dashboard with TOTP two-factor authentication, and automatic GitHub issue creation. Live collecting beta-tester feedback since August 2026. 243 tests, Terraform on GCP.',
      pt: 'Plataforma multi-tenant de feedback até a correção: SDKs embarcáveis para web e Flutter com fila offline, ingestão por chave de API, painel com RBAC e autenticação de dois fatores TOTP e criação automática de issues no GitHub. Coletando feedback de testadores beta desde agosto de 2026. 243 testes, Terraform no GCP.'
    },

    'proj.geodome.desc': {
      en: 'Geodesic dome calculator and timber-frame designer: 1V to 6V, Class I and II, cut lists with compound bevels and a triangle-by-triangle build sequence, in eight languages. A pure-Dart geometry engine whose beam fit holds residuals under a micron; its algorithms passed a 41-finding multi-agent adversarial review.',
      pt: 'Calculadora de domos geodésicos e projetista de estrutura em madeira: 1V a 6V, Classes I e II, listas de corte com chanfros compostos e sequência de montagem triângulo a triângulo, em oito idiomas. Motor geométrico em Dart puro cujo encaixe das vigas mantém resíduos abaixo de um mícron; seus algoritmos passaram por uma revisão adversarial multiagente com 41 achados.'
    },

    'skill.llm-tools': {
      en: 'LLM Tool Calling',
      pt: 'Tool Calling para LLMs'
    },

    'skill.evals': {
      en: 'Evals / LLM-as-Judge',
      pt: 'Avaliações / LLM-como-Juiz'
    },

    'skill.agent-harness': {
      en: 'Agent Harnesses (hooks, skills, MCP)',
      pt: 'Harness de Agentes (hooks, skills, MCP)'
    },

    'skill.multi-agent': {
      en: 'Multi-Agent Orchestration',
      pt: 'Orquestração Multiagente'
    },

    'skill.ondevice-ml': {
      en: 'On-device ML (Apple Vision)',
      pt: 'ML no Dispositivo (Apple Vision)'
    },

    'skill.ci-gates': {
      en: 'CI Quality Gates',
      pt: 'Gates de Qualidade em CI'
    },

    'exp.goapice.arch': {
      en: 'Senior Software Architect',
      pt: 'Arquiteto de Software Sênior'
    },

    'exp.goapice.arch.meta': {
      en: 'Aug 2026 – Present',
      pt: 'Ago 2026 – Presente'
    },

    'exp.goapice.fs': {
      en: 'Senior Full-Stack Engineer',
      pt: 'Engenheiro Full-Stack Sênior'
    },

    'exp.goapice.fs.meta': {
      en: 'May 2026 – Jul 2026',
      pt: 'Mai 2026 – Jul 2026'
    },

    'exp.goapice.fe': {
      en: 'Senior Frontend Developer',
      pt: 'Desenvolvedor Frontend Sênior'
    },

    'exp.goapice.fe.meta': {
      en: 'Feb 2026 – Apr 2026',
      pt: 'Fev 2026 – Abr 2026'
    },

    // --- Footer ---
    'footer.copyright': { en: '\u00a9 2026 Marco Santana. All rights reserved.', pt: '\u00a9 2026 Marco Santana. Todos os direitos reservados.' },
  };

  function setLang(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem('lang', lang);

    var els = document.querySelectorAll('[data-i18n]');
    els.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var entry = translations[key];
      if (entry && entry[lang]) {
        el.innerHTML = entry[lang];
      }
    });

    // Update toggle button flag
    var btn = document.querySelector('.lang-toggle');
    if (btn) {
      btn.textContent = lang === 'en' ? '\uD83C\uDDE7\uD83C\uDDF7' : '\uD83C\uDDFA\uD83C\uDDF8';
      btn.setAttribute('aria-label', lang === 'en' ? 'Mudar para Português' : 'Switch to English');
    }
  }

  // Detect language: saved > browser > default EN
  var saved = localStorage.getItem('lang');
  var lang;
  if (saved && (saved === 'en' || saved === 'pt')) {
    lang = saved;
  } else {
    var browserLang = (navigator.language || '').slice(0, 2);
    lang = browserLang === 'pt' ? 'pt' : 'en';
  }

  // Expose globally for the toggle button
  window.setLang = setLang;

  // Apply on load
  document.addEventListener('DOMContentLoaded', function () {
    setLang(lang);

    var btn = document.querySelector('.lang-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-lang') || 'en';
        setLang(current === 'en' ? 'pt' : 'en');
      });
    }
  });
})();
