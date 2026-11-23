import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core.exceptions import ValidationError


PROFILS_TELEPHONE = {
    "FR": ("+33", (9,)),
    "CA": ("+1", (10,)),
    "US": ("+1", (10,)),
    "GB": ("+44", (10,)),
    "BE": ("+32", (8, 9)),
    "CH": ("+41", (9,)),
    "ES": ("+34", (9,)),
    "DE": ("+49", (10, 11)),
    "SN": ("+221", (9,)),
    "CI": ("+225", (10,)),
    "CM": ("+237", (9,)),
    "MA": ("+212", (9,)),
    "BR": ("+55", (10, 11)),
    "HT": ("+509", (8,)),
}

INDICATIFS_INTL = {
    "+216": (8,),
    "+213": (9,),
    "+243": (9,),
    "+229": (8, 10),
    "+228": (8,),
    "+226": (8,),
    "+223": (8,),
    "+261": (9,),
    "+241": (7, 8),
    "+242": (9,),
    "+39": (9, 10),
    "+351": (9,),
    "+31": (9,),
    "+352": (8, 9),
    "+52": (10,),
    "+57": (10,),
    "+81": (9, 10),
    "+61": (9,),
    "+971": (9,),
}


def valider_fuseau_iana(fuseau: str) -> None:
    if not isinstance(fuseau, str) or not fuseau.strip():
        raise ValidationError("Un fuseau horaire IANA est obligatoire pour un établissement INTL.")
    if fuseau.strip().upper() == "UTC":
        return
    try:
        ZoneInfo(fuseau.strip())
    except (ZoneInfoNotFoundError, ValueError) as erreur:
        raise ValidationError("Le fuseau horaire doit être un identifiant IANA valide.") from erreur


def valider_telephone_pays(code_pays: str, telephone: str, champ="telephone") -> str:
    propre = telephone.strip() if isinstance(telephone, str) else ""
    if code_pays == "INTL":
        indicatif_attendu = "+216"
        longueurs = (7, 8, 9, 10, 11, 12)
        if propre.startswith("+"):
            indicatif_attendu = next(
                (
                    indicatif
                    for indicatif in sorted(INDICATIFS_INTL, key=len, reverse=True)
                    if propre.startswith(indicatif)
                ),
                "",
            )
            if not indicatif_attendu:
                raise ValidationError({champ: "L’indicatif international n’est pas reconnu."})
            longueurs = INDICATIFS_INTL[indicatif_attendu]
    else:
        profil = PROFILS_TELEPHONE.get(code_pays)
        if profil is None:
            raise ValidationError({"code_pays": "Le code pays n’est pas pris en charge."})
        indicatif_attendu, longueurs = profil

    if not propre:
        raise ValidationError({champ: "Le numéro de téléphone est obligatoire."})
    if propre.startswith("00"):
        raise ValidationError({champ: "Le préfixe « 00 » ne doit pas remplacer l’indicatif verrouillé."})

    local = propre
    if propre.startswith("+"):
        if not propre.startswith(indicatif_attendu):
            raise ValidationError(
                {champ: f"L’indicatif doit correspondre au pays sélectionné ({indicatif_attendu})."}
            )
        local = propre[len(indicatif_attendu) :]
    if not re.fullmatch(r"[0-9\s().-]+", local):
        raise ValidationError({champ: "Le numéro doit contenir uniquement des chiffres et séparateurs usuels."})
    chiffres_locaux = re.sub(r"\D", "", local)
    chiffres_indicatif = re.sub(r"\D", "", indicatif_attendu)
    if len(chiffres_locaux) not in longueurs:
        longueurs_libelle = ", ".join(str(longueur) for longueur in longueurs)
        raise ValidationError(
            {champ: f"Le numéro local doit contenir exactement {longueurs_libelle} chiffre(s)."}
        )
    if len(chiffres_indicatif) + len(chiffres_locaux) > 15:
        raise ValidationError({champ: "Le numéro dépasse la longueur maximale E.164 de 15 chiffres."})
    return propre
