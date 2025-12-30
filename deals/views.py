from django.shortcuts import render, redirect, get_object_or_404
from django.views.generic import ListView, DetailView
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.utils import timezone
from django import forms
from urllib.parse import quote
from .models import Deal, ColorPalette


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


@staff_member_required
def search_deal_images(request, deal_id=None):
    """Search for images for a deal and allow admin to select one"""
    from django.conf import settings
    from .services.image_search import GoogleCustomSearchProvider
    from .services.color_extractor import extract_colors_from_url

    deal = None
    game_name = request.GET.get('name', '')

    if deal_id:
        deal = get_object_or_404(Deal, id=deal_id)
        game_name = deal.name

    if request.method == 'POST':
        # User selected an image
        selected_image_url = request.POST.get('image_url')
        if selected_image_url:
            # Extract colors from the image (returns ColorPalette instances)
            palette_entries = extract_colors_from_url(selected_image_url)

            if deal_id:
                # Update existing deal
                deal.image = selected_image_url
                deal.save(update_fields=['image'])

                # Clear existing palette and create new entries
                deal.color_palette.all().delete()
                for entry in palette_entries:
                    entry.deal = deal
                    entry.save()

                return redirect('admin:deals_deal_change', deal.id)
            else:
                # Return to add form with image URL only
                # The admin's save_model will handle color extraction if auto_extract is enabled
                return redirect(f'/admin/deals/deal/add/?image={quote(selected_image_url)}')

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

    return render(request, 'admin/deals/search_images.html', context)
