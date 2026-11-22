from django.db import migrations


def importer(apps, schema_editor):
    Enregistrement = apps.get_model("donnees","EnregistrementMetier")
    Apprenant = apps.get_model("scolarite","Apprenant")
    Consentement = apps.get_model("securite","ConsentementRgpd")
    Demande = apps.get_model("securite","DemandeRgpd")
    Lot = apps.get_model("securite","LotImportation")
    Badge = apps.get_model("securite","AttributionBadge")

    for ligne in Enregistrement.objects.filter(collection="consentements_rgpd"):
        d=dict(ligne.donnees); a=Apprenant.objects.filter(pk=d.get("id_apprenant"),etablissement_id=ligne.etablissement_id).first()
        if a is None: continue
        Consentement.objects.update_or_create(id=ligne.id_objet,defaults={"etablissement_id":ligne.etablissement_id,"apprenant":a,"droit_image":bool(d.get("droit_image",False)),"traitement_donnees":bool(d.get("traitement_donnees",False)),"accord_parental":bool(d.get("accord_parental",False)),"consentement_sms_whatsapp":bool(d.get("consentement_sms_whatsapp",False)),"mis_a_jour_le":d.get("mis_a_jour_le",""),"mis_a_jour_par":d.get("mis_a_jour_par","")})
    for ligne in Enregistrement.objects.filter(collection="demandes_rgpd"):
        d=dict(ligne.donnees); a=Apprenant.objects.filter(pk=d.get("id_apprenant"),etablissement_id=ligne.etablissement_id).first()
        if a is None: continue
        Demande.objects.update_or_create(id=ligne.id_objet,defaults={"etablissement_id":ligne.etablissement_id,"apprenant":a,"type_demande":d.get("type_demande","EXPORT_DONNEES"),"statut":d.get("statut","EN_ATTENTE"),"demandee_le":d.get("demandee_le",""),"traitee_le":d.get("traitee_le",""),"observations":d.get("observations","")})
    for ligne in Enregistrement.objects.filter(collection="journaux_importations"):
        d=dict(ligne.donnees)
        Lot.objects.update_or_create(id=ligne.id_objet,defaults={"etablissement_id":ligne.etablissement_id,"cible":d.get("cible",""),"nom_fichier":d.get("nom_fichier",""),"statut":d.get("statut",""),"nombre_lignes":d.get("nombre_lignes",0),"nombre_erreurs":d.get("nombre_erreurs",0),"importe_le":d.get("importe_le",""),"importe_par":d.get("importe_par",""),"resume":d.get("resume",{}) or {}})
    for ligne in Enregistrement.objects.filter(collection="badges_attribues"):
        d=dict(ligne.donnees); a=Apprenant.objects.filter(pk=d.get("id_apprenant"),etablissement_id=ligne.etablissement_id).first()
        if a is None: continue
        Badge.objects.update_or_create(id=ligne.id_objet,defaults={"etablissement_id":ligne.etablissement_id,"apprenant":a,"code_badge":d.get("code_badge",""),"titre":d.get("titre",""),"attribue_le":d.get("attribue_le",""),"attribue_par":d.get("attribue_par","")})


def rollback(apps, schema_editor):
    for modele in ("AttributionBadge","LotImportation","DemandeRgpd","ConsentementRgpd"):
        apps.get_model("securite",modele).objects.all().delete()


class Migration(migrations.Migration):
    dependencies=[("securite","0001_initial"),("scolarite","0002_importer_scolarite_json"),("donnees","0003_entreeauditapi_nom_acteur_entreeauditapi_role_acteur")]
    operations=[migrations.RunPython(importer,rollback)]
