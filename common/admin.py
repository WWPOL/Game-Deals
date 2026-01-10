from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.models import User, Group
from django.contrib.sites.admin import SiteAdmin as BaseSiteAdmin
from django.contrib.sites.models import Site
from unfold.admin import ModelAdmin
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

# Django Celery Results
from django_celery_results.admin import TaskResultAdmin as BaseTaskResultAdmin
from django_celery_results.admin import GroupResultAdmin as BaseGroupResultAdmin
from django_celery_results.models import TaskResult, GroupResult

# Django Allauth
from allauth.account.admin import EmailAddressAdmin as BaseEmailAddressAdmin
from allauth.account.models import EmailAddress
from allauth.socialaccount.admin import SocialAppAdmin as BaseSocialAppAdmin
from allauth.socialaccount.admin import SocialTokenAdmin as BaseSocialTokenAdmin
from allauth.socialaccount.admin import SocialAccountAdmin as BaseSocialAccountAdmin
from allauth.socialaccount.models import SocialApp, SocialToken, SocialAccount

# Unregister default admin classes
admin.site.unregister(User)
admin.site.unregister(Group)
admin.site.unregister(Site)
admin.site.unregister(TaskResult)
admin.site.unregister(GroupResult)
admin.site.unregister(EmailAddress)
admin.site.unregister(SocialApp)
admin.site.unregister(SocialToken)
admin.site.unregister(SocialAccount)


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    """User admin with Unfold styling"""
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    """Group admin with Unfold styling"""
    pass


@admin.register(Site)
class SiteAdmin(BaseSiteAdmin, ModelAdmin):
    """Site admin with Unfold styling"""
    pass


@admin.register(TaskResult)
class TaskResultAdmin(BaseTaskResultAdmin, ModelAdmin):
    """Celery Task Result admin with Unfold styling"""
    pass


@admin.register(GroupResult)
class GroupResultAdmin(BaseGroupResultAdmin, ModelAdmin):
    """Celery Group Result admin with Unfold styling"""
    pass


@admin.register(EmailAddress)
class EmailAddressAdmin(BaseEmailAddressAdmin, ModelAdmin):
    """Email Address admin with Unfold styling"""
    pass


@admin.register(SocialApp)
class SocialAppAdmin(BaseSocialAppAdmin, ModelAdmin):
    """Social App admin with Unfold styling"""
    pass


@admin.register(SocialToken)
class SocialTokenAdmin(BaseSocialTokenAdmin, ModelAdmin):
    """Social Token admin with Unfold styling"""
    pass


@admin.register(SocialAccount)
class SocialAccountAdmin(BaseSocialAccountAdmin, ModelAdmin):
    """Social Account admin with Unfold styling"""
    pass
