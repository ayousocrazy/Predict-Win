import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from main.models import User, Prediction, Result


class Command(BaseCommand):
    help = (
        "Restores user points/wrong_prediction, prediction points_earned, "
        "and result flags from a JSON backup produced by "
        "recalculate_all_scores."
    )

    def add_arguments(self, parser):
        parser.add_argument("backup_file", type=str, help="Path to the backup JSON file")

    def handle(self, *args, **options):
        path = Path(options["backup_file"])
        if not path.exists():
            raise CommandError(f"Backup file not found: {path}")

        with open(path) as f:
            backup = json.load(f)

        with transaction.atomic():
            for u in backup["users"]:
                User.objects.filter(id=u["id"]).update(
                    points=u["points"],
                    wrong_prediction=u["wrong_prediction"],
                )
            for p in backup["predictions"]:
                Prediction.objects.filter(id=p["id"]).update(
                    points_earned=p["points_earned"],
                )
            for r in backup["results"]:
                Result.objects.filter(id=r["id"]).update(
                    result_published=r["result_published"],
                    points_awarded=r["points_awarded"],
                )

        self.stdout.write(self.style.SUCCESS(f"Restored scores from: {path}"))