from django.shortcuts import render, redirect, get_object_or_404
from django.views.generic import ListView, DetailView
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.utils import timezone
from .models import Deal


class HomeView(ListView):
    """Display list of active deals"""
    model = Deal
    template_name = 'deals/home.html'
    context_object_name = 'deals'
    paginate_by = 12

    def get_queryset(self):
        """Only show deals that haven't expired"""
        return Deal.objects.filter(expires__gt=timezone.now()).order_by('-created_at')


class DealDetailView(DetailView):
    """Display individual deal details"""
    model = Deal
    template_name = 'deals/detail.html'
    context_object_name = 'deal'
    slug_field = 'slug'
    slug_url_kwarg = 'slug'


@staff_member_required
def search_deal_images(request, deal_id):
    """Search for images for a deal and allow admin to select one"""
    from django.conf import settings
    from .services.image_search import GoogleCustomSearchProvider

    deal = get_object_or_404(Deal, id=deal_id)

    if request.method == 'POST':
        # User selected an image
        selected_image_url = request.POST.get('image_url')
        if selected_image_url:
            deal.image = selected_image_url
            deal.save(update_fields=['image'])
            return redirect('admin:deals_deal_change', deal.id)

    # Use Google Custom Search to find images
    provider = GoogleCustomSearchProvider(
        api_key=settings.GOOGLE_API_KEY,
        search_engine_id=settings.GOOGLE_SEARCH_ENGINE_ID
    )

    # Search for images related to the game deal
    search_query = f"{deal.name} game cover art"
    image_results = provider.search(search_query, limit=12)

    context = {
        'deal': deal,
        'image_results': image_results,
    }

    return render(request, 'admin/deals/search_images.html', context)
