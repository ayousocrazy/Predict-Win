from decimal import Decimal
from django.db import transaction
from django.db.models import F

from .models import Prediction

# (correct, wrong-deduction) per category
POINTS = {
    "winner":              (Decimal("5"),    Decimal("2.5")),
    "btts":                (Decimal("5"),    Decimal("2.5")),
    "goals_first_half":    (Decimal("15"),   Decimal("7.5")),
    "first_15":            (Decimal("10"),   Decimal("5")),
    "full_time_score":     (Decimal("20"),   Decimal("10")),
    "half_time_score":     (Decimal("15"),   Decimal("7.5")),
    "goals_team1":         (Decimal("10"),   Decimal("5")),
    "goals_team2":         (Decimal("10"),   Decimal("5")),
    "total_goals":         (Decimal("20"),   Decimal("10")),
    "motm":                (Decimal("25"),   Decimal("12.5")),
    "first_scorer":        (Decimal("25"),   Decimal("12.5")),
    "red_card":            (Decimal("10"),   Decimal("5")),
    "yellow_cards":        (Decimal("20"),   Decimal("10")),
    "penalty":             (Decimal("10"),   Decimal("5")),
    "own_goal":            (Decimal("15"),   Decimal("7.5")),
    "total_corners":       (Decimal("20"),   Decimal("10")),
    "most_corners":        (Decimal("5"),    Decimal("2.5")),
    "winning_margin":      (Decimal("10"),   Decimal("5")),
}


def _winning_margin(goals_a, goals_b):
    """Returns '1', '2', '3', or None if it's a draw (margin not scored)."""
    diff = abs(goals_a - goals_b)
    if diff == 0:
        return None
    if diff == 1:
        return "1"
    if diff == 2:
        return "2"
    return "3"


def score_prediction(prediction, result):
    """
    Returns (net_points, wrong_count).
    net_points can be negative if a user made many wrong calls with no correct ones.
    """
    net = Decimal("0")
    wrong = 0

    def grade(category, predicted_ok, is_correct):
        nonlocal net, wrong
        if not predicted_ok:
            return  # user didn't make this prediction — skip entirely, no penalty
        correct_pts, wrong_pts = POINTS[category]
        if is_correct:
            net += correct_pts
        else:
            net -= wrong_pts
            wrong += 1

    if result.full_time_country1 > result.full_time_country2:
        actual_winner = result.match.country1.name
    elif result.full_time_country2 > result.full_time_country1:
        actual_winner = result.match.country2.name
    else:
        actual_winner = "draw"

    # 1. Win / Draw / Lose
    grade("winner",
          bool(prediction.predicted_winner),
          prediction.predicted_winner == actual_winner)

    # 2. Both teams to score
    grade("btts",
          prediction.both_teams_scored is not None,
          prediction.both_teams_scored == result.both_teams_scored)

    # 3. Goals in first half (combined)
    grade("goals_first_half",
          prediction.predicted_goals_first_half is not None,
          prediction.predicted_goals_first_half == result.goals_first_half)

    # 4. Goal in first 15 minutes
    grade("first_15",
          prediction.goal_in_first_15 is not None,
          prediction.goal_in_first_15 == result.goal_in_first_15)

    # 5. Exact full-time score
    grade("full_time_score",
          prediction.full_time_country1 is not None and prediction.full_time_country2 is not None,
          prediction.full_time_country1 == result.full_time_country1
          and prediction.full_time_country2 == result.full_time_country2)

    # 6. Exact half-time score
    grade("half_time_score",
          prediction.half_time_country1 is not None and prediction.half_time_country2 is not None,
          prediction.half_time_country1 == result.half_time_country1
          and prediction.half_time_country2 == result.half_time_country2)

    # 7 & 8. Goals by each team
    grade("goals_team1",
          prediction.goals_country1 is not None,
          prediction.goals_country1 == result.full_time_country1)

    grade("goals_team2",
          prediction.goals_country2 is not None,
          prediction.goals_country2 == result.full_time_country2)

    # 9. Correct total goals
    grade("total_goals",
          prediction.predicted_total_goals is not None,
          prediction.predicted_total_goals == result.full_time_country1 + result.full_time_country2)

    # 10. Man of the match
    predicted_motm = prediction.man_of_the_match.strip().lower()
    actual_motm = result.man_of_the_match.strip().lower()
    grade("motm", bool(predicted_motm), predicted_motm == actual_motm)

    # 11. First goal scorer (team-level, existing field)
    actual_first_scorer = (
        result.first_team_to_score.name if result.first_team_to_score else "nogoal"
    )
    grade("first_scorer",
          bool(prediction.first_team_to_score),
          prediction.first_team_to_score == actual_first_scorer)

    # 12. Red card
    grade("red_card",
          prediction.predicted_red_card is not None,
          prediction.predicted_red_card == result.red_card)

    # 13. Exact yellow cards
    grade("yellow_cards",
          prediction.predicted_yellow_cards is not None,
          prediction.predicted_yellow_cards == result.yellow_cards)

    # 14. Penalty awarded
    grade("penalty",
          prediction.predicted_penalty_awarded is not None,
          prediction.predicted_penalty_awarded == result.penalty_awarded)

    # 15. Own goal
    grade("own_goal",
          prediction.predicted_own_goal is not None,
          prediction.predicted_own_goal == result.own_goal)

    # 16. Exact total corners
    grade("total_corners",
          prediction.predicted_total_corners is not None,
          prediction.predicted_total_corners == result.total_corners)

    # 17. Team with most corners
    actual_most_corners = result.team_most_corners.name if result.team_most_corners else "draw"
    grade("most_corners",
          bool(prediction.predicted_team_most_corners),
          prediction.predicted_team_most_corners == actual_most_corners)

    # 18. Winning margin (not scored on an actual draw)
    actual_margin = _winning_margin(result.full_time_country1, result.full_time_country2)
    if actual_margin is not None:
        grade("winning_margin",
              bool(prediction.predicted_winning_margin),
              prediction.predicted_winning_margin == actual_margin)

    return net, wrong


def publish_result_and_award_points(result):
    if result.points_awarded:
        return

    with transaction.atomic():
        predictions = Prediction.objects.filter(
            match=result.match
        ).select_related("user")

        for prediction in predictions:
            earned, wrong = score_prediction(prediction, result)
            prediction.points_earned = earned
            prediction.save(update_fields=["points_earned"])

            prediction.user.points = F("points") + earned
            prediction.user.wrong_prediction = F("wrong_prediction") + wrong
            prediction.user.save(update_fields=["points", "wrong_prediction"])

        result.result_published = True
        result.points_awarded = True
        result.save(update_fields=["result_published", "points_awarded"])