from django.db import transaction
from django.db.models import F

from .models import Prediction


def score_prediction(prediction, result):
    points = 0

    # Determine actual outcome
    if result.full_time_country1 > result.full_time_country2:
        actual_winner = result.match.country1.name
    elif result.full_time_country2 > result.full_time_country1:
        actual_winner = result.match.country2.name
    else:
        actual_winner = "draw"

    # Match Winner — 20
    if prediction.predicted_winner == actual_winner:
        points += 20

    # Full Time Score — 20
    if (prediction.full_time_country1 == result.full_time_country1
            and prediction.full_time_country2 == result.full_time_country2):
        points += 20

    # Half Time Score — 10
    if (prediction.half_time_country1 == result.half_time_country1
            and prediction.half_time_country2 == result.half_time_country2):
        points += 10

    # Goals Scored — 5 + 5
    if prediction.goals_country1 == result.full_time_country1:
        points += 5
    if prediction.goals_country2 == result.full_time_country2:
        points += 5

    # Both Teams to Score — 10
    if prediction.both_teams_scored == result.both_teams_scored:
        points += 10

    # First Team to Score — 10
    actual_first_scorer = (
        result.first_team_to_score.name if result.first_team_to_score else "nogoal"
    )
    if prediction.first_team_to_score == actual_first_scorer:
        points += 10

    # Winning Method — 10 (skip on a draw, method is meaningless there)
    if actual_winner != "draw" and prediction.winning_method == result.winning_method:
        points += 10

    # Man of the Match — 15
    predicted_motm = prediction.man_of_the_match.strip().lower()
    actual_motm = result.man_of_the_match.strip().lower()
    if predicted_motm and predicted_motm == actual_motm:
        points += 15

    return points


def publish_result_and_award_points(result):
    if result.points_awarded:
        return  # already scored — no-op on re-run

    with transaction.atomic():
        predictions = Prediction.objects.filter(
            match=result.match
        ).select_related("user")

        for prediction in predictions:
            earned = score_prediction(prediction, result)
            prediction.points_earned = earned
            prediction.save(update_fields=["points_earned"])

            prediction.user.points = F("points") + earned
            prediction.user.save(update_fields=["points"])

        result.result_published = True
        result.points_awarded = True
        result.save(update_fields=["result_published", "points_awarded"])