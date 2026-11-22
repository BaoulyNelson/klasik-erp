from rest_framework import serializers

from comptes.models import Utilisateur


class ProfilUtilisateurSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    est_actif = serializers.BooleanField(source="is_active", read_only=True)

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
        )
        read_only_fields = fields
