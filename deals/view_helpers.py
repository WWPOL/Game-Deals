"""Helper functions for views"""

from .models import Deal


def get_deal_pagination_context(current_deal=None, user=None):
    """
    Get pagination context for navigating between active deals.

    Args:
        current_deal: Current Deal object (optional, None for home page)
        user: Request user to determine permissions (optional)

    Returns:
        Dictionary with pagination context:
        - active_deals_count: Total number of active deals
        - current_deal_position: Position of current deal (1-indexed, None if not found)
        - previous_deal: Previous deal object (None if no active deals)
        - next_deal: Next deal object (None if no active deals)
    """
    active_deals = list(Deal.objects.active(user))

    context = {
        'active_deals_count': len(active_deals),
        'current_deal_position': None,
        'previous_deal': None,
        'next_deal': None,
    }

    if not active_deals:
        return context

    # If no current deal (home page), provide first and last for navigation
    if current_deal is None:
        context['previous_deal'] = active_deals[-1]  # Last deal (wraps around)
        context['next_deal'] = active_deals[0]  # First deal
        return context

    # Find current deal position
    try:
        current_index = next(i for i, deal in enumerate(active_deals) if deal.id == current_deal.id)
        context['current_deal_position'] = current_index + 1

        # Get previous deal (wraps around to end)
        prev_index = (current_index - 1) % len(active_deals)
        context['previous_deal'] = active_deals[prev_index]

        # Get next deal (wraps around to beginning)
        next_index = (current_index + 1) % len(active_deals)
        context['next_deal'] = active_deals[next_index]
    except StopIteration:
        # Current deal is not in active deals (expired or draft)
        pass

    return context
