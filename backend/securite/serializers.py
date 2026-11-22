from rest_framework import serializers

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
    class Meta:
        model=LotImportation
        fields=["id","id_etablissement","cible","nom_fichier","statut","nombre_lignes","nombre_erreurs","importe_le","importe_par","resume"]


class AttributionBadgeSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)
    class Meta:
        model=AttributionBadge
        fields=["id","id_etablissement","id_apprenant","code_badge","titre","attribue_le","attribue_par"]
