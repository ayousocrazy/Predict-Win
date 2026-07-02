from django import forms
from django.contrib.auth import authenticate


class SignupForm(forms.Form):

    username = forms.CharField(max_length=50)

    full_name = forms.CharField(max_length=150)

    email = forms.EmailField()

    password = forms.CharField(
        widget=forms.PasswordInput
    )

    confirm_password = forms.CharField(
        widget=forms.PasswordInput
    )

    def clean(self):

        cleaned_data = super().clean()

        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        if password != confirm_password:
            raise forms.ValidationError(
                "Passwords do not match"
            )

        return cleaned_data


class OTPForm(forms.Form):

    otp = forms.CharField(max_length=6)


class LoginForm(forms.Form):

    username = forms.CharField()

    password = forms.CharField(
        widget=forms.PasswordInput
    )

    def clean(self):

        cleaned_data = super().clean()

        username = cleaned_data.get("username")
        password = cleaned_data.get("password")

        user = authenticate(
            username=username,
            password=password
        )

        if not user:
            raise forms.ValidationError(
                "Invalid username or password"
            )

        cleaned_data["user"] = user

        return cleaned_data