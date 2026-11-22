import base64
import binascii

from rest_framework.exceptions import ValidationError


TAILLE_MAX_IMAGE_EN_OCTETS = 512 * 1024
TYPES_IMAGE_AUTORISES = {
    "data:image/jpeg;base64",
    "data:image/png;base64",
    "data:image/webp;base64",
    "data:image/svg+xml;base64",
}


def valider_url_image(valeur, champ: str) -> str:
    if not isinstance(valeur, str):
        raise ValidationError({champ: "L’image doit être fournie en format image valide."})
    prefixe, separateur, contenu = valeur.partition(",")
    if not separateur or prefixe not in TYPES_IMAGE_AUTORISES:
        raise ValidationError({champ: "Le format d’image transmis n’est pas autorisé."})
    try:
        contenu_decode = base64.b64decode(contenu, validate=True)
    except (binascii.Error, ValueError) as erreur:
        raise ValidationError({champ: "Les données de l’image sont invalides."}) from erreur
    if not contenu_decode or len(contenu_decode) > TAILLE_MAX_IMAGE_EN_OCTETS:
        raise ValidationError({champ: "L’image est vide ou dépasse la limite de 512 Ko."})
    return valeur
