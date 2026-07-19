from decimal import Decimal
from django.db import transaction
from django.db.models import F

from .models import Prediction

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

NO_NEGATIVE_STAGES = set()

LEGACY_STAGES = {"GRP", "R32", "R16"}


def score_prediction_r16_legacy(prediction, result):
    points = 0
    wrong = 0

    if result.full_time_country1 > result.full_time_country2:
        actual_winner = result.match.country1.name
    elif result.full_time_country2 > result.full_time_country1:
        actual_winner = result.match.country2.name
    else:
        actual_winner = "draw"

    # Match Winner — 20
    if prediction.predicted_winner:
        if prediction.predicted_winner == actual_winner:
            points += 20
        else:
            wrong += 1

    # Full Time Score — 20
    if prediction.full_time_country1 is not None and prediction.full_time_country2 is not None:
        if (prediction.full_time_country1 == result.full_time_country1
                and prediction.full_time_country2 == result.full_time_country2):
            points += 20
        else:
            wrong += 1

    # Half Time Score — 10
    if prediction.half_time_country1 is not None and prediction.half_time_country2 is not None:
        if (prediction.half_time_country1 == result.half_time_country1
                and prediction.half_time_country2 == result.half_time_country2):
            points += 10
        else:
            wrong += 1

    # Goals Scored — 5 + 5, each judged independently
    if prediction.goals_country1 is not None:
        if prediction.goals_country1 == result.full_time_country1:
            points += 5
        else:
            wrong += 1

    if prediction.goals_country2 is not None:
        if prediction.goals_country2 == result.full_time_country2:
            points += 5
        else:
            wrong += 1

    # Both Teams to Score — 10
    if prediction.both_teams_scored is not None:
        if prediction.both_teams_scored == result.both_teams_scored:
            points += 10
        else:
            wrong += 1

    # First Team to Score — 10
    if prediction.first_team_to_score:
        actual_first_scorer = (
            result.first_team_to_score.name if result.first_team_to_score else "nogoal"
        )
        if prediction.first_team_to_score == actual_first_scorer:
            points += 10
        else:
            wrong += 1

    # Winning Method — 10 (skip on a draw, method is meaningless there)
    if actual_winner != "draw" and prediction.winning_method:
        if prediction.winning_method == result.winning_method:
            points += 10
        else:
            wrong += 1

    # Man of the Match — 15
    predicted_motm = prediction.man_of_the_match.strip().lower()
    actual_motm = result.man_of_the_match.strip().lower()
    if predicted_motm:
        if predicted_motm == actual_motm:
            points += 15
        else:
            wrong += 1

    return points, wrong


def _winning_margin(goals_a, goals_b):
    diff = abs(goals_a - goals_b)
    if diff == 0:
        return None
    if diff == 1:
        return "1"
    if diff == 2:
        return "2"
    return "3"


def score_prediction_new(prediction, result):
    net = Decimal("0")
    wrong = 0

    no_negative = result.match.stage in NO_NEGATIVE_STAGES

    def grade(category, predicted_ok, is_correct):
        nonlocal net, wrong
        if not predicted_ok:
            return
        correct_pts, wrong_pts = POINTS[category]
        if is_correct:
            net += correct_pts
        else:
            wrong += 1
            if not no_negative:
                net -= wrong_pts
            # else: R16+ -> wrong prediction costs 0 points

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


def score_prediction(prediction, result):
    if result.match.stage in LEGACY_STAGES:
        return score_prediction_r16_legacy(prediction, result)
    return score_prediction_new(prediction, result)


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