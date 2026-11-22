import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class RoleUtilisateur(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super-administrateur Plateforme"
    DIRECTEUR = "DIRECTEUR", "Directeur / Recteur / Doyen"
    ADMIN_ETAB = "ADMIN_ETAB", "Administrateur de l’établissement"
    SCOLARITE = "SCOLARITE", "Agent d’inscription / Scolarité"
    ECONOME = "ECONOME", "Économe / Caissier / Comptable"
    DIR_ETUDES = "DIR_ETUDES", "Directeur des études / Préfet"
    ENSEIGNANT = "ENSEIGNANT", "Enseignant / Formateur / Chargé de cours"
    RESP_STAGES = "RESP_STAGES", "Responsable des stages"
    SERVICES_ANNEXES = "SERVICES_ANNEXES", "Bibliothécaire / Infirmier / Cantine"
    PARENT = "PARENT", "Parent / Tuteur"
    APPRENANT = "APPRENANT", "Apprenant / Élève / Étudiant"
    AUDITEUR = "AUDITEUR", "Auditeur / Lecture seule"


class GestionnaireUtilisateurs(BaseUserManager["Utilisateur"]):
    use_in_migrations = True

    def create_user(self, courriel: str, password: str | None = None, **extra_fields):
        if not courriel:
            raise ValueError("Une adresse courriel est obligatoire.")
        adresse = self.normalize_email(courriel).strip().lower()
        utilisateur = self.model(courriel=adresse, **extra_fields)
        utilisateur.set_password(password)
        utilisateur.save(using=self._db)
        return utilisateur

    def create_superuser(self, courriel: str, password: str, **extra_fields):
        extra_fields.setdefault("nom_complet", "Super-administrateur")
        extra_fields.setdefault("role", RoleUtilisateur.SUPER_ADMIN)
        extra_fields.setdefault("est_super_admin_plateforme", True)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Un super-administrateur doit avoir le statut staff.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Un super-administrateur doit avoir le statut superuser.")
        return self.create_user(courriel, password, **extra_fields)


class Utilisateur(AbstractBaseUser, PermissionsMixin):
    id = models.CharField(max_length=128, primary_key=True, default=uuid.uuid4, editable=False)
    courriel = models.EmailField(max_length=191, unique=True)
    nom_complet = models.CharField(max_length=120)
    telephone = models.CharField(max_length=64, blank=True)
    profil = models.JSONField(default=dict)
    role = models.CharField(
        max_length=32,
        choices=RoleUtilisateur.choices,
        default=RoleUtilisateur.AUDITEUR,
    )
    est_super_admin_plateforme = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, verbose_name="actif")
    is_staff = models.BooleanField(default=False, verbose_name="accès à l’administration")
    courriel_verifie = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now, verbose_name="créé le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="modifié le")

    objects = GestionnaireUtilisateurs()

    USERNAME_FIELD = "courriel"
    REQUIRED_FIELDS = ["nom_complet"]
    EMAIL_FIELD = "courriel"

    class Meta:
        ordering = ["nom_complet", "courriel"]
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self) -> str:
        return self.courriel

    @property
    def est_actif(self) -> bool:
        return self.is_active


class AffiliationEtablissement(models.Model):
    utilisateur = models.ForeignKey(
        "comptes.Utilisateur",
        on_delete=models.CASCADE,
        related_name="affiliations",
    )
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        related_name="affiliations",
        db_column="id_etablissement",
    )
    role = models.CharField(max_length=32, choices=RoleUtilisateur.choices)
    fonction_locale = models.CharField(max_length=191, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("utilisateur", "etablissement"),
                name="comptes_unique_affiliation",
            )
        ]
        ordering = ["etablissement__nom", "utilisateur__courriel"]
        verbose_name = "affiliation d’établissement"
        verbose_name_plural = "affiliations d’établissement"

    def __str__(self) -> str:
        return f"{self.utilisateur.courriel} — {self.etablissement.code} ({self.role})"


class SurchargePermissions(models.Model):
    etablissement = models.ForeignKey(
        "etablissements.Etablissement",
        on_delete=models.CASCADE,
        related_name="surcharges_permissions",
        db_column="id_etablissement",
    )
    role = models.CharField(max_length=32, choices=RoleUtilisateur.choices)
    permissions = models.JSONField(default=list)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("etablissement", "role"),
                name="comptes_unique_surcharge_role_tenant",
            )
        ]
        ordering = ["etablissement__nom", "role"]
        verbose_name = "surcharge de permissions"
        verbose_name_plural = "surcharges de permissions"


class JetonReinitialisation(models.Model):
    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name="jetons_reinitialisation",
    )
    empreinte = models.CharField(max_length=64, unique=True)
    expire_le = models.DateTimeField()
    utilise_le = models.DateTimeField(null=True, blank=True)
    tentatives_echouees = models.PositiveSmallIntegerField(default=0)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cree_le"]
