from django.contrib import admin

from .models import DevoirLms, RemiseDevoir, RessourceLms

admin.site.register(RessourceLms)
admin.site.register(DevoirLms)
admin.site.register(RemiseDevoir)

# Register your models here.
