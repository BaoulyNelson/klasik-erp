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
    frais_scolarite_htg = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        required=False,
    )
    frais_inscription_htg = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        required=False,
    )

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

    def validate_id_enseignant(self, id_enseignant):
        vue = self.context.get("view")
        etablissement = getattr(vue, "etablissement_courant", None)
        if id_enseignant and etablissement is not None:
            from pedagogie.models import PersonnelEnseignant

            if not PersonnelEnseignant.objects.filter(
                etablissement=etablissement,
                pk=id_enseignant,
            ).exists():
                raise serializers.ValidationError(
                    "Cet enseignant n’appartient pas à l’établissement."
                )
        return id_enseignant

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

    def validate(self, attrs):
        instance = self.instance
        statut_inscription = attrs.get(
            "statut_inscription",
            instance.statut_inscription if instance else "VALIDEE",
        )
        if statut_inscription not in {"VALIDEE", "ANNULEE", "ARCHIVEE"}:
            raise serializers.ValidationError(
                {"statut_inscription": "Le statut d’inscription est invalide."}
            )
        if instance and statut_inscription != instance.statut_inscription:
            if instance.statut_inscription != "VALIDEE" or statut_inscription not in {
                "ANNULEE",
                "ARCHIVEE",
            }:
                raise serializers.ValidationError(
                    {"statut_inscription": "Cette transition de statut n’est pas autorisée."}
                )
            motif = attrs.get("motif_statut", "")
            if not isinstance(motif, str) or not motif.strip():
                raise serializers.ValidationError(
                    {"motif_statut": "Un motif est obligatoire pour changer le statut."}
                )
        montant_brut = attrs.get(
            "montant_brut_htg",
            instance.montant_brut_htg if instance else 0,
        )
        pourcentage_bourse = attrs.get(
            "pourcentage_bourse",
            instance.pourcentage_bourse if instance else 0,
        )
        montant_net = attrs.get(
            "montant_net_htg",
            instance.montant_net_htg if instance else 0,
        )
        if montant_brut < 0:
            raise serializers.ValidationError(
                {"montant_brut_htg": "Le montant brut ne peut pas être négatif."}
            )
        if not 0 <= pourcentage_bourse <= 100:
            raise serializers.ValidationError(
                {"pourcentage_bourse": "Le pourcentage de bourse doit être compris entre 0 et 100."}
            )
        if montant_net < 0:
            raise serializers.ValidationError(
                {"montant_net_htg": "Le montant net ne peut pas être négatif."}
            )
        return attrs

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["montant_brut_htg"] = decimal_entier(instance.montant_brut_htg)
        donnees["pourcentage_bourse"] = decimal_entier(instance.pourcentage_bourse)
        donnees["montant_net_htg"] = decimal_entier(instance.montant_net_htg)
        return donnees
