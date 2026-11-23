from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from .models import AbonnementService, BulletinPaie, DemandeConge, Depense, Paiement


def decimal_nombre(valeur):
    if valeur is None:
        return None
    return int(valeur) if valeur == valeur.to_integral() else float(valeur)


MODES_PAIEMENT_UNIVERSELS = {
    "Carte bancaire (Stripe/Visa)",
    "Virement bancaire (SEPA/SWIFT)",
    "Mobile Money (Orange/Wave/M-Pesa)",
    "Chèque",
    "Espèces",
}


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

    def validate_mode_paiement(self, mode_paiement):
        vue = self.context.get("view")
        etablissement = getattr(vue, "etablissement_courant", None)
        modes_autorises = set(MODES_PAIEMENT_UNIVERSELS)
        if etablissement and etablissement.code_pays == "HT":
            modes_autorises.update({"MonCash", "NatCash"})
        if mode_paiement not in modes_autorises:
            raise serializers.ValidationError(
                "Ce mode de paiement n’est pas disponible pour le pays de l’établissement."
            )
        return mode_paiement

    def validate(self, attrs):
        mode = attrs.get("mode_paiement", self.instance.mode_paiement if self.instance else "")
        reference = attrs.get(
            "code_reference",
            self.instance.code_reference if self.instance else "",
        )
        if mode != "Espèces" and not (reference or "").strip():
            raise serializers.ValidationError(
                {"code_reference": "Une référence est requise pour ce mode de règlement."}
            )
        return attrs

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
    salaire_base_htg = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        required=False,
        allow_null=True,
    )
    primes_htg = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        required=False,
        allow_null=True,
    )
    retenues_htg = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        required=False,
    )
    montant_brut_htg = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    montant_net_htg = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

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

    def validate(self, attrs):
        instance = self.instance
        zero = Decimal("0")
        base = attrs.get(
            "salaire_base_htg",
            instance.salaire_base_htg if instance else zero,
        ) or zero
        primes = attrs.get(
            "primes_htg",
            instance.primes_htg if instance else zero,
        ) or zero
        retenues = attrs.get(
            "retenues_htg",
            instance.retenues_htg if instance else zero,
        ) or zero
        brut = (base + primes).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if brut <= zero:
            raise serializers.ValidationError(
                {"salaire_base_htg": "Le salaire brut doit être supérieur à zéro."}
            )
        if retenues > brut:
            raise serializers.ValidationError(
                {"retenues_htg": "Les retenues ne peuvent pas dépasser le salaire brut."}
            )
        attrs["salaire_base_htg"] = base
        attrs["primes_htg"] = primes
        attrs["retenues_htg"] = retenues
        attrs["montant_brut_htg"] = brut
        attrs["montant_net_htg"] = (brut - retenues).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
        return attrs

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


class DemandeCongeSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = DemandeConge
        fields = [
            "id",
            "id_etablissement",
            "nom_personnel",
            "libelle_role",
            "type_conge",
            "date_debut",
            "date_fin",
            "motif",
            "statut",
            "demande_le",
            "traite_par",
        ]
