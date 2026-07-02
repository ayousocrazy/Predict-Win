from django import forms
from django.contrib.auth import authenticate


class SignupForm(forms.Form):
    username = forms.CharField(
        max_length=50,
        widget=forms.TextInput(attrs={
            "class": "form-control",
            "id": "username",
            "placeholder": "Username"
        })
    )
    full_name = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            "class": "form-control",
            "id": "full_name",
            "placeholder": "Full Name"
        })
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            "class": "form-control",
            "id": "email",
            "placeholder": "Email Address"
        })
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": "form-control",
            "id": "password",
            "placeholder": "Password"
        })
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": "form-control",
            "id": "confirm_password",
            "placeholder": "Confirm Password"
        })
    )

    def clean(self):
        cleaned_data = super().clean()
        if cleaned_data.get("password") != cleaned_data.get("confirm_password"):
            raise forms.ValidationError("Passwords do not match")
        return cleaned_data


class OTPForm(forms.Form):
    otp = forms.CharField(max_length=6)


class LoginForm(forms.Form):
    username = forms.CharField(
        max_length=50,
        widget=forms.TextInput(attrs={
            "class": "pw-input",
            "id": "username",
            "placeholder": " ",
            "autocomplete": "username",
        })
    )

    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": "pw-input pw-input--has-toggle",
            "id": "password",
            "placeholder": " ",
            "autocomplete": "current-password",
        })
    )

    def clean(self):
        cleaned_data = super().clean()

        username = cleaned_data.get("username")
        password = cleaned_data.get("password")

        if username and password:
            user = authenticate(
                username=username,
                password=password
            )

            if user is None:
                raise forms.ValidationError(
                    "Invalid username or password."
                )

            cleaned_data["user"] = user

        return cleaned_data