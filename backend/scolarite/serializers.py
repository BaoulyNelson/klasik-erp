from rest_framework import serializers

from .models import (
    Apprenant,
    ContactTuteur,
    EcheancePaiement,
    ElementPedagogique,
    InscriptionApprenant,
    UniteAcademique,
)


def decimal_entier(valeur):
    if valeur is None:
        return None
    return int(valeur) if valeur == valeur.to_integral() else float(valeur)


class UniteAcademiqueSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = UniteAcademique
        fields = [
            "id",
            "id_etablissement",
            "code",
            "nom",
            "categorie",
            "niveau_ou_duree",
            "indication_horaire",
            "capacite",
            "frais_scolarite_htg",
            "frais_inscription_htg",
            "repartition_facturation",
            "responsable_nom",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["capacite"] = int(donnees["capacite"])
        donnees["frais_scolarite_htg"] = decimal_entier(instance.frais_scolarite_htg)
        donnees["frais_inscription_htg"] = decimal_entier(instance.frais_inscription_htg)
        return donnees


class ElementPedagogiqueSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_unite = serializers.CharField(source="unite_id", read_only=True)

    class Meta:
        model = ElementPedagogique
        fields = [
            "id",
            "id_etablissement",
            "id_unite",
            "code",
            "nom",
            "nature",
            "coefficient_ou_credits",
            "volume_horaire_total",
            "id_enseignant",
            "libelle_periode",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["coefficient_ou_credits"] = decimal_entier(instance.coefficient_ou_credits)
        donnees["volume_horaire_total"] = int(donnees["volume_horaire_total"])
        return donnees


class ContactTuteurSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactTuteur
        fields = [
            "nom_complet",
            "lien_parente",
            "telephone",
            "est_contact_urgence",
            "retrait_autorise",
        ]


class EcheancePaiementSerializer(serializers.ModelSerializer):
    class Meta:
        model = EcheancePaiement
        fields = [
            "id",
            "libelle",
            "date_echeance",
            "montant_du_htg",
            "montant_paye_htg",
            "statut",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["montant_du_htg"] = decimal_entier(instance.montant_du_htg)
        donnees["montant_paye_htg"] = decimal_entier(instance.montant_paye_htg)
        return donnees


class ApprenantSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_unite = serializers.CharField(source="unite_id", read_only=True)
    tuteurs = ContactTuteurSerializer(many=True, required=False, read_only=True)
    echeancier = EcheancePaiementSerializer(many=True, required=False, read_only=True)

    class Meta:
        model = Apprenant
        fields = [
            "id",
            "id_etablissement",
            "matricule",
            "prenom",
            "nom",
            "sexe",
            "date_naissance",
            "lieu_naissance",
            "telephone",
            "courriel",
            "adresse",
            "id_unite",
            "libelle_niveau",
            "date_inscription",
            "indice_etape",
            "statut",
            "total_du_htg",
            "total_paye_htg",
            "statut_paiement",
            "moyenne_generale",
            "taux_assiduite",
            "credits_acquis",
            "credits_requis",
            "pourcentage_bourse",
            "nationalite",
            "mobilite_internationale",
            "reference_visa_passeport",
            "tuteurs",
            "entreprise_stage",
            "dossier_complet",
            "pieces_manquantes",
            "echeancier",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        for champ in (
            "total_du_htg",
            "total_paye_htg",
            "moyenne_generale",
            "taux_assiduite",
            "credits_acquis",
            "credits_requis",
            "pourcentage_bourse",
        ):
            valeur = getattr(instance, champ)
            donnees[champ] = decimal_entier(valeur) if valeur is not None else None
        donnees["indice_etape"] = int(donnees["indice_etape"])
        return donnees


class InscriptionApprenantSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)
    id_unite = serializers.CharField(source="unite_id", read_only=True)

    class Meta:
        model = InscriptionApprenant
        fields = [
            "id",
            "id_etablissement",
            "id_apprenant",
            "numero_inscription",
            "annee_academique",
            "libelle_periode",
            "id_unite",
            "libelle_niveau",
            "type_inscription",
            "date_inscription",
            "statut_inscription",
            "montant_brut_htg",
            "pourcentage_bourse",
            "montant_net_htg",
            "pieces_fournies",
            "option_cantine",
            "option_transport",
            "motif_statut",
            "observations",
            "cree_le",
            "modifie_le",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["montant_brut_htg"] = decimal_entier(instance.montant_brut_htg)
        donnees["pourcentage_bourse"] = decimal_entier(instance.pourcentage_bourse)
        donnees["montant_net_htg"] = decimal_entier(instance.montant_net_htg)
        return donnees
