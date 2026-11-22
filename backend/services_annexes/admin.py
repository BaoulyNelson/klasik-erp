from django.contrib import admin

from .models import (
    AncienEtudiant,
    ArticleInventaire,
    EmpruntBibliotheque,
    IncidentDiscipline,
    LivreBibliotheque,
    PretMateriel,
    VisiteInfirmerie,
)


admin.site.register(LivreBibliotheque)
admin.site.register(EmpruntBibliotheque)
admin.site.register(VisiteInfirmerie)
admin.site.register(IncidentDiscipline)
admin.site.register(ArticleInventaire)
admin.site.register(PretMateriel)
admin.site.register(AncienEtudiant)

# Register your models here.
