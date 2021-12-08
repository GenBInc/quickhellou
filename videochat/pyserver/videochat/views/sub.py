import os

from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.views import View


class ProblemPage(View):
    def get(self, request, *args, **kwargs):
        return render(request, 'problem.html', {})


class ContactPage(View):
    def get(self, request, *args, **kwargs):
        return render(request, 'contact.html', {})


class TermsOfUsePage(View):
    def get(self, request, *args, **kwargs):
        return render(request, 'terms-of-use.html', {})


class PolicyPage(View):
    def get(self, request, *args, **kwargs):
        return render(request, 'policy.html', {})


class FullRoomPage(View):
    def get(self, request, *args, **kwargs):
        return render(request, 'full_template.html', {})


class WidgetTest(View):
    def get(self, request, *args, **kwargs):
       return render(request, 'widget_test.html')
