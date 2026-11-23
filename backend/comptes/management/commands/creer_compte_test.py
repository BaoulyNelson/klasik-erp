import secrets

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction

from comptes.models import RoleUtilisateur, Utilisateur


class Command(BaseCommand):
    help = "Crée un compte local de test et affiche son mot de passe temporaire une seule fois."

    def add_arguments(self, parser):
        parser.add_argument("courriel")
        parser.add_argument("role", choices=RoleUtilisateur.values)

    def handle(self, *args, **options):
        courriel = options["courriel"].strip().lower()
        role = options["role"]
        try:
            validate_email(courriel)
        except ValidationError as erreur:
            raise CommandError("L’adresse courriel est invalide.") from erreur

        if Utilisateur.objects.filter(courriel__iexact=courriel).exists():
            raise CommandError("Un compte utilise déjà cette adresse courriel.")

        mot_de_passe = secrets.token_urlsafe(24)
        nom_complet = courriel.partition("@")[0].replace(".", " ").replace("-", " ").title()
        profil = {
            "est_compte_demo": True,
            "doit_changer_mot_de_passe": True,
        }

        try:
            with transaction.atomic():
                if role == RoleUtilisateur.SUPER_ADMIN:
                    utilisateur = Utilisateur.objects.create_superuser(
                        courriel,
                        mot_de_passe,
                        nom_complet=nom_complet,
                        profil=profil,
                    )
                else:
                    utilisateur = Utilisateur.objects.create_user(
                        courriel,
                        mot_de_passe,
                        nom_complet=nom_complet,
                        role=role,
                        profil=profil,
                    )
        except IntegrityError as erreur:
            raise CommandError("Un compte utilise déjà cette adresse courriel.") from erreur

        self.stdout.write(
            self.style.SUCCESS(
                f"Compte de test créé : {utilisateur.courriel} ({utilisateur.role})."
            )
        )
        self.stdout.write(
            self.style.WARNING(
                f"Mot de passe temporaire (à noter, affiché une seule fois) : {mot_de_passe}"
            )
        )
