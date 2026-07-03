from django.urls import path
from . import views

urlpatterns = [
    path('', views.landingPage, name="landingPage"),
    
    path('dashboard/', views.dashboardPage, name="dashboard"),
    
    path('login/', views.loginPage, name="login"),
    path('signup/', views.signupPage, name="signup"),
    path('logout/', views.logoutPage, name="logout"),
    
    path('match/<str:pk>', views.matchPage, name="match"),

    path('leaderboard/', views.leaderboardPage, name="leaderboard"),

]
