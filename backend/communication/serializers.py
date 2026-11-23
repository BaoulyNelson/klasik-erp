from rest_framework import serializers

from comptes.models import AffiliationEtablissement, RoleUtilisateur, Utilisateur
from .models import (
    ArticleActualite,
    FilDiscussionDirecte,
    MessageCommunication,
    MessageDirect,
    Notification,
)


class MessageDirectSerializer(serializers.ModelSerializer):
    est_de_moi = serializers.SerializerMethodField()

    class Meta:
        model = MessageDirect
        fields = [
            "id",
            "nom_expediteur",
            "role_expediteur",
            "contenu",
            "envoye_le",
            "est_de_moi",
        ]
        read_only_fields = ["est_de_moi"]

    def get_est_de_moi(self, instance):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and instance.nom_expediteur.casefold() == request.user.nom_complet.casefold()
        )


class FilDiscussionDirecteSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)
    messages = MessageDirectSerializer(many=True, required=True, allow_empty=False)

    class Meta:
        model = FilDiscussionDirecte
        fields = [
            "id",
            "id_etablissement",
            "sujet",
            "nom_interlocuteur",
            "role_interlocuteur",
            "categorie",
            "messages_non_lus",
            "mis_a_jour_le",
            "messages",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        view = self.context.get("view")
        if not request or not view:
            return attrs

        if self.instance and attrs.get(
            "nom_interlocuteur", self.instance.nom_interlocuteur
        ) != self.instance.nom_interlocuteur:
            raise serializers.ValidationError(
                {"nom_interlocuteur": "Le destinataire d’un fil existant ne peut pas être remplacé."}
            )

        messages = attrs.get("messages", [])
        ids = [message["id"] for message in messages]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError({"messages": "Les identifiants de messages doivent être uniques."})
        messages_existants = MessageDirect.objects.filter(pk__in=ids)
        if self.instance:
            messages_existants = messages_existants.exclude(fil=self.instance)
        ids_existants = set(messages_existants.values_list("pk", flat=True))
        if ids_existants:
            raise serializers.ValidationError(
                {"messages": "Un identifiant de message appartient déjà à une autre discussion."}
            )

        if not self.instance and "nom_interlocuteur" in attrs:
            tenant = getattr(view, "etablissement_courant", None)
            affiliations = AffiliationEtablissement.objects.filter(
                etablissement=tenant,
                utilisateur__is_active=True,
                utilisateur__nom_complet__iexact=attrs["nom_interlocuteur"].strip(),
            ).select_related("utilisateur")
            destinataires = {
                affiliation.utilisateur_id: affiliation.utilisateur
                for affiliation in affiliations
            }
            if len(destinataires) != 1:
                raise serializers.ValidationError(
                    {
                        "nom_interlocuteur": (
                            "Le destinataire doit correspondre à un compte actif unique de cet établissement."
                        )
                    }
                )
            self._destinataire = next(iter(destinataires.values()))
        return attrs

    def _role_expediteur(self):
        request = self.context["request"]
        role = request.user.role
        view = self.context["view"]
        role = getattr(view, "role_actif", role)
        return dict(RoleUtilisateur.choices).get(role, role)

    def _creer_message(self, fil, donnees, ordre):
        request = self.context["request"]
        donnees.pop("est_de_moi", None)
        donnees["nom_expediteur"] = request.user.nom_complet
        donnees["role_expediteur"] = self._role_expediteur()
        return MessageDirect.objects.create(fil=fil, ordre=ordre, **donnees)

    def create(self, validated_data):
        messages = validated_data.pop("messages")
        fil = FilDiscussionDirecte.objects.create(**validated_data)
        fil.participants.add(self.context["request"].user, self._destinataire)
        for ordre, donnees in enumerate(messages):
            self._creer_message(fil, donnees, ordre)
        return fil

    def update(self, instance, validated_data):
        messages = validated_data.pop("messages", None)
        for attribut, valeur in validated_data.items():
            setattr(instance, attribut, valeur)
        instance.save()

        if messages is not None:
            existants = {message.id: message for message in instance.messages.all()}
            prochain_ordre = max((message.ordre for message in existants.values()), default=-1) + 1
            for donnees in messages:
                message = existants.get(donnees["id"])
                if message:
                    champs_immutables = (
                        "nom_expediteur",
                        "role_expediteur",
                        "contenu",
                        "envoye_le",
                    )
                    if any(
                        donnees[champ] != getattr(message, champ)
                        for champ in champs_immutables
                    ):
                        raise serializers.ValidationError(
                            {"messages": "Un message déjà envoyé ne peut pas être modifié."}
                        )
                    continue
                self._creer_message(instance, donnees, prochain_ordre)
                prochain_ordre += 1
        return instance


class MessageCommunicationSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = MessageCommunication
        fields = [
            "id",
            "id_etablissement",
            "titre",
            "contenu",
            "canal",
            "audience",
            "envoye_le",
            "envoye_par",
            "nombre_destinataires",
        ]


class NotificationSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "id_etablissement",
            "titre",
            "description",
            "severite",
            "cree_le",
            "lue",
            "route_cible",
        ]


class ArticleActualiteSerializer(serializers.ModelSerializer):
    id_etablissement = serializers.CharField(source="etablissement_id", read_only=True)

    class Meta:
        model = ArticleActualite
        fields = [
            "id",
            "id_etablissement",
            "titre",
            "categorie",
            "resume",
            "contenu",
            "publie_le",
            "date_evenement",
            "lieu",
            "nom_auteur",
            "epingle",
            "audience",
        ]
