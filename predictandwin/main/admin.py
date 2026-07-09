from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, OTP, Match, Prediction, Result
from .scoring import publish_result_and_award_points

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = (
        "username",
        "full_name",
        "email",
        "email_verified",
        "points",
        "points_of_rd16",
        "is_staff",
        "is_active",
        "created_at",
    )
    list_filter = (
        "email_verified",
        "is_staff",
        "is_active",
    )
    search_fields = (
        "username",
        "full_name",
        "email",
    )
    ordering = (
        "-created_at",
    )
    readonly_fields = (
        "id",
        "created_at",
        "last_login",
    )
    fieldsets = (
        ("Account Information", {
            "fields": (
                "id",
                "username",
                "password",
            )
        }),
        ("Personal Information", {
            "fields": (
                "full_name",
                "email",
            )
        }),
        ("Verification", {
            "fields": (
                "email_verified",
            )
        }),
        ("Points", {
            "fields": (
                "points",
                "points_of_rd16",
            )
        }),
        ("Permissions", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            )
        }),
        ("Important Dates", {
            "fields": (
                "last_login",
                "created_at",
            )
        }),
    )
    add_fieldsets = (
        (None, {
            "classes": (
                "wide",
            ),
            "fields": (
                "username",
                "full_name",
                "email",
                "password1",
                "password2",
                "is_staff",
                "is_active",
            ),
        }),
    )

@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "code",
        "created_at",
    )
    search_fields = (
        "email",
        "code",
    )
    ordering = (
        "-created_at",
    )

admin.site.register(Match)
admin.site.register(Prediction)

@admin.action(description="Publish result & award points")
def publish_and_score(modeladmin, request, queryset):
    for result in queryset:
        publish_result_and_award_points(result)

class ResultAdmin(admin.ModelAdmin):
    list_display = ["match", "result_published", "points_awarded"]
    actions = [publish_and_score]


admin.site.register(Result, ResultAdmin)