from rest_framework import serializers

from etablissements.models import Etablissement
from scolarite.models import ElementPedagogique, UniteAcademique

from .models import (
    CreneauEmploiDuTemps,
    EntreeCahierTextes,
    EvenementCalendrier,
    NoteEvaluation,
    PersonnelEnseignant,
    Presence,
    Soutenance,
)


def decimal_nombre(valeur):
    if valeur is None:
        return None
    return int(valeur) if valeur == valeur.to_integral() else float(valeur)


class PersonnelEnseignantSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = PersonnelEnseignant
        fields = [
            "id",
            "id_etablissement",
            "code",
            "nom_complet",
            "specialite",
            "type_contrat",
            "telephone",
            "courriel",
            "ids_unites_assignees",
            "ids_elements_assignes",
            "heures_mensuelles",
            "taux_horaire_ou_mensuel_htg",
        ]

    def validate(self, attrs):
        vue = self.context.get("view")
        etablissement = getattr(vue, "etablissement_courant", None)
        if not isinstance(etablissement, Etablissement):
            return attrs

        ids_unites = attrs.get(
            "ids_unites_assignees",
            self.instance.ids_unites_assignees if self.instance else [],
        )
        ids_elements = attrs.get(
            "ids_elements_assignes",
            self.instance.ids_elements_assignes if self.instance else [],
        )
        for champ, identifiants in (
            ("ids_unites_assignees", ids_unites),
            ("ids_elements_assignes", ids_elements),
        ):
            if not isinstance(identifiants, list) or any(
                not isinstance(identifiant, str) or not identifiant
                for identifiant in identifiants
            ):
                raise serializers.ValidationError(
                    {champ: "Les affectations doivent être une liste d’identifiants valides."}
                )
            if len(identifiants) != len(set(identifiants)):
                raise serializers.ValidationError(
                    {champ: "Une affectation ne peut pas être répétée."}
                )

        unites_valides = set(
            UniteAcademique.objects.filter(
                etablissement=etablissement,
                pk__in=ids_unites,
            ).values_list("pk", flat=True)
        )
        if unites_valides != set(ids_unites):
            raise serializers.ValidationError(
                {"ids_unites_assignees": "Une unité affectée n’appartient pas à cet établissement."}
            )

        elements = ElementPedagogique.objects.filter(
            etablissement=etablissement,
            pk__in=ids_elements,
        ).values_list("pk", "unite_id")
        elements_par_id = dict(elements)
        if set(elements_par_id) != set(ids_elements):
            raise serializers.ValidationError(
                {"ids_elements_assignes": "Un élément affecté n’appartient pas à cet établissement."}
            )
        unites_elements = {id_unite for id_unite in elements_par_id.values()}
        if not unites_elements.issubset(unites_valides):
            raise serializers.ValidationError(
                {"ids_unites_assignees": "Chaque unité des éléments affectés doit aussi être affectée."}
            )
        return attrs

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["heures_mensuelles"] = int(donnees["heures_mensuelles"])
        donnees["taux_horaire_ou_mensuel_htg"] = decimal_nombre(
            instance.taux_horaire_ou_mensuel_htg
        )
        return donnees


class NoteEvaluationSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)
    id_element = serializers.CharField(source="element_id", read_only=True)

    class Meta:
        model = NoteEvaluation
        fields = [
            "id",
            "id_etablissement",
            "id_apprenant",
            "id_element",
            "libelle_periode",
            "type_evaluation",
            "note",
            "note_maximale",
            "verrouillee",
            "enregistree_le",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["note"] = decimal_nombre(instance.note)
        donnees["note_maximale"] = decimal_nombre(instance.note_maximale)
        return donnees


class PresenceSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)
    id_unite = serializers.CharField(source="unite_id", read_only=True)

    class Meta:
        model = Presence
        fields = ["id", "id_etablissement", "id_apprenant", "date", "statut", "id_unite", "observation"]


class CreneauEmploiDuTempsSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_unite = serializers.CharField(source="unite_id", read_only=True)
    id_element = serializers.CharField(source="element_id", read_only=True)
    id_enseignant = serializers.CharField(source="enseignant_id", read_only=True)

    class Meta:
        model = CreneauEmploiDuTemps
        fields = [
            "id",
            "id_etablissement",
            "id_unite",
            "id_element",
            "id_enseignant",
            "salle",
            "jour_semaine",
            "heure_debut",
            "heure_fin",
        ]


class EvenementCalendrierSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = EvenementCalendrier
        fields = [
            "id",
            "id_etablissement",
            "type",
            "titre",
            "date_debut",
            "date_fin",
            "concerne_unites",
            "description",
        ]


class EntreeCahierTextesSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_unite = serializers.CharField(source="unite_id", read_only=True)
    id_element = serializers.CharField(source="element_id", read_only=True)

    class Meta:
        model = EntreeCahierTextes
        fields = [
            "id",
            "id_etablissement",
            "id_unite",
            "id_element",
            "nom_enseignant",
            "date",
            "sujet",
            "devoir_donne",
        ]


class SoutenanceSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)

    class Meta:
        model = Soutenance
        fields = [
            "id",
            "id_etablissement",
            "id_apprenant",
            "titre",
            "nom_directeur_memoire",
            "membres_jury",
            "date_soutenance",
            "note",
            "statut",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["note"] = decimal_nombre(instance.note) if instance.note is not None else None
        return donnees
