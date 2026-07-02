from django.shortcuts import render, redirect, get_list_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, logout


def landingPage(request):
    context = {}
    return render(request, "main/landing.html", context)

def signupPage(request):
    return render(request, 'main/auth/signup.html', {})

def loginPage(request):
    return render(request, 'main/auth/login.html', {})

@login_required(login_url='login')
def logoutPage(request):
    logout(request)
    return redirect('landingPage')

@login_required(login_url='login')
def dashboardPage(request):
    context = {}
    return render(request, 'main/dashboard.html', context)