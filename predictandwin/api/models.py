from django.db import models


class Country(models.Model):
    name = models.CharField(max_length=100)
    official_name = models.CharField(max_length=200, blank=True)

    # Nepal -> NP
    iso2 = models.CharField(max_length=2, unique=True)

    # Nepal -> NPL
    iso3 = models.CharField(max_length=3, unique=True)

    flag_png = models.URLField()
    flag_svg = models.URLField()

    fifa_code = models.CharField(
        max_length=3,
        blank=True,
        help_text="Usually same as ISO3."
    )

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.fifa_code:
            self.fifa_code = self.iso3
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.iso3})"