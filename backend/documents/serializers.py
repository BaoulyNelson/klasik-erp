from rest_framework import serializers

from .models import DocumentOfficiel


class DocumentOfficielSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)

    class Meta:
        model = DocumentOfficiel
        fields = [
            "id",
            "id_etablissement",
            "numero_document",
            "id_apprenant",
            "type_document",
            "emis_le",
            "emis_par",
            "empreinte_verification",
        ]
