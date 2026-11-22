from django.db import migrations


def importer(apps, schema_editor):
    Enregistrement = apps.get_model("donnees", "EnregistrementMetier")
    Apprenant = apps.get_model("scolarite", "Apprenant")
    Livre = apps.get_model("services_annexes", "LivreBibliotheque")
    Emprunt = apps.get_model("services_annexes", "EmpruntBibliotheque")
    Visite = apps.get_model("services_annexes", "VisiteInfirmerie")
    Incident = apps.get_model("services_annexes", "IncidentDiscipline")
    Article = apps.get_model("services_annexes", "ArticleInventaire")
    Pret = apps.get_model("services_annexes", "PretMateriel")
    Ancien = apps.get_model("services_annexes", "AncienEtudiant")

    for ligne in Enregistrement.objects.filter(collection="livres_bibliotheque"):
        d = dict(ligne.donnees)
        Livre.objects.update_or_create(id=ligne.id_objet, defaults={"etablissement_id": ligne.etablissement_id,"isbn":d.get("isbn",""),"titre":d.get("titre",""),"auteur":d.get("auteur",""),"categorie":d.get("categorie",""),"exemplaires_totaux":d.get("exemplaires_totaux",0),"exemplaires_disponibles":d.get("exemplaires_disponibles",0),"cote_rayonnage":d.get("cote_rayonnage",""),"emplacement":d.get("emplacement",""),"editeur":d.get("editeur",""),"annee_edition":d.get("annee_edition",""),"type_support":d.get("type_support",""),"resume":d.get("resume","")})
    for ligne in Enregistrement.objects.filter(collection="emprunts_bibliotheque"):
        d = dict(ligne.donnees)
        livre = Livre.objects.filter(pk=d.get("id_livre"), etablissement_id=ligne.etablissement_id).first()
        apprenant = Apprenant.objects.filter(pk=d.get("id_apprenant"), etablissement_id=ligne.etablissement_id).first()
        if livre is None or apprenant is None: continue
        Emprunt.objects.update_or_create(id=ligne.id_objet, defaults={"etablissement_id":ligne.etablissement_id,"livre":livre,"apprenant":apprenant,"emprunte_le":d.get("emprunte_le",""),"retour_prevu_le":d.get("retour_prevu_le",""),"retourne_le":d.get("retourne_le",""),"etat_retour":d.get("etat_retour",""),"prolongation_compteur":d.get("prolongation_compteur",0),"remarque":d.get("remarque","")})
    for ligne in Enregistrement.objects.filter(collection="visites_infirmerie"):
        d = dict(ligne.donnees); apprenant = Apprenant.objects.filter(pk=d.get("id_apprenant"), etablissement_id=ligne.etablissement_id).first()
        if apprenant is None: continue
        Visite.objects.update_or_create(id=ligne.id_objet, defaults={"etablissement_id":ligne.etablissement_id,"apprenant":apprenant,"date":d.get("date",""),"motif":d.get("motif",""),"soin_apporte":d.get("soin_apporte",""),"note_allergies":d.get("note_allergies",""),"nom_infirmier":d.get("nom_infirmier","")})
    for ligne in Enregistrement.objects.filter(collection="incidents_discipline"):
        d = dict(ligne.donnees); apprenant = Apprenant.objects.filter(pk=d.get("id_apprenant"), etablissement_id=ligne.etablissement_id).first()
        if apprenant is None: continue
        Incident.objects.update_or_create(id=ligne.id_objet, defaults={"etablissement_id":ligne.etablissement_id,"apprenant":apprenant,"date":d.get("date",""),"type_incident":d.get("type_incident",""),"description":d.get("description",""),"sanction":d.get("sanction",""),"traite_par":d.get("traite_par","")})
    for ligne in Enregistrement.objects.filter(collection="inventaire"):
        d = dict(ligne.donnees)
        Article.objects.update_or_create(id=ligne.id_objet, defaults={"etablissement_id":ligne.etablissement_id,"code":d.get("code",""),"nom":d.get("nom",""),"categorie":d.get("categorie",""),"quantite":d.get("quantite",0),"quantite_disponible":d.get("quantite_disponible",d.get("quantite",0)),"seuil_alerte":d.get("seuil_alerte",0),"etat":d.get("etat","Bon état"),"emplacement":d.get("emplacement",""),"numero_serie":d.get("numero_serie",""),"date_verification":d.get("date_verification",""),"notes_maintenance":d.get("notes_maintenance","")})
    for ligne in Enregistrement.objects.filter(collection="prets_materiels"):
        d = dict(ligne.donnees); article = Article.objects.filter(pk=d.get("id_article"), etablissement_id=ligne.etablissement_id).first()
        if article is None: continue
        apprenant = Apprenant.objects.filter(pk=d.get("id_apprenant"), etablissement_id=ligne.etablissement_id).first() if d.get("id_apprenant") else None
        Pret.objects.update_or_create(id=ligne.id_objet, defaults={"etablissement_id":ligne.etablissement_id,"article":article,"quantite":d.get("quantite",1),"type_emprunteur":d.get("type_emprunteur","Apprenant"),"apprenant":apprenant,"id_enseignant":d.get("id_enseignant",""),"emprunteur_nom":d.get("emprunteur_nom",""),"remis_le":d.get("remis_le",""),"retour_prevu_le":d.get("retour_prevu_le",""),"retourne_le":d.get("retourne_le",""),"etat_retour":d.get("etat_retour",""),"remarque":d.get("remarque","")})
    for ligne in Enregistrement.objects.filter(collection="anciens"):
        d = dict(ligne.donnees)
        Ancien.objects.update_or_create(id=ligne.id_objet, defaults={"etablissement_id":ligne.etablissement_id,"nom_complet":d.get("nom_complet",""),"promotion":d.get("promotion",""),"nom_unite":d.get("nom_unite",""),"poste_actuel":d.get("poste_actuel",""),"employeur":d.get("employeur",""),"ville":d.get("ville",""),"telephone":d.get("telephone","")})


def rollback(apps, schema_editor):
    for modele in ("AncienEtudiant","PretMateriel","ArticleInventaire","IncidentDiscipline","VisiteInfirmerie","EmpruntBibliotheque","LivreBibliotheque"):
        apps.get_model("services_annexes", modele).objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("services_annexes","0001_initial"),
        ("scolarite","0002_importer_scolarite_json"),
        ("donnees","0003_entreeauditapi_nom_acteur_entreeauditapi_role_acteur"),
    ]
    operations=[migrations.RunPython(importer, rollback)]
