import re

from django.http import FileResponse
from django.utils.text import get_valid_filename
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import permissions_utilisateur, role_utilisateur_etablissement
from api.tenant_views import (
    _objet_dans_perimetre,
    _perimetre_utilisateur,
    _permissions_collection,
)
from donnees.models import EnregistrementMetier, FichierTeleverse, ReferenceFichier
from etablissements.models import Etablissement

TAILLE_MAX_FICHIER = 25 * 1024 * 1024
REGEX_TYPE_MIME = re.compile(r"^[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+$")


def _nom_fichier_securise(nom: str) -> str:
    nom_normalise = nom.replace("\\", "/").rsplit("/", 1)[-1]
    nom_filtre = "".join(caractere for caractere in nom_normalise if caractere >= " " and caractere != "\x7f")
    nom_valide = get_valid_filename(nom_filtre)[:255]
    return nom_valide or "document"


def _contient_reference_fichier(valeur, id_fichier: str) -> bool:
    if isinstance(valeur, dict):
        if valeur.get("id_fichier_local") == id_fichier:
            return True
        return any(_contient_reference_fichier(element, id_fichier) for element in valeur.values())
    if isinstance(valeur, list):
        return any(_contient_reference_fichier(element, id_fichier) for element in valeur)
    return isinstance(valeur, str) and f"#fichier-local/{id_fichier}" in valeur


def _fichier_visible_par_utilisateur(request, fichier: FichierTeleverse) -> bool:
    if str(fichier.proprietaire_id) == str(request.user.id):
        return True
    try:
        role = role_utilisateur_etablissement(request.user, fichier.etablissement)
    except PermissionDenied:
        return False
    permissions = permissions_utilisateur(request.user, fichier.etablissement)
    perimetre = _perimetre_utilisateur(request.user, role, fichier.etablissement)
    references = ReferenceFichier.objects.filter(
        fichier=fichier
    ).select_related("enregistrement")
    for reference in references:
        enregistrement = reference.enregistrement
        permission_lecture, _ = _permissions_collection(
            request,
            fichier.etablissement,
            enregistrement.collection,
        )
        if permission_lecture not in permissions:
            continue
        donnees_publiques = {
            **enregistrement.donnees,
            "id": enregistrement.id_objet,
            "id_etablissement": fichier.etablissement_id,
        }
        if _objet_dans_perimetre(
            role,
            enregistrement.collection,
            donnees_publiques,
            perimetre,
        ):
            return True
    return False


class TeleversementFichierTenantView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        operation_id="televerserFichierEtablissement",
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {"fichier": {"type": "string", "format": "binary"}},
                "required": ["fichier"],
            }
        },
        responses=inline_serializer(
            name="FichierTeleverse",
            fields={
                "id": serializers.UUIDField(),
                "nom_fichier": serializers.CharField(),
                "type_mime": serializers.CharField(),
                "taille_octets": serializers.IntegerField(),
                "enregistre_le": serializers.DateTimeField(),
            },
        ),
    )
    def post(self, request, id_etablissement: str):
        try:
            etablissement = Etablissement.objects.get(pk=id_etablissement)
        except Etablissement.DoesNotExist as erreur:
            raise NotFound("L’établissement demandé est introuvable.") from erreur

        role = role_utilisateur_etablissement(request.user, etablissement)
        permissions = permissions_utilisateur(request.user, etablissement)
        autorise = (
            role == "ENSEIGNANT" and "pedagogie:noter" in permissions
        ) or (role == "APPRENANT" and "portail:apprenant" in permissions)
        if not autorise:
            raise PermissionDenied("Votre rôle ne permet pas de déposer un fichier dans cet établissement.")

        fichier_recu = request.FILES.get("fichier")
        if fichier_recu is None:
            raise ValidationError({"fichier": "Sélectionnez un fichier à téléverser."})
        if fichier_recu.size <= 0:
            raise ValidationError({"fichier": "Le fichier ne peut pas être vide."})
        if fichier_recu.size > TAILLE_MAX_FICHIER:
            raise ValidationError({"fichier": "La taille maximale autorisée est de 25 Mo."})

        type_mime = fichier_recu.content_type or "application/octet-stream"
        if not REGEX_TYPE_MIME.fullmatch(type_mime):
            type_mime = "application/octet-stream"
        fichier = FichierTeleverse.objects.create(
            etablissement=etablissement,
            proprietaire=request.user,
            fichier=fichier_recu,
            nom_fichier=_nom_fichier_securise(fichier_recu.name),
            type_mime=type_mime[:127],
            taille_octets=fichier_recu.size,
        )
        return Response(
            {
                "id": str(fichier.id),
                "nom_fichier": fichier.nom_fichier,
                "type_mime": fichier.type_mime,
                "taille_octets": fichier.taille_octets,
                "enregistre_le": fichier.cree_le.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class LectureFichierView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="telechargerFichier",
        responses={200: OpenApiTypes.BINARY},
    )
    def get(self, request, id_fichier: str):
        try:
            fichier = FichierTeleverse.objects.select_related(
                "etablissement", "proprietaire"
            ).get(pk=id_fichier)
        except (FichierTeleverse.DoesNotExist, ValueError) as erreur:
            raise NotFound("Le fichier demandé est introuvable.") from erreur
        if not _fichier_visible_par_utilisateur(request, fichier):
            raise NotFound("Le fichier demandé est introuvable.")
        try:
            fichier.fichier.open("rb")
        except OSError as erreur:
            raise NotFound("Le fichier demandé n’est plus disponible.") from erreur
        reponse = FileResponse(
            fichier.fichier,
            as_attachment=True,
            filename=fichier.nom_fichier,
            content_type=fichier.type_mime,
        )
        reponse["X-Content-Type-Options"] = "nosniff"
        reponse["Cache-Control"] = "private, no-store"
        return reponse
