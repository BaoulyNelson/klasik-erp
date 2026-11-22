from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from comptes.models import Utilisateur


class AffiliationUtilisateurSerializer(serializers.Serializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_role = serializers.CharField(source="role", read_only=True)
    fonction_locale = serializers.CharField(read_only=True)


class ProfilUtilisateurSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    est_actif = serializers.BooleanField(source="is_active", read_only=True)
    affiliations = AffiliationUtilisateurSerializer(many=True, read_only=True)
    url_avatar = serializers.SerializerMethodField()
    ids_apprenants_lies = serializers.JSONField(
        source="profil.ids_apprenants_lies",
        read_only=True,
    )

    class Meta:
        model = Utilisateur
        fields = (
            "id",
            "courriel",
            "nom_complet",
            "telephone",
            "role",
            "est_super_admin_plateforme",
            "est_actif",
            "affiliations",
            "url_avatar",
            "ids_apprenants_lies",
        )
        read_only_fields = fields

    @extend_schema_field(serializers.CharField(allow_blank=True, allow_null=True))
    def get_url_avatar(self, utilisateur) -> str | None:
        return (utilisateur.profil or {}).get("url_avatar")
