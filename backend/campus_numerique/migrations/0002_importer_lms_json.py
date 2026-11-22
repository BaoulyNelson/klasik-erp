from django.db import migrations


def nombre(valeur):
    try:
        return __import__("decimal").Decimal(str(valeur if valeur is not None else 0))
    except Exception:
        return __import__("decimal").Decimal("0")


def importer(apps, schema_editor):
    Enregistrement = apps.get_model("donnees", "EnregistrementMetier")
    Unite = apps.get_model("scolarite", "UniteAcademique")
    Element = apps.get_model("scolarite", "ElementPedagogique")
    Apprenant = apps.get_model("scolarite", "Apprenant")
    Ressource = apps.get_model("campus_numerique", "RessourceLms")
    Devoir = apps.get_model("campus_numerique", "DevoirLms")
    Remise = apps.get_model("campus_numerique", "RemiseDevoir")

    for ligne in Enregistrement.objects.filter(collection="ressources_lms"):
        d = dict(ligne.donnees)
        unite = Unite.objects.filter(pk=d.get("id_unite"), etablissement_id=ligne.etablissement_id).first()
        element = Element.objects.filter(pk=d.get("id_element"), etablissement_id=ligne.etablissement_id).first()
        if unite is None or element is None: continue
        Ressource.objects.update_or_create(id=ligne.id_objet, defaults={"etablissement_id":ligne.etablissement_id,"unite":unite,"element":element,"titre":d.get("titre",""),"type_ressource":d.get("type_ressource","Cours PDF"),"url_ou_code":d.get("url_ou_code",""),"id_fichier_local":d.get("id_fichier_local",""),"nom_fichier":d.get("nom_fichier",""),"taille_octets":d.get("taille_octets"),"type_mime":d.get("type_mime",""),"publie_le":d.get("publie_le",""),"nom_auteur":d.get("nom_auteur","")})

    for ligne in Enregistrement.objects.filter(collection="devoirs_lms"):
        d = dict(ligne.donnees)
        unite = Unite.objects.filter(pk=d.get("id_unite"), etablissement_id=ligne.etablissement_id).first()
        element = Element.objects.filter(pk=d.get("id_element"), etablissement_id=ligne.etablissement_id).first()
        if unite is None or element is None: continue
        Devoir.objects.update_or_create(id=ligne.id_objet, defaults={"etablissement_id":ligne.etablissement_id,"unite":unite,"element":element,"titre":d.get("titre",""),"type_devoir":d.get("type_devoir",""),"theme_ou_chapitre":d.get("theme_ou_chapitre",""),"consignes":d.get("consignes",""),"publie_le":d.get("publie_le",""),"cree_par":d.get("cree_par",""),"date_limite":d.get("date_limite",""),"points_max":nombre(d.get("points_max",0)),"nombre_rendus":d.get("nombre_rendus",0),"total_attendu":d.get("total_attendu",0),"statut":d.get("statut","BROUILLON"),"pieces_jointes":d.get("pieces_jointes",[]) or [],"criteres_grille":d.get("criteres_grille",[]) or [],"commentaires_classe":d.get("commentaires_classe",[]) or []})

    for ligne in Enregistrement.objects.filter(collection="remises_devoirs_lms"):
        d = dict(ligne.donnees)
        devoir = Devoir.objects.filter(pk=d.get("id_devoir"), etablissement_id=ligne.etablissement_id).first()
        apprenant = Apprenant.objects.filter(pk=d.get("id_apprenant"), etablissement_id=ligne.etablissement_id).first()
        if devoir is None or apprenant is None: continue
        Remise.objects.update_or_create(id=ligne.id_objet, defaults={"etablissement_id":ligne.etablissement_id,"devoir":devoir,"apprenant":apprenant,"statut":d.get("statut","ASSIGNE"),"remis_le":d.get("remis_le",""),"lien_ou_fichier":d.get("lien_ou_fichier",""),"nom_fichier":d.get("nom_fichier",""),"id_fichier_local":d.get("id_fichier_local",""),"taille_octets":d.get("taille_octets"),"type_mime":d.get("type_mime",""),"pieces_remises":d.get("pieces_remises",[]) or [],"commentaire_apprenant":d.get("commentaire_apprenant",""),"note_attribuee":nombre(d["note_attribuee"]) if d.get("note_attribuee") is not None else None,"points_par_critere":d.get("points_par_critere",{}) or {},"commentaire_enseignant":d.get("commentaire_enseignant",""),"evalue_le":d.get("evalue_le",""),"evalue_par":d.get("evalue_par",""),"synchronise_bulletin":bool(d.get("synchronise_bulletin",False))})


def rollback(apps, schema_editor):
    apps.get_model("campus_numerique","RemiseDevoir").objects.all().delete()
    apps.get_model("campus_numerique","DevoirLms").objects.all().delete()
    apps.get_model("campus_numerique","RessourceLms").objects.all().delete()


class Migration(migrations.Migration):
    dependencies=[("campus_numerique","0001_initial"),("scolarite","0002_importer_scolarite_json"),("donnees","0003_entreeauditapi_nom_acteur_entreeauditapi_role_acteur")]
    operations=[migrations.RunPython(importer, rollback)]
