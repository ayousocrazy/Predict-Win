import json
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from main.models import User, Prediction, Result
from main.scoring import publish_result_and_award_points

BACKUP_DIR = Path(__file__).resolve().parent.parent.parent / "score_backups"


class Command(BaseCommand):
    help = (
        "Backs up current user points, wrong_prediction counts, and "
        "prediction points_earned to a timestamped JSON file, then resets "
        "everyone to zero and re-runs scoring for every result from scratch."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Skip the confirmation prompt.",
        )

    def handle(self, *args, **options):
        if not options["yes"]:
            confirm = input(
                "This will BACK UP current scores, then RESET all user "
                "points/wrong_prediction to 0 and recalculate every result "
                "from scratch using the current scoring logic.\n"
                "Type 'yes' to continue: "
            )
            if confirm.strip().lower() != "yes":
                self.stdout.write(self.style.WARNING("Aborted. Nothing was changed."))
                return

        # ---- 1. Backup ----
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = BACKUP_DIR / f"score_backup_{timestamp}.json"

        backup = {
            "created_at": timestamp,
            "users": [
                {
                    "id": str(u.id),
                    "username": u.username,
                    "points": str(u.points),
                    "wrong_prediction": u.wrong_prediction,
                }
                for u in User.objects.all()
            ],
            "predictions": [
                {
                    "id": str(p.id),
                    "user_id": str(p.user_id),
                    "match_id": str(p.match_id),
                    "points_earned": str(p.points_earned),
                }
                for p in Prediction.objects.all()
            ],
            "results": [
                {
                    "id": str(r.id),
                    "match_id": str(r.match_id),
                    "result_published": r.result_published,
                    "points_awarded": r.points_awarded,
                }
                for r in Result.objects.all()
            ],
        }

        with open(backup_path, "w") as f:
            json.dump(backup, f, indent=2)

        self.stdout.write(self.style.SUCCESS(f"Backup written to: {backup_path}"))

        # ---- 2. Reset ----
        with transaction.atomic():
            User.objects.update(points=0, wrong_prediction=0)
            Prediction.objects.update(points_earned=0)
            # Keep result_published as-is (results did happen); only reset
            # points_awarded so publish_result_and_award_points will re-run.
            Result.objects.update(points_awarded=False)

        self.stdout.write(self.style.SUCCESS("All users and predictions reset to 0."))

        # ---- 3. Recalculate ----
        results = Result.objects.select_related("match").all()
        count = 0
        for result in results:
            publish_result_and_award_points(result)
            count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Recalculated scores for {count} result(s).\n"
            f"If anything looks wrong, restore with:\n"
            f"  python manage.py restore_scores {backup_path}"
        ))