from rest_framework import serializers

from scolarite.models import Apprenant
from .models import AttributionBadge, ConsentementRgpd, DemandeRgpd, LotImportation


class ConsentementRgpdSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)
    class Meta:
        model=ConsentementRgpd
        fields=["id","id_etablissement","id_apprenant","droit_image","traitement_donnees","accord_parental","consentement_sms_whatsapp","mis_a_jour_le","mis_a_jour_par"]


class DemandeRgpdSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)
    class Meta:
        model=DemandeRgpd
        fields=["id","id_etablissement","id_apprenant","type_demande","statut","demandee_le","traitee_le","observations"]


class LotImportationSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    lignes_importees = serializers.IntegerField(
        source="nombre_lignes",
        min_value=0,
    )

    class Meta:
        model=LotImportation
        fields=["id","id_etablissement","cible","nom_fichier","lignes_importees","importe_le","importe_par"]


class AttributionBadgeSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.PrimaryKeyRelatedField(
        source="apprenant",
        queryset=Apprenant.objects.none(),
    )
    titre_badge = serializers.CharField()
    categorie = serializers.CharField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        view = self.context.get("view")
        tenant = getattr(view, "tenant", None)
        if tenant is not None:
            self.fields["id_apprenant"].queryset = Apprenant.objects.filter(
                etablissement=tenant
            )

    class Meta:
        model=AttributionBadge
        fields=["id","id_etablissement","id_apprenant","titre_badge","categorie","attribue_le","attribue_par"]
