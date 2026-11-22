from rest_framework import serializers

from .models import DevoirLms, RemiseDevoir, RessourceLms


class RessourceLmsSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_unite = serializers.CharField(source="unite_id", read_only=True)
    id_element = serializers.CharField(source="element_id", read_only=True)
    class Meta:
        model = RessourceLms
        fields = ["id","id_etablissement","id_unite","id_element","titre","type_ressource","url_ou_code","id_fichier_local","nom_fichier","taille_octets","type_mime","publie_le","nom_auteur"]


class DevoirLmsSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_unite = serializers.CharField(source="unite_id", read_only=True)
    id_element = serializers.CharField(source="element_id", read_only=True)
    class Meta:
        model = DevoirLms
        fields = ["id","id_etablissement","id_unite","id_element","titre","type_devoir","theme_ou_chapitre","consignes","publie_le","cree_par","date_limite","points_max","nombre_rendus","total_attendu","statut","pieces_jointes","criteres_grille","commentaires_classe"]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        valeur = instance.points_max
        donnees["points_max"] = int(valeur) if valeur == valeur.to_integral() else float(valeur)
        return donnees


class RemiseDevoirSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_devoir = serializers.CharField(source="devoir_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)
    class Meta:
        model = RemiseDevoir
        fields = ["id","id_etablissement","id_devoir","id_apprenant","statut","remis_le","lien_ou_fichier","nom_fichier","id_fichier_local","taille_octets","type_mime","pieces_remises","commentaire_apprenant","note_attribuee","points_par_critere","commentaire_enseignant","evalue_le","evalue_par","synchronise_bulletin"]
