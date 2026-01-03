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
        - previous_deal: Previous deal object (None if first or no active deals)
        - next_deal: Next deal object (None if last or no active deals)
        - first_deal: First deal in active deals list (None if no active deals)
    """
    active_deals = list(Deal.objects.active(user))

    context = {
        'active_deals_count': len(active_deals),
        'current_deal_position': None,
        'previous_deal': None,
        'next_deal': None,
        'first_deal': None,
    }

    if not active_deals:
        return context

    # Set first deal for badge link
    context['first_deal'] = active_deals[0]

    # If no current deal (home page), don't provide navigation
    if current_deal is None:
        return context

    # Find current deal position
    try:
        current_index = next(i for i, deal in enumerate(active_deals) if deal.id == current_deal.id)
        context['current_deal_position'] = current_index + 1

        # Get previous deal (None if at first position)
        if current_index > 0:
            context['previous_deal'] = active_deals[current_index - 1]

        # Get next deal (None if at last position)
        if current_index < len(active_deals) - 1:
            context['next_deal'] = active_deals[current_index + 1]
    except StopIteration:
        # Current deal is not in active deals (expired or draft)
        pass

    return context
