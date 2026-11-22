from rest_framework import serializers

from .models import AbonnementService, BulletinPaie, Depense, Paiement


def decimal_nombre(valeur):
    if valeur is None:
        return None
    return int(valeur) if valeur == valeur.to_integral() else float(valeur)


class PaiementSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)

    class Meta:
        model = Paiement
        fields = [
            "id",
            "id_etablissement",
            "numero_recu",
            "id_apprenant",
            "montant_htg",
            "mode_paiement",
            "code_reference",
            "libelle_compte_bancaire",
            "libelle",
            "paye_le",
            "encaisse_par",
            "statut",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["montant_htg"] = decimal_nombre(instance.montant_htg)
        return donnees


class DepenseSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = Depense
        fields = [
            "id",
            "id_etablissement",
            "categorie",
            "description",
            "fournisseur",
            "montant_htg",
            "payee_le",
            "enregistree_par",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["montant_htg"] = decimal_nombre(instance.montant_htg)
        return donnees


class BulletinPaieSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_personnel = serializers.CharField(source="personnel_id", read_only=True)

    class Meta:
        model = BulletinPaie
        fields = [
            "id",
            "id_etablissement",
            "id_personnel",
            "nom_personnel",
            "libelle_role",
            "libelle_mois",
            "heures_travaillees",
            "salaire_base_htg",
            "primes_htg",
            "motif_primes",
            "montant_brut_htg",
            "retenues_htg",
            "motif_retenues",
            "montant_net_htg",
            "statut",
            "mode_paiement",
            "observations",
            "paye_le",
            "cree_le",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        for champ in (
            "heures_travaillees",
            "salaire_base_htg",
            "primes_htg",
            "montant_brut_htg",
            "retenues_htg",
            "montant_net_htg",
        ):
            valeur = getattr(instance, champ)
            donnees[champ] = decimal_nombre(valeur) if valeur is not None else None
        return donnees


class AbonnementServiceSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    id_apprenant = serializers.CharField(source="apprenant_id", read_only=True)

    class Meta:
        model = AbonnementService
        fields = [
            "id",
            "id_etablissement",
            "id_apprenant",
            "type_service",
            "tarif_mensuel_ou_annuel_htg",
            "actif",
            "ligne_ou_formule",
        ]

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        donnees["tarif_mensuel_ou_annuel_htg"] = decimal_nombre(
            instance.tarif_mensuel_ou_annuel_htg
        )
        return donnees
