from django.contrib import admin

from .models import AttributionBadge, ConsentementRgpd, DemandeRgpd, LotImportation

admin.site.register(ConsentementRgpd)
admin.site.register(DemandeRgpd)
admin.site.register(LotImportation)
admin.site.register(AttributionBadge)

# Register your models here.
