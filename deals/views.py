from django.shortcuts import render, redirect, get_object_or_404
from django.views.generic import ListView, DetailView
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import admin
from django.utils.decorators import method_decorator
from django.utils import timezone
from django import forms
from django.contrib import messages
from urllib.parse import quote
from django_select2 import forms as s2forms
from .models import Deal, ColorPalette, NotificationChannel
from .tasks import notify_deal
from .admin_helpers import admin_render
from .view_helpers import get_deal_pagination_context


class DealFilterForm(forms.Form):
    """Form to declare and validate deal filter parameters"""
    search = forms.CharField(required=False, max_length=255)
    sort = forms.ChoiceField(
        required=False,
        choices=[
            ('newest', 'Newest'),
            ('price_low', 'Price: Low to High'),
            ('price_high', 'Price: High to Low'),
            ('expiring_soon', 'Expiring Soon'),
        ],
        initial='newest'
    )
    price_gt = forms.DecimalField(required=False, min_value=0)
    price_lt = forms.DecimalField(required=False, min_value=0)
    status_filter = forms.ChoiceField(
        required=False,
        choices=[
            ('active', 'Active'),
            ('expired', 'Expired'),
            ('all', 'All'),
        ],
        initial='active'
    )
    show_drafts = forms.BooleanField(required=False)


class HomeView(ListView):
    """Display list of active deals"""
    model = Deal
    template_name = 'deals/home.html'
    context_object_name = 'deals'
    paginate_by = 12

    def get_filter_form(self):
        """Get and validate filter form from GET parameters"""
        form = DealFilterForm(self.request.GET)
        form.is_valid()  # Populate cleaned_data even if invalid
        return form

    def get_queryset(self):
        """Filter deals based on validated form parameters"""
        form = self.get_filter_form()
        filters = form.cleaned_data if form.is_valid() else {}

        queryset = Deal.objects.all()

        # Base: Staff sees all, public sees only published
        if not self.request.user.is_staff:
            queryset = queryset.filter(status=Deal.Status.PUBLISHED)
        else:
            # Staff can optionally show drafts
            if not filters.get('show_drafts', False):
                queryset = queryset.filter(status=Deal.Status.PUBLISHED)

        # Search filter
        search = filters.get('search', '').strip()
        if search:
            queryset = queryset.filter(name__icontains=search)

        # Price range filter
        price_gt = filters.get('price_gt')
        if price_gt is not None:
            queryset = queryset.filter(price__gt=price_gt)

        price_lt = filters.get('price_lt')
        if price_lt is not None:
            queryset = queryset.filter(price__lt=price_lt)

        # Status filter (active/expired/all)
        status_filter = filters.get('status_filter', 'active')
        now = timezone.now()
        if status_filter == 'active':
            queryset = queryset.filter(expires__gt=now)
        elif status_filter == 'expired':
            queryset = queryset.filter(expires__lte=now)

        # Sort order
        sort_by = filters.get('sort', 'newest')
        if sort_by == 'price_low':
            queryset = queryset.order_by('price', '-created_at')
        elif sort_by == 'price_high':
            queryset = queryset.order_by('-price', '-created_at')
        elif sort_by == 'expiring_soon':
            queryset = queryset.filter(expires__gt=now).order_by('expires')
        else:  # 'newest'
            queryset = queryset.order_by('-created_at')

        # Prefetch color palette to avoid N+1 queries
        queryset = queryset.prefetch_related('color_palette')

        return queryset

    def get_context_data(self, **kwargs):
        """Add filter form and pagination query string to context"""
        context = super().get_context_data(**kwargs)

        # Add filter form to context
        form = self.get_filter_form()
        context['filter_form'] = form

        # Get cleaned filter values for template
        filters = form.cleaned_data if form.is_valid() else {}
        context['current_search'] = filters.get('search', '')
        context['current_sort'] = filters.get('sort', 'newest')
        context['current_price_gt'] = filters.get('price_gt')
        context['current_price_lt'] = filters.get('price_lt')
        context['current_status_filter'] = filters.get('status_filter', 'active')
        context['show_drafts'] = filters.get('show_drafts', False)

        # Query string for pagination (preserve filters)
        query_params = self.request.GET.copy()
        if 'page' in query_params:
            query_params.pop('page')
        context['query_string'] = query_params.urlencode()

        # Total results count
        context['total_results'] = self.get_queryset().count()

        # Collect color palette data for wave background
        all_colors = []
        for deal in context['deals']:
            for color in deal.color_palette.all():
                all_colors.append({
                    'background_color': color.background_color,
                    'weight': color.weight
                })

        context['page_colors'] = all_colors

        # Get first active deal for featured display
        active_deals = Deal.objects.active(self.request.user)
        first_active_deal = active_deals.first() if active_deals.exists() else None
        context['first_active_deal'] = first_active_deal

        # Add pagination context for deal carousel navigation
        # Pass first_active_deal so navigation buttons work on home page
        context.update(get_deal_pagination_context(first_active_deal, self.request.user))

        return context


class DealDetailView(DetailView):
    """Display individual deal details"""
    model = Deal
    template_name = 'deals/detail.html'
    context_object_name = 'deal'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def get_queryset(self):
        """Show all deals to staff, only published deals to public"""
        if self.request.user.is_staff:
            return Deal.objects.all().prefetch_related('color_palette')
        return Deal.objects.filter(status=Deal.Status.PUBLISHED).prefetch_related('color_palette')

    def get_context_data(self, **kwargs):
        """Add pagination context for navigating between active deals"""
        context = super().get_context_data(**kwargs)
        context.update(get_deal_pagination_context(self.object, self.request.user))
        return context


@admin.site.admin_view
def search_deal_images(request, deal_id=None):
    """Search for images for a deal and allow admin to select one"""
    from django.conf import settings
    from .services.image_search import GoogleCustomSearchProvider, download_image_from_url

    deal = None
    game_name = request.GET.get('name', '')

    if deal_id:
        deal = get_object_or_404(Deal, id=deal_id)
        game_name = deal.name

    if request.method == 'POST':
        # User selected an image
        selected_image_url = request.POST.get('image_url')
        selected_page_url = request.POST.get('page_url', '')
        if selected_image_url:
            if deal_id:
                # Download and save the image
                try:
                    image_content, image_filename = download_image_from_url(selected_image_url)
                    deal.image.save(image_filename, image_content, save=False)

                    # Save attribution if available
                    if selected_page_url:
                        deal.image_attribution = selected_page_url

                    # Save deal (will auto-extract colors if auto_extract_palette is enabled)
                    deal.save()

                    return redirect('admin:deals_deal_change', deal.id)
                except Exception as e:
                    # Handle download error
                    from django.contrib import messages
                    messages.error(request, f'Error downloading image: {e}')
            else:
                # For new deals, redirect to add form with the URL
                # The admin's save_model will handle downloading and color extraction
                url_params = f'image={quote(selected_image_url)}'
                if selected_page_url:
                    url_params += f'&image_attribution={quote(selected_page_url)}'
                return redirect(f'/admin/deals/deal/add/?{url_params}')

    # Use Google Custom Search to find images
    provider = GoogleCustomSearchProvider(
        api_key=settings.GOOGLE_API_KEY,
        search_engine_id=settings.GOOGLE_SEARCH_ENGINE_ID
    )

    # Search for images related to the game deal
    search_query = f"{game_name} game cover art" if game_name else "game cover art"
    image_results = provider.search(search_query, limit=12)

    context = {
        'deal': deal,
        'game_name': game_name,
        'image_results': image_results,
    }

    return admin_render(request, 'admin/deals/search_images.html', context)


class DealMultipleChoiceField(forms.ModelMultipleChoiceField):
    """Custom field to show deal status in labels"""
    def label_from_instance(self, obj):
        return f"{obj.name} ({obj.get_status_display()})"


class SelectDealsForm(forms.Form):
    """Form for selecting deals to send notifications for"""
    deals = DealMultipleChoiceField(
        queryset=Deal.objects.none(),  # Set dynamically in __init__
        widget=s2forms.Select2MultipleWidget(
            attrs={
                'data-placeholder': 'Search and select deals...',
                'data-width': '100%',
            }
        ),
        required=True,
        help_text='Type to search deals. Click to select multiple.'
    )

    def __init__(self, *args, channels=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.channels = channels or []

        # Determine if any channel is a test channel
        has_test_channel = any(ch.is_test_channel for ch in self.channels)

        # Build queryset based on channel types
        if has_test_channel:
            # Show both published and draft deals for test channels
            queryset = Deal.objects.filter(
                status__in=[Deal.Status.PUBLISHED, Deal.Status.DRAFT]
            ).order_by('-created_at')
            self.fields['deals'].help_text = 'Select deals to send notifications for. Draft deals can only be sent to test channels.'
        else:
            # Only show published deals for non-test channels
            queryset = Deal.objects.filter(status=Deal.Status.PUBLISHED).order_by('-created_at')

        self.fields['deals'].queryset = queryset

    def clean_deals(self):
        """Validate that draft deals are only sent to test channels"""
        deals = self.cleaned_data.get('deals')
        if not deals:
            return deals

        # Check if any selected deals are drafts
        draft_deals = [deal for deal in deals if deal.status == Deal.Status.DRAFT]

        if draft_deals:
            # Ensure all channels are test channels
            non_test_channels = [ch for ch in self.channels if not ch.is_test_channel]

            if non_test_channels:
                channel_names = ', '.join(ch.name for ch in non_test_channels)
                draft_names = ', '.join(deal.name for deal in draft_deals)
                raise forms.ValidationError(
                    f'Cannot send draft deals ({draft_names}) to non-test channels ({channel_names}). '
                    f'Either mark the channels as test channels or select only published deals.'
                )

        return deals


@admin.site.admin_view
def select_deals_to_notify(request, channel_ids=None):
    """Select deals to send notifications for to specific channels"""
    # Get channel IDs from URL parameter (comma-separated)
    if channel_ids:
        channel_id_list = [int(cid) for cid in channel_ids.split(',')]
    else:
        channel_id_list = request.GET.getlist('channel_ids')
        if channel_id_list:
            channel_id_list = [int(cid) for cid in channel_id_list]

    if not channel_id_list:
        messages.error(request, 'No channels specified')
        return redirect('admin:deals_notificationchannel_changelist')

    channels = NotificationChannel.objects.filter(id__in=channel_id_list)

    if not channels.exists():
        messages.error(request, 'No valid channels found')
        return redirect('admin:deals_notificationchannel_changelist')

    if request.method == 'POST':
        form = SelectDealsForm(request.POST, channels=channels)
        if form.is_valid():
            selected_deals = form.cleaned_data['deals']
            task_count = 0
            for deal in selected_deals:
                notify_deal.delay(deal.id, channel_ids=channel_id_list)
                task_count += 1

            channel_names = ', '.join(channels.values_list('name', flat=True))
            messages.success(
                request,
                f'Queued notifications for {task_count} deal(s) to {len(channel_id_list)} channel(s): {channel_names}'
            )
            return redirect('admin:deals_notificationchannel_changelist')
    else:
        form = SelectDealsForm(channels=channels)

    context = {
        'channels': channels,
        'channel_ids': channel_id_list,
        'form': form,
    }

    return admin_render(request, 'admin/deals/select_deals_to_notify.html', context)
