from django.contrib import admin

from .models import (
    CreneauEmploiDuTemps,
    EntreeCahierTextes,
    EvenementCalendrier,
    NoteEvaluation,
    PersonnelEnseignant,
    Presence,
    Soutenance,
)


admin.site.register(PersonnelEnseignant)
admin.site.register(NoteEvaluation)
admin.site.register(Presence)
admin.site.register(CreneauEmploiDuTemps)
admin.site.register(EvenementCalendrier)
admin.site.register(EntreeCahierTextes)
admin.site.register(Soutenance)

# Register your models here.
