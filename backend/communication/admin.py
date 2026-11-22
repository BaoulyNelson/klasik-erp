from django.contrib import admin

from .models import ArticleActualite, MessageCommunication, Notification


admin.site.register(MessageCommunication)
admin.site.register(Notification)
admin.site.register(ArticleActualite)

# Register your models here.
