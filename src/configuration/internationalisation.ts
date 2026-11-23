import { CodePays } from '../modeles/erp';

export type LangueSupportee = 'fr' | 'en' | 'es' | 'ht';

export const OPTIONS_LANGUES: { code: LangueSupportee; code_court: string; libelle: string }[] = [
  { code: 'fr', code_court: 'FR', libelle: 'Français' },
  { code: 'en', code_court: 'EN', libelle: 'English' },
  { code: 'es', code_court: 'ES', libelle: 'Español' },
  { code: 'ht', code_court: 'HT', libelle: 'Kreyòl Ayisyen' },
];

export function detecter_langue_navigateur(): LangueSupportee {
  if (typeof navigator === 'undefined') return 'fr';
  const brut = (navigator.language || '').toLowerCase();
  if (brut.startsWith('en')) return 'en';
  if (brut.startsWith('es')) return 'es';
  if (brut.startsWith('ht')) return 'ht';
  return 'fr';
}

export function detecter_pays_navigateur(): CodePays {
  try {
    const fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (fuseau.includes('Paris')) return 'FR';
    if (fuseau.includes('Toronto') || fuseau.includes('Montreal') || fuseau.includes('Vancouver'))
      return 'CA';
    if (fuseau.includes('New_York') || fuseau.includes('Chicago') || fuseau.includes('Los_Angeles'))
      return 'US';
    if (fuseau.includes('London')) return 'GB';
    if (fuseau.includes('Brussels')) return 'BE';
    if (fuseau.includes('Zurich')) return 'CH';
    if (fuseau.includes('Madrid')) return 'ES';
    if (fuseau.includes('Berlin')) return 'DE';
    if (fuseau.includes('Dakar')) return 'SN';
    if (fuseau.includes('Abidjan')) return 'CI';
    if (fuseau.includes('Douala')) return 'CM';
    if (fuseau.includes('Casablanca')) return 'MA';
    if (fuseau.includes('Sao_Paulo')) return 'BR';
    if (fuseau.includes('Port-au-Prince')) return 'HT';
  } catch {
    // ignorer
  }
  return 'INTL';
}

export interface DictionnaireInterface {
  recherche_rapide: string;
  mes_etablissements: string;
  creer_etablissement: string;
  mon_profil: string;
  changer_compte: string;
  deconnexion_accueil: string;
  page_accueil_connecte: string;
  avertissement_expiration: string;
  prolonger_session: string;
  libelle_session: string;
  titre_suspendu: string;
  description_suspendu: string;
  reactiver_etablissement: string;
  groupes: {
    SOCLE: string;
    SCOLARITE_PEDAGOGIE: string;
    GESTION: string;
    PORTAILS: string;
  };
  routes: Partial<Record<string, string>>;
}

export const DICTIONNAIRE_I18N: Record<LangueSupportee, DictionnaireInterface> = {
  fr: {
    recherche_rapide: 'Recherche rapide...',
    mes_etablissements: 'Mes établissements',
    creer_etablissement: 'Créer un établissement',
    mon_profil: 'Mon profil professionnel & Photo',
    changer_compte: 'Changer de compte (Connexion)',
    deconnexion_accueil: 'Déconnexion (Accueil public)',
    page_accueil_connecte: 'Page d’accueil (rester connecté)',
    avertissement_expiration: 'Inactivité détectée — déconnexion automatique imminente dans',
    prolonger_session: 'Prolonger la session',
    libelle_session: 'Session',
    titre_suspendu: 'Établissement temporairement suspendu',
    description_suspendu:
      'L’accès opérationnel à cet établissement a été suspendu par l’administrateur de la plateforme SaaS. Contactez le support pour réactiver votre licence.',
    reactiver_etablissement: 'Réactiver l’établissement',
    groupes: {
      SOCLE: 'Socle & Annuaire',
      SCOLARITE_PEDAGOGIE: 'Scolarité & Pédagogie',
      GESTION: 'Finances, RH & Direction',
      PORTAILS: 'Portails dédiés',
    },
    routes: {},
  },
  en: {
    recherche_rapide: 'Quick search...',
    mes_etablissements: 'My institutions',
    creer_etablissement: 'Create institution',
    mon_profil: 'My professional profile & Photo',
    changer_compte: 'Switch account (Sign in)',
    deconnexion_accueil: 'Sign out (Public home)',
    page_accueil_connecte: 'Public home (stay signed in)',
    avertissement_expiration: 'Inactivity detected — automatic sign-out in',
    prolonger_session: 'Extend session',
    libelle_session: 'Session',
    titre_suspendu: 'Institution temporarily suspended',
    description_suspendu:
      'Operational access for this institution has been suspended by the SaaS platform administrator. Please contact support to reactivate your license.',
    reactiver_etablissement: 'Reactivate institution',
    groupes: {
      SOCLE: 'Core & Directory',
      SCOLARITE_PEDAGOGIE: 'Academics & Pedagogy',
      GESTION: 'Finance, HR & Admin',
      PORTAILS: 'Dedicated Portals',
    },
    routes: {
      tableau_de_bord: 'Dashboard',
      terminologie: 'Context Engine',
      roles_audit: 'Roles & Audit',
      comptes: 'Accounts & 2FA',
      rgpd: 'GDPR Compliance',
      profil: 'My Profile',
      admissions: 'Admissions & Enrollment',
      emplois_du_temps: 'Schedules & Rooms',
      campus_numerique: 'Digital Campus & LMS',
      badges: 'ID Cards & QR Badges',
      finances: 'Finance & Cashier',
      ressources_humaines: 'HR, Payroll & Leaves',
      documents: 'Official Documents',
      communication: 'Broadcasts & Alerts',
      messagerie: 'Direct Messaging',
      actualites: 'News & Events',
      services: 'Campus Services',
      bibliotheque_materiels: 'Library & Equipment',
      rapports: 'Reports & Authorities',
      importations: 'Import Center',
      parametres: 'Institution Settings',
      plateforme: 'SaaS Multi-Country Console',
      portail_parent: 'Parent / Guardian Portal',
      portail_apprenant: 'Student / Learner Portal',
      portail_enseignant: 'Faculty / Teacher Portal',
    },
  },
  es: {
    recherche_rapide: 'Búsqueda rápida...',
    mes_etablissements: 'Mis instituciones',
    creer_etablissement: 'Crear institución',
    mon_profil: 'Mi perfil profesional y Foto',
    changer_compte: 'Cambiar de cuenta (Iniciar sesión)',
    deconnexion_accueil: 'Cerrar sesión (Inicio público)',
    page_accueil_connecte: 'Inicio público (seguir conectado)',
    avertissement_expiration: 'Inactividad detectada — cierre automático en',
    prolonger_session: 'Extender sesión',
    libelle_session: 'Sesión',
    titre_suspendu: 'Institución suspendida temporalmente',
    description_suspendu:
      'El acceso operativo de esta institución fue suspendido por el administrador de la plataforma SaaS. Contacte al soporte para reactivar su licencia.',
    reactiver_etablissement: 'Reactivar institución',
    groupes: {
      SOCLE: 'Base y Directorio',
      SCOLARITE_PEDAGOGIE: 'Escolaridad y Pedagogía',
      GESTION: 'Finanzas, RR.HH. y Admin',
      PORTAILS: 'Portales dedicados',
    },
    routes: {
      tableau_de_bord: 'Panel principal',
      terminologie: 'Motor contextual',
      roles_audit: 'Roles y Auditoría',
      comptes: 'Cuentas y 2FA',
      rgpd: 'Cumplimiento RGPD',
      profil: 'Mi perfil',
      admissions: 'Admisiones e Inscripción',
      emplois_du_temps: 'Horarios y Aulas',
      campus_numerique: 'Campus Digital y LMS',
      badges: 'Carnés y Códigos QR',
      finances: 'Finanzas y Caja',
      ressources_humaines: 'RR.HH., Nómina y Permisos',
      documents: 'Documentos oficiales',
      communication: 'Difusión y Anuncios',
      messagerie: 'Mensajería directa',
      actualites: 'Noticias y Eventos',
      services: 'Servicios escolares',
      bibliotheque_materiels: 'Biblioteca y Equipos',
      rapports: 'Informes y Autoridades',
      importations: 'Centro de importación',
      parametres: 'Ajustes de institución',
      plateforme: 'Consola SaaS Multipaís',
      portail_parent: 'Portal de Padres / Tutores',
      portail_apprenant: 'Portal del Estudiante',
      portail_enseignant: 'Portal Docente',
    },
  },
  ht: {
    recherche_rapide: 'Chèche rapid...',
    mes_etablissements: 'Lekòl ak enstitisyon mwen yo',
    creer_etablissement: 'Kreye yon nouvo enstitisyon',
    mon_profil: 'Pwofil pwofesyonèl mwen & Foto',
    changer_compte: 'Chanje kont (Koneksyon)',
    deconnexion_accueil: 'Dekonekte (Paj akèy)',
    page_accueil_connecte: 'Paj akèy (rete konekte)',
    avertissement_expiration: 'Pa gen aktivite — sesyon an ap fèmen otomatikman nan',
    prolonger_session: 'Pwolonje sesyon an',
    libelle_session: 'Sesyon',
    titre_suspendu: 'Enstitisyon an sispann pou kounye a',
    description_suspendu:
      'Administratè platfòm SaaS la sispann aksè enstitisyon sa a tanporèman. Kontakte sipò a pou reaktive lisans ou.',
    reactiver_etablissement: 'Reaktive enstitisyon an',
    groupes: {
      SOCLE: 'Baz & Referans',
      SCOLARITE_PEDAGOGIE: 'Eskolarite & Pedagoji',
      GESTION: 'Finans, RH & Administrasyon',
      PORTAILS: 'Pòtay espesyalize',
    },
    routes: {
      tableau_de_bord: 'Tablo bò',
      terminologie: 'Motè kontèks',
      roles_audit: 'Wòl & Odit',
      comptes: 'Kont & Sekirite 2FA',
      rgpd: 'Konfòmite RGPD',
      profil: 'Pwofil mwen',
      admissions: 'Admisyon & Enskripsyon',
      emplois_du_temps: 'Orè & Sal klas',
      campus_numerique: 'Kanpis Nimerik & LMS',
      badges: 'Kat & Badj QR',
      finances: 'Finans & Kès',
      ressources_humaines: 'RH, Pèy & Konje',
      documents: 'Dokiman ofisyèl',
      communication: 'Anons & Difizyon',
      messagerie: 'Mesajri dirèk',
      actualites: 'Nouvèl & Evènman',
      services: 'Sèvis kanpis',
      bibliotheque_materiels: 'Bibliyotèk & Materyèl',
      rapports: 'Rapò & Otorite',
      importations: 'Sant enpòtasyon',
      parametres: 'Paramèt enstitisyon',
      plateforme: 'Konsòl SaaS Milti-Peyi',
      portail_parent: 'Pòtay Paran / Responsab',
      portail_apprenant: 'Pòtay Elèv / Etidyan',
      portail_enseignant: 'Pòtay Pwofesè',
    },
  },
};

export interface TextesAccueil {
  nav_modes: string;
  nav_fonctionnalites: string;
  nav_demo: string;
  nav_contact: string;
  nav_tarifs: string;
  btn_connexion: string;
  btn_creer_etablissement: string;
  btn_mon_espace: string;
  btn_changer_compte: string;
  btn_deconnexion: string;
  hero_badge: string;
  hero_titre: string;
  hero_sous_titre: string;
  hero_cta_principal: string;
  hero_cta_connexion: string;
  apercu_illustratif: string;
  demander_demo: string;
  contact_titre: string;
  contact_sous_titre: string;
  contact_nom: string;
  contact_courriel: string;
  contact_sujet: string;
  contact_message: string;
  contact_envoyer: string;
  contact_annuler: string;
  contact_envoye: string;
  contact_erreur: string;
  stat_etablissements: string;
  stat_pays: string;
  stat_pays_detail: string;
  stat_roles: string;
  stat_roles_detail: string;
  stat_pwa: string;
  section_modes_titre: string;
  section_modes_sous_titre: string;
  section_fonctionnalites_titre: string;
  section_fonctionnalites_sous_titre: string;
  section_demo_titre: string;
  section_demo_sous_titre: string;
  section_tarifs_titre: string;
  section_tarifs_sous_titre: string;
  haut_page: string;
}

export const DICTIONNAIRE_ACCUEIL: Record<LangueSupportee, TextesAccueil> = {
  fr: {
    nav_modes: '3 Modes',
    nav_fonctionnalites: 'Fonctionnalités',
    nav_demo: 'Démo',
    nav_contact: 'Contact',
    nav_tarifs: 'Tarifs',
    btn_connexion: 'Se connecter',
    btn_creer_etablissement: 'Créer mon établissement',
    btn_mon_espace: 'Mon espace',
    btn_changer_compte: 'Changer de compte',
    btn_deconnexion: 'Déconnexion',
    hero_badge: 'Plateforme SaaS Multi-Tenant · Déploiement Mondial · 10 Devises',
    hero_titre: 'L’ERP éducatif mondial qui s’adapte automatiquement à votre institution.',
    hero_sous_titre:
      'Déployez en quelques minutes votre espace 100 % isolé partout dans le monde : école professionnelle, établissement scolaire (primaire au lycée) ou université LMD. Devises, fuseaux horaires, barèmes, paiements et documents QR s’ajustent à votre pays.',
    hero_cta_principal: 'Créer mon établissement',
    hero_cta_connexion: 'Se connecter',
    apercu_illustratif: 'Exemple illustratif',
    demander_demo: 'Demander une démonstration',
    contact_titre: 'Contacter notre équipe',
    contact_sous_titre: 'Décrivez votre besoin, nous vous répondrons par courriel.',
    contact_nom: 'Votre nom',
    contact_courriel: 'Votre courriel',
    contact_sujet: 'Sujet',
    contact_message: 'Votre message',
    contact_envoyer: 'Envoyer le message',
    contact_annuler: 'Annuler',
    contact_envoye: 'Votre message a été envoyé.',
    contact_erreur: 'Le message n’a pas pu être envoyé. Veuillez réessayer plus tard.',
    stat_etablissements: 'Modèles illustratifs',
    stat_pays: '15+ régions & mode Monde',
    stat_pays_detail: 'Europe, Amériques, Afrique, Caraïbes…',
    stat_roles: '12 rôles',
    stat_roles_detail: 'Contrôle RBAC granulaire',
    stat_pwa: 'Mode hors-ligne PWA inclus',
    section_modes_titre: 'Un socle mondial unique, trois moteurs métier spécialisés',
    section_modes_sous_titre:
      'Découvrez les modèles adaptés à votre secteur ou déployez votre propre établissement.',
    section_fonctionnalites_titre: 'Conçu pour l’administration, la pédagogie et la finance mondiale',
    section_fonctionnalites_sous_titre:
      'Chaque établissement créé dispose d’une base isolée, de sa propre devise, de ses fuseaux horaires et de son équipe.',
    section_demo_titre: 'Demander une démonstration',
    section_demo_sous_titre: 'Échangez avec notre équipe pour découvrir la plateforme.',
    section_tarifs_titre: 'Offres SaaS adaptées à chaque taille d’établissement',
    section_tarifs_sous_titre:
      'Déploiement immédiat partout dans le monde. Fuseaux horaires, langues (FR/EN/ES/HT) et 10 devises inclus.',
    haut_page: 'Haut de page',
  },
  en: {
    nav_modes: '3 Modes',
    nav_fonctionnalites: 'Features',
    nav_demo: 'Live Demo',
    nav_contact: 'Contact',
    nav_tarifs: 'Pricing',
    btn_connexion: 'Sign in',
    btn_creer_etablissement: 'Create institution',
    btn_mon_espace: 'My workspace',
    btn_changer_compte: 'Switch account',
    btn_deconnexion: 'Sign out',
    hero_badge: 'Global Multi-Tenant SaaS · Worldwide Deployment · 10 Currencies',
    hero_titre: 'The global education ERP that adapts automatically to your institution.',
    hero_sous_titre:
      'Launch a strictly isolated workspace anywhere in the world in minutes: vocational training center, K-12 school, or LMD/ECTS university. Local currencies, timezones, grading scales, global payments, and QR-verified records adjust to your country.',
    hero_cta_principal: 'Create my institution',
    hero_cta_connexion: 'Sign in',
    apercu_illustratif: 'Illustrative example',
    demander_demo: 'Request a demo',
    contact_titre: 'Contact our team',
    contact_sous_titre: 'Tell us what you need and we will reply by email.',
    contact_nom: 'Your name',
    contact_courriel: 'Your email',
    contact_sujet: 'Subject',
    contact_message: 'Your message',
    contact_envoyer: 'Send message',
    contact_annuler: 'Cancel',
    contact_envoye: 'Your message was sent.',
    contact_erreur: 'We could not send your message. Please try again later.',
    stat_etablissements: 'Illustrative models',
    stat_pays: '15+ countries & Global mode',
    stat_pays_detail: 'Americas, Europe, Africa, Caribbean…',
    stat_roles: '12 roles',
    stat_roles_detail: 'Granular RBAC permissions',
    stat_pwa: 'Offline-ready PWA built-in',
    section_modes_titre: 'One global core, three specialized academic engines',
    section_modes_sous_titre:
      'Explore institution models for your sector or create your own isolated campus.',
    section_fonctionnalites_titre: 'Built for global administration, academics, and multi-currency finance',
    section_fonctionnalites_sous_titre:
      'Every institution operates in an isolated tenant with its own currency, timezone, grading rules, and team.',
    section_demo_titre: 'Request a demonstration',
    section_demo_sous_titre: 'Talk to our team to discover the platform.',
    section_tarifs_titre: 'SaaS plans designed for every institution size',
    section_tarifs_sous_titre:
      'Instant global deployment. Multi-timezone, multilingual (EN/FR/ES/HT), and 10 currencies included.',
    haut_page: 'Back to top',
  },
  es: {
    nav_modes: '3 Modos',
    nav_fonctionnalites: 'Funciones',
    nav_demo: 'Demo',
    nav_contact: 'Contacto',
    nav_tarifs: 'Planes',
    btn_connexion: 'Iniciar sesión',
    btn_creer_etablissement: 'Crear institución',
    btn_mon_espace: 'Mi espacio',
    btn_changer_compte: 'Cambiar cuenta',
    btn_deconnexion: 'Cerrar sesión',
    hero_badge: 'Plataforma SaaS Multipaís · Despliegue Global · 10 Monedas',
    hero_titre: 'El ERP educativo global que se adapta automáticamente a su institución.',
    hero_sous_titre:
      'Despliegue en minutos un entorno 100 % aislado en cualquier país del mundo: centro técnico, colegio escolar o universidad LMD/ECTS. Monedas, zonas horarias, escalas de notas y documentos QR se ajustan a su región.',
    hero_cta_principal: 'Crear mi institución',
    hero_cta_connexion: 'Iniciar sesión',
    apercu_illustratif: 'Ejemplo ilustrativo',
    demander_demo: 'Solicitar una demostración',
    contact_titre: 'Contactar con nuestro equipo',
    contact_sous_titre: 'Cuéntenos qué necesita y responderemos por correo electrónico.',
    contact_nom: 'Su nombre',
    contact_courriel: 'Su correo electrónico',
    contact_sujet: 'Asunto',
    contact_message: 'Su mensaje',
    contact_envoyer: 'Enviar mensaje',
    contact_annuler: 'Cancelar',
    contact_envoye: 'Su mensaje ha sido enviado.',
    contact_erreur: 'No se pudo enviar el mensaje. Inténtelo de nuevo más tarde.',
    stat_etablissements: 'Modelos ilustrativos',
    stat_pays: '15+ países y modo Global',
    stat_pays_detail: 'América, Europa, África, Caribe…',
    stat_roles: '12 roles',
    stat_roles_detail: 'Control RBAC granular',
    stat_pwa: 'Modo sin conexión PWA incluido',
    section_modes_titre: 'Una base global única, tres motores académicos especializados',
    section_modes_sous_titre:
      'Descubra modelos para su sector o cree su propio campus aislado.',
    section_fonctionnalites_titre: 'Diseñado para administración, pedagogía y finanzas multipaís',
    section_fonctionnalites_sous_titre:
      'Cada institución cuenta con base aislada, moneda local, zona horaria y equipo propio.',
    section_demo_titre: 'Solicitar una demostración',
    section_demo_sous_titre: 'Contacte con nuestro equipo para descubrir la plataforma.',
    section_tarifs_titre: 'Planes SaaS adaptados a cada institución',
    section_tarifs_sous_titre:
      'Despliegue inmediato en todo el mundo. Zonas horarias, idiomas (ES/FR/EN/HT) y 10 monedas incluidas.',
    haut_page: 'Subir',
  },
  ht: {
    nav_modes: '3 Mòd',
    nav_fonctionnalites: 'Fonksyonalite',
    nav_demo: 'Demo',
    nav_contact: 'Kontak',
    nav_tarifs: 'Tarif SaaS',
    btn_connexion: 'Konekte',
    btn_creer_etablissement: 'Kreye enstitisyon mwen',
    btn_mon_espace: 'Espas mwen',
    btn_changer_compte: 'Chanje kont',
    btn_deconnexion: 'Dekonekte',
    hero_badge: 'Platfòm SaaS Milti-Peyi · Deplwaman Mondyal · 10 Lajan',
    hero_titre: 'ERP edikatif mondyal ki adapte otomatikman ak enstitisyon ou.',
    hero_sous_titre:
      'Deplwaye nan kèk minit pwòp espas izole ou nenpòt kote nan mond lan : lekòl pwofesyonèl, lekòl klasik oswa inivèsite LMD. Lajan, fizo orè, echèl nòt ak dokiman QR adapte yo ak peyi ou.',
    hero_cta_principal: 'Kreye enstitisyon mwen',
    hero_cta_connexion: 'Konekte',
    apercu_illustratif: 'Egzanp ilistratif',
    demander_demo: 'Mande yon demonstrasyon',
    contact_titre: 'Kontakte ekip nou an',
    contact_sous_titre: 'Di nou sa ou bezwen, n ap reponn ou pa imèl.',
    contact_nom: 'Non ou',
    contact_courriel: 'Imèl ou',
    contact_sujet: 'Sijè',
    contact_message: 'Mesaj ou',
    contact_envoyer: 'Voye mesaj la',
    contact_annuler: 'Anile',
    contact_envoye: 'Mesaj ou a voye.',
    contact_erreur: 'Nou pa t kapab voye mesaj la. Tanpri eseye ankò pita.',
    stat_etablissements: 'Modèl ilistratif',
    stat_pays: '15+ peyi & mòd Mondyal',
    stat_pays_detail: 'Amerik, Ewòp, Afrik, Karayib…',
    stat_roles: '12 wòl',
    stat_roles_detail: 'Kontwòl pèmisyon RBAC',
    stat_pwa: 'Mòd san entènèt PWA enkli',
    section_modes_titre: 'Yon sèl baz mondyal, twa motè espesyalize',
    section_modes_sous_titre:
      'Dekouvri modèl ki adapte ak sektè ou oswa kreye pwòp enstitisyon ou.',
    section_fonctionnalites_titre: 'Fèt pou administrasyon, pedagoji ak finans entènasyonal',
    section_fonctionnalites_sous_titre:
      'Chak enstitisyon gen baz izole pa l, pwòp lajan l ak pwòp ekip li.',
    section_demo_titre: 'Mande yon demonstrasyon',
    section_demo_sous_titre: 'Pale ak ekip nou an pou dekouvri platfòm nan.',
    section_tarifs_titre: 'Òf SaaS adapte pou chak gwosè enstitisyon',
    section_tarifs_sous_titre:
      'Deplwaman imedyat toupatou nan mond lan. Plizyè lang ak 10 lajan enkli.',
    haut_page: 'Tounen anwo',
  },
};

export function formater_heure_fuseau(fuseau_horaire: string, langue: LangueSupportee): string {
  const carte_locales: Record<LangueSupportee, string> = {
    fr: 'fr-FR',
    en: 'en-US',
    ht: 'fr-HT',
    es: 'es-ES',
  };
  const identifiant_iana = (fuseau_horaire || 'UTC').split(' ')[0].trim() || 'UTC';
  try {
    return new Intl.DateTimeFormat(carte_locales[langue], {
      timeZone: identifiant_iana,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toTimeString().slice(0, 8);
  }
}

export function formater_compte_a_rebours(total_secondes: number): string {
  const securise = Math.max(0, Math.floor(total_secondes));
  const minutes = Math.floor(securise / 60);
  const secondes = securise % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secondes).padStart(2, '0')}`;
}
