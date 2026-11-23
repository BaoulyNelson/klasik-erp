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
    est_super_admin_plateforme = serializers.SerializerMethodField()
    affiliations = AffiliationUtilisateurSerializer(many=True, read_only=True)
    url_avatar = serializers.SerializerMethodField()
    biographie = serializers.SerializerMethodField()
    poste = serializers.SerializerMethodField()
    departement = serializers.SerializerMethodField()
    ville = serializers.SerializerMethodField()
    pays = serializers.SerializerMethodField()
    url_linkedin = serializers.SerializerMethodField()
    langue_preferee = serializers.SerializerMethodField()
    preferences_notifications = serializers.SerializerMethodField()
    double_facteur_actif = serializers.SerializerMethodField()
    doit_changer_mot_de_passe = serializers.SerializerMethodField()
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
            "biographie",
            "poste",
            "departement",
            "ville",
            "pays",
            "url_linkedin",
            "langue_preferee",
            "preferences_notifications",
            "double_facteur_actif",
            "doit_changer_mot_de_passe",
            "ids_apprenants_lies",
        )
        read_only_fields = fields

    @extend_schema_field(serializers.CharField(allow_blank=True, allow_null=True))
    def get_url_avatar(self, utilisateur) -> str | None:
        return (utilisateur.profil or {}).get("url_avatar")

    def get_biographie(self, utilisateur) -> str:
        return (utilisateur.profil or {}).get("biographie", "")

    def get_poste(self, utilisateur) -> str:
        return (utilisateur.profil or {}).get("poste", "")

    def get_departement(self, utilisateur) -> str:
        return (utilisateur.profil or {}).get("departement", "")

    def get_ville(self, utilisateur) -> str:
        return (utilisateur.profil or {}).get("ville", "")

    def get_pays(self, utilisateur) -> str:
        return (utilisateur.profil or {}).get("pays", "")

    def get_url_linkedin(self, utilisateur) -> str:
        return (utilisateur.profil or {}).get("url_linkedin", "")

    def get_langue_preferee(self, utilisateur) -> str:
        return (utilisateur.profil or {}).get("langue_preferee", "Français")

    def get_preferences_notifications(self, utilisateur) -> dict:
        return (utilisateur.profil or {}).get("preferences_notifications", {})

    def get_double_facteur_actif(self, utilisateur) -> bool:
        return bool((utilisateur.profil or {}).get("double_facteur_actif", False))

    @extend_schema_field(serializers.BooleanField())
    def get_est_super_admin_plateforme(self, utilisateur) -> bool:
        return bool(utilisateur.est_super_admin_plateforme or utilisateur.is_superuser)

    @extend_schema_field(serializers.BooleanField())
    def get_doit_changer_mot_de_passe(self, utilisateur) -> bool:
        return bool((utilisateur.profil or {}).get("doit_changer_mot_de_passe", False))
