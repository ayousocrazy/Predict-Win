from django.contrib import admin
from .models import Country


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "iso3",
        "iso2",
    )

    search_fields = (
        "name",
        "iso2",
        "iso3",
    )

    ordering = ("name",)