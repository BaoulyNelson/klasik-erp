import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from zoneinfo import available_timezones

import phonenumbers
import pycountry

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
    if fuseau.strip() not in available_timezones():
        raise ValidationError("Le fuseau horaire doit être un identifiant IANA valide.")
    try:
        ZoneInfo(fuseau.strip())
    except (ZoneInfoNotFoundError, ValueError) as erreur:
        raise ValidationError("Le fuseau horaire doit être un identifiant IANA valide.") from erreur


def valider_code_pays(code_pays: str) -> str:
    if not isinstance(code_pays, str):
        raise ValidationError({"code_pays": "Le code pays doit être une chaîne ISO 3166-1."})
    propre = code_pays.strip().upper()
    if pycountry.countries.get(alpha_2=propre) is None:
        raise ValidationError({"code_pays": "Le code pays doit être valide selon ISO 3166-1."})
    return propre


def valider_code_devise(code_devise: str) -> str:
    if not isinstance(code_devise, str):
        raise ValidationError({"devise_defaut": "La devise doit être une chaîne ISO 4217."})
    propre = code_devise.strip().upper()
    if pycountry.currencies.get(alpha_3=propre) is None:
        raise ValidationError({"devise_defaut": "La devise doit être valide selon ISO 4217."})
    return propre


def valider_telephone_pays(code_pays: str, telephone: str, champ="telephone") -> str:
    propre = telephone.strip() if isinstance(telephone, str) else ""
    if not propre:
        raise ValidationError({champ: "Le numéro de téléphone est obligatoire."})
    if propre.startswith("00"):
        raise ValidationError({champ: "Le préfixe « 00 » ne doit pas remplacer l’indicatif verrouillé."})
    if code_pays == "INTL":
        raise ValidationError({"code_pays": "Sélectionnez un pays ISO 3166-1."})
    code_pays_normalise = valider_code_pays(code_pays)
    try:
        numero = phonenumbers.parse(propre, code_pays_normalise)
    except phonenumbers.NumberParseException as erreur:
        raise ValidationError({champ: "Le numéro de téléphone est invalide pour ce pays."}) from erreur
    if phonenumbers.region_code_for_number(numero) != code_pays_normalise:
        raise ValidationError({champ: f"L’indicatif doit correspondre au pays sélectionné ({code_pays_normalise})."})
    if not phonenumbers.is_possible_number(numero):
        raise ValidationError({champ: "Le numéro de téléphone n’est pas possible dans ce pays."})
    return phonenumbers.format_number(numero, phonenumbers.PhoneNumberFormat.E164)
