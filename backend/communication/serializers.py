from rest_framework import serializers

from .models import ArticleActualite, MessageCommunication, Notification


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
