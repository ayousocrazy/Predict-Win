import pycountry

from django.core.management.base import BaseCommand
from api.models import Country


class Command(BaseCommand):
    help = "Import countries into the database"

    def handle(self, *args, **kwargs):

        if Country.objects.exists():
            self.stdout.write(
                self.style.WARNING("Countries have already been imported.")
            )
            return

        countries = []

        for c in pycountry.countries:
            iso2 = c.alpha_2
            iso3 = c.alpha_3

            countries.append(
                Country(
                    name=c.name,
                    official_name=getattr(c, "official_name", c.name),
                    iso2=iso2,
                    iso3=iso3,
                    flag_png=f"https://flagcdn.com/w320/{iso2.lower()}.png",
                    flag_svg=f"https://flagcdn.com/{iso2.lower()}.svg",
                )
            )

        Country.objects.bulk_create(countries)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully imported {len(countries)} countries."
            )
        )