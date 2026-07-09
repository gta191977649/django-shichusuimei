from django.contrib import admin
from suimei.model.meishiki import Meishiki
from suimei.model.wiki import Wiki
from suimei.model.bunseki import Bunseki
from django.db import models
from ckeditor.widgets import CKEditorWidget
from prettyjson import PrettyJSONWidget
from django.utils.text import Truncator

# Register your models here.
class BunsekiAdmin(admin.ModelAdmin):
    # show id, meishiki_id, previews, and timestamp
    list_display = ("meishiki_id_display", "content_preview", "reason_preview", "created_at_display")

    # enable pretty JSON editor for `content`
    # formfield_overrides = {
    #     models.JSONField: {"widget": PrettyJSONWidget()},
    # }

    @admin.display(description="meishiki_id")
    def meishiki_id_display(self, obj: Bunseki):
        # FK id without extra query (uses *_id column)
        return obj.meishiki_id

    @admin.display(description="content")
    def content_preview(self, obj: Bunseki):
        # stringify JSON, then truncate to 50 chars with …
        text = ""
        try:
            # keep it compact; fallback to str if needed
            import json
            text = json.dumps(obj.content, ensure_ascii=False, separators=(",", ":"))
        except Exception:
            text = str(obj.content)
        return Truncator(text).chars(50, html=False)

    @admin.display(description="reason")
    def reason_preview(self, obj: Bunseki):
        # handle missing field gracefully
        val = getattr(obj, "reason", "")
        if val is None:
            val = ""
        return Truncator(str(val)).chars(50, html=False)

    @admin.display(description="created at")
    def created_at_display(self, obj: Bunseki):
        # show timestamp without seconds fraction for readability
        return obj.created_at.strftime("%Y-%m-%d %H:%M:%S")

class WikiAdmin(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': CKEditorWidget()},
    }
    list_display = ('key',  'tag')


admin.site.register(Bunseki, BunsekiAdmin)
admin.site.register(Wiki, WikiAdmin)
# Register your models here.
admin.site.register(Meishiki)
# @admin.register(Wiki)
# class WikiAdmin(admin.ModelAdmin):    z
#     list_display = ('key', 'tag')
