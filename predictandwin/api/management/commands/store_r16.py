from django.core.management.base import BaseCommand
from django.db.models import F

from main.models import User


class Command(BaseCommand):
    help = "Copies each user's current 'points' value into 'points_of_rd16' for all users."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many users would be updated without saving changes.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        total = User.objects.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[Dry run] Would update points_of_rd16 for {total} user(s)."
                )
            )
            return

        updated = User.objects.update(points_of_rd16=F("points"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully updated points_of_rd16 for {updated} user(s)."
            )
        )