from django.contrib import admin

from .models import AbonnementService, BulletinPaie, Depense, Paiement


admin.site.register(Paiement)
admin.site.register(Depense)
admin.site.register(BulletinPaie)
admin.site.register(AbonnementService)

# Register your models here.
