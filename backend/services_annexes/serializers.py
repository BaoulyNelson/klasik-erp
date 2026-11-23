from rest_framework import serializers

from .models import (
    AncienEtudiant,
    ArticleInventaire,
    EmpruntBibliotheque,
    IncidentDiscipline,
    LivreBibliotheque,
    PartenaireStage,
    PretMateriel,
    VisiteInfirmerie,
)


class PartenaireStageSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = PartenaireStage
        fields = [
            "id",
            "id_etablissement",
            "nom_entreprise",
            "secteur",
            "ville",
            "nom_tuteur",
            "telephone",
            "places_disponibles",
            "stagiaires_actifs",
        ]


class LivreBibliothequeSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = LivreBibliotheque
        fields = [
            "id", "id_etablissement", "isbn", "titre", "auteur", "categorie",
            "exemplaires_totaux", "exemplaires_disponibles", "cote_rayonnage",
            "emplacement", "editeur", "annee_edition", "type_support", "resume",
        ]


class EmpruntBibliothequeSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_livre = serializers.CharField(source="livre_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)

    class Meta:
        model = EmpruntBibliotheque
        fields = [
            "id", "id_etablissement", "id_livre", "id_apprenant", "emprunte_le",
            "retour_prevu_le", "retourne_le", "etat_retour",
            "prolongation_compteur", "remarque",
        ]


class VisiteInfirmerieSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)

    class Meta:
        model = VisiteInfirmerie
        fields = [
            "id", "id_etablissement", "id_apprenant", "date", "motif",
            "soin_apporte", "note_allergies", "nom_infirmier",
        ]


class IncidentDisciplineSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)

    class Meta:
        model = IncidentDiscipline
        fields = [
            "id", "id_etablissement", "id_apprenant", "date", "type_incident",
            "description", "sanction", "traite_par",
        ]


class ArticleInventaireSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = ArticleInventaire
        fields = [
            "id", "id_etablissement", "code", "nom", "categorie", "quantite",
            "quantite_disponible", "seuil_alerte", "etat", "emplacement",
            "numero_serie", "date_verification", "notes_maintenance",
        ]


class PretMaterielSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_article = serializers.CharField(source="article_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True, allow_null=True)

    class Meta:
        model = PretMateriel
        fields = [
            "id", "id_etablissement", "id_article", "quantite", "type_emprunteur",
            "id_apprenant", "id_enseignant", "emprunteur_nom", "remis_le",
            "retour_prevu_le", "retourne_le", "etat_retour", "remarque",
        ]


class AncienEtudiantSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = AncienEtudiant
        fields = [
            "id", "id_etablissement", "nom_complet", "promotion", "nom_unite",
            "poste_actuel", "employeur", "ville", "telephone",
        ]
