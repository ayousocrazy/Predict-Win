from django.shortcuts import render

def landingPage(request):
    context = {}
    return render(request, "main/landing.html", context)