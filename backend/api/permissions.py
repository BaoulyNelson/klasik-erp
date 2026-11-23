from rest_framework.exceptions import PermissionDenied

from comptes.models import AffiliationEtablissement, RoleUtilisateur, SurchargePermissions

PERMISSIONS_PAR_ROLE = {
    "SUPER_ADMIN": """
        plateforme:gerer tableau_de_bord:voir admissions:voir apprenants:voir
        pedagogie:voir campus_numerique:voir emplois_du_temps:voir stages:voir
        finances:voir rh:voir documents:voir communication:voir services:voir
        bibliotheque_materiels:voir actualites:voir badges:voir rapports:voir
        parametres:voir parametres:gerer roles:gerer audit:voir comptes:gerer
        rgpd:gerer profil:voir
    """.split(),
    "DIRECTEUR": """
        tableau_de_bord:voir admissions:voir admissions:gerer apprenants:voir
        apprenants:gerer pedagogie:voir pedagogie:verrouiller campus_numerique:voir
        emplois_du_temps:voir stages:voir finances:voir finances:gerer rh:voir rh:gerer
        documents:voir documents:emettre communication:voir communication:envoyer
        services:voir bibliotheque_materiels:voir bibliotheque_materiels:gerer rapports:voir
        parametres:voir parametres:gerer roles:gerer audit:voir actualites:voir
        actualites:gerer messagerie:utiliser badges:voir badges:gerer importations:gerer
        comptes:gerer rgpd:gerer profil:voir
    """.split(),
    "ADMIN_ETAB": """
        tableau_de_bord:voir admissions:voir admissions:gerer apprenants:voir
        apprenants:gerer pedagogie:voir campus_numerique:voir emplois_du_temps:voir
        emplois_du_temps:gerer stages:voir finances:voir rh:voir documents:voir
        documents:emettre communication:voir communication:envoyer services:voir services:gerer
        bibliotheque_materiels:voir bibliotheque_materiels:gerer rapports:voir parametres:voir
        parametres:gerer roles:gerer audit:voir actualites:voir actualites:gerer
        messagerie:utiliser badges:voir badges:gerer importations:gerer comptes:gerer
        rgpd:gerer profil:voir
    """.split(),
    "SCOLARITE": """
        tableau_de_bord:voir admissions:voir admissions:gerer apprenants:voir apprenants:gerer
        pedagogie:voir emplois_du_temps:voir documents:voir documents:emettre
        communication:voir communication:envoyer bibliotheque_materiels:voir rapports:voir
        actualites:voir actualites:gerer messagerie:utiliser badges:voir badges:gerer
        importations:gerer profil:voir
    """.split(),
    "ECONOME": """
        tableau_de_bord:voir apprenants:voir finances:voir finances:encaisser finances:gerer
        rh:voir rh:gerer documents:voir communication:voir communication:envoyer rapports:voir
        actualites:voir messagerie:utiliser importations:gerer profil:voir
    """.split(),
    "DIR_ETUDES": """
        tableau_de_bord:voir apprenants:voir pedagogie:voir pedagogie:noter pedagogie:appel
        pedagogie:verrouiller campus_numerique:voir emplois_du_temps:voir emplois_du_temps:gerer
        stages:voir documents:voir documents:emettre communication:voir communication:envoyer
        services:voir bibliotheque_materiels:voir bibliotheque_materiels:gerer rapports:voir
        actualites:voir actualites:gerer messagerie:utiliser badges:voir badges:gerer profil:voir
    """.split(),
    "ENSEIGNANT": """
        tableau_de_bord:voir apprenants:voir pedagogie:voir pedagogie:noter pedagogie:appel
        campus_numerique:voir emplois_du_temps:voir bibliotheque_materiels:voir communication:voir
        portail:enseignant actualites:voir messagerie:utiliser badges:voir profil:voir
    """.split(),
    "RESP_STAGES": """
        tableau_de_bord:voir apprenants:voir stages:voir stages:gerer documents:voir
        documents:emettre communication:voir communication:envoyer rapports:voir profil:voir
    """.split(),
    "SERVICES_ANNEXES": """
        tableau_de_bord:voir apprenants:voir services:voir services:gerer
        bibliotheque_materiels:voir bibliotheque_materiels:gerer communication:voir profil:voir
    """.split(),
    "PARENT": """
        portail:parent campus_numerique:voir emplois_du_temps:voir communication:voir
        documents:voir actualites:voir messagerie:utiliser badges:voir profil:voir
    """.split(),
    "APPRENANT": """
        portail:apprenant campus_numerique:voir emplois_du_temps:voir
        bibliotheque_materiels:voir communication:voir documents:voir actualites:voir
        messagerie:utiliser badges:voir profil:voir
    """.split(),
    "AUDITEUR": """
        tableau_de_bord:voir apprenants:voir pedagogie:voir emplois_du_temps:voir
        stages:voir finances:voir rh:voir documents:voir bibliotheque_materiels:voir
        rapports:voir audit:voir profil:voir
    """.split(),
}

PERMISSIONS_METIER_QUOTIDIEN_EXCLUES_SUPER_ADMIN = {
    "admissions:gerer",
    "apprenants:gerer",
    "pedagogie:noter",
    "pedagogie:appel",
    "pedagogie:verrouiller",
    "emplois_du_temps:gerer",
    "stages:gerer",
    "finances:encaisser",
    "finances:gerer",
    "rh:gerer",
    "documents:emettre",
    "communication:envoyer",
    "services:gerer",
    "bibliotheque_materiels:gerer",
    "actualites:gerer",
    "badges:gerer",
    "importations:gerer",
    "messagerie:utiliser",
}

PERMISSIONS_COLLECTIONS = {
    "unites": ("parametres:voir", "parametres:gerer"),
    "elements": ("parametres:voir", "parametres:gerer"),
    "enseignants": ("rh:voir", "rh:gerer"),
    "apprenants": ("apprenants:voir", "apprenants:gerer"),
    "inscriptions": ("admissions:voir", "admissions:gerer"),
    "paiements": ("finances:voir", "finances:encaisser"),
    "notes": ("pedagogie:voir", "pedagogie:noter"),
    "presences": ("pedagogie:voir", "pedagogie:appel"),
    "emplois_du_temps": ("emplois_du_temps:voir", "emplois_du_temps:gerer"),
    "evenements_calendrier": ("emplois_du_temps:voir", "emplois_du_temps:gerer"),
    "documents": ("documents:voir", "documents:emettre"),
    "partenaires": ("stages:voir", "stages:gerer"),
    "depenses": ("finances:voir", "finances:gerer"),
    "paie": ("rh:voir", "rh:gerer"),
    "communications": ("communication:voir", "communication:envoyer"),
    "cahiers_textes": ("pedagogie:voir", "pedagogie:noter"),
    "soutenances": ("pedagogie:voir", "pedagogie:noter"),
    "livres_bibliotheque": ("bibliotheque_materiels:voir", "bibliotheque_materiels:gerer"),
    "emprunts_bibliotheque": ("bibliotheque_materiels:voir", "bibliotheque_materiels:gerer"),
    "visites_infirmerie": ("services:voir", "services:gerer"),
    "incidents_discipline": ("services:voir", "services:gerer"),
    "abonnements": ("services:voir", "services:gerer"),
    "inventaire": ("bibliotheque_materiels:voir", "bibliotheque_materiels:gerer"),
    "prets_materiels": ("bibliotheque_materiels:voir", "bibliotheque_materiels:gerer"),
    "anciens": ("services:voir", "services:gerer"),
    "ressources_lms": ("campus_numerique:voir", "pedagogie:noter"),
    "devoirs_lms": ("campus_numerique:voir", "pedagogie:noter"),
    "remises_devoirs_lms": ("campus_numerique:voir", "pedagogie:noter"),
    "articles_actualites": ("actualites:voir", "actualites:gerer"),
    "consentements_rgpd": ("rgpd:gerer", "rgpd:gerer"),
    "demandes_rgpd": ("rgpd:gerer", "rgpd:gerer"),
    "fils_discussion": ("messagerie:utiliser", "messagerie:utiliser"),
    "badges_attribues": ("badges:voir", "badges:gerer"),
    "journaux_importations": ("importations:gerer", "importations:gerer"),
    "demandes_conge": ("rh:voir", "rh:gerer"),
    "journaux_audit": ("audit:voir", None),
    "notifications": ("tableau_de_bord:voir", None),
}

COLLECTIONS_PORTAIL = {
    "apprenants",
    "inscriptions",
    "paiements",
    "notes",
    "presences",
    "documents",
    "emprunts_bibliotheque",
    "visites_infirmerie",
    "incidents_discipline",
    "abonnements",
    "remises_devoirs_lms",
    "consentements_rgpd",
    "demandes_rgpd",
    "badges_attribues",
    "soutenances",
}

TYPES_ETABLISSEMENT_PAR_ROLE = {
    "RESP_STAGES": {"PRO", "UNIVERSITE"},
    "PARENT": {"SCOLAIRE"},
}


def role_utilisateur_etablissement(utilisateur, etablissement) -> str:
    if etablissement is None:
        if utilisateur.est_super_admin_plateforme or utilisateur.is_superuser:
            return RoleUtilisateur.SUPER_ADMIN
        raise PermissionDenied("Cette action est réservée à l’administration de la plateforme.")
    try:
        affiliation = AffiliationEtablissement.objects.select_related("etablissement").get(
            utilisateur=utilisateur,
            etablissement=etablissement,
        )
    except AffiliationEtablissement.DoesNotExist as erreur:
        raise PermissionDenied("Vous n’êtes pas affilié à cet établissement.") from erreur
    if affiliation.role == RoleUtilisateur.SUPER_ADMIN:
        raise PermissionDenied("Le rôle plateforme ne peut pas être utilisé comme rôle tenant.")
    types_autorises = TYPES_ETABLISSEMENT_PAR_ROLE.get(affiliation.role)
    if types_autorises and etablissement.type not in types_autorises:
        raise PermissionDenied("Ce rôle n’est pas applicable à ce type d’établissement.")
    return affiliation.role


def permissions_utilisateur(utilisateur, etablissement) -> set[str]:
    role = role_utilisateur_etablissement(utilisateur, etablissement)
    if etablissement is not None and not etablissement.est_actif:
        return {"parametres:gerer"} if role in {"DIRECTEUR", "ADMIN_ETAB"} else set()
    if role == RoleUtilisateur.SUPER_ADMIN:
        surcharge = SurchargePermissions.objects.filter(
            etablissement=etablissement,
            role=role,
        ).first()
    else:
        surcharge = SurchargePermissions.objects.filter(
            etablissement=etablissement,
            role=role,
        ).first()
    permissions = set(surcharge.permissions) if surcharge else set(PERMISSIONS_PAR_ROLE[role])
    if role == RoleUtilisateur.SUPER_ADMIN:
        permissions -= PERMISSIONS_METIER_QUOTIDIEN_EXCLUES_SUPER_ADMIN
    return permissions
